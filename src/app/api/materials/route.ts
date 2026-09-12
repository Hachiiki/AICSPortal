import { NextRequest, NextResponse } from 'next/server'
import { getStudentByUsername } from '@/lib/mongodb/queries'
import { getCollection } from '@/lib/mongodb/connection'
import { getAuthedSession as getSession } from '@/lib/session-auth'
import { requireTeachingFaculty } from '@/app/api/tasks/route'
import type { MongoMaterial } from '@/lib/mongodb/types'
import { cloudinaryEnv, destroyAsset, extResourceType, spoofForbidden, MATERIALS_MAX_BYTES } from './cloudinary'

// ============================================================
//  Materials API — GET /api/materials?username=
// ============================================================
//
//  Role-aware reads, branch-scoped, honest {ok, ...} envelope.
//  Students see materials for their own current-term subjects;
//  faculty see materials for the subjects they teach this term.
// ============================================================

function toClient(d: any) {
  return {
    _id: d._id?.toString() || '',
    subjectCode: d.subjectCode,
    title: d.title,
    kind: d.kind,
    url: d.url,
    bytes: d.bytes ?? null,
    format: d.format ?? null,
    uploadedAt: d.uploadedAt instanceof Date ? d.uploadedAt.toISOString() : String(d.uploadedAt),
    uploadedBy: d.uploadedBy,
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    const username = request.nextUrl.searchParams.get('username') || session.username
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
    }
    if (username !== session.username) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }
    const user = await getStudentByUsername(username)
    if (!user) {
      return NextResponse.json({ ok: false, error: 'User not found.' }, { status: 404 })
    }
    if (user.branch !== session.branch) {
      return NextResponse.json({ ok: false, error: 'Branch mismatch' }, { status: 403 })
    }

    let codes: string[]
    if (user.role === 'student') {
      const subjectsCol = await getCollection('subjects')
      const mine = await subjectsCol
        .find({ branch: user.branch, studentUsername: username, academicYear: user.academicYear, semester: user.semester })
        .project({ code: 1 })
        .toArray()
      codes = Array.from(new Set(mine.map((d: any) => d.code).filter(Boolean)))
    } else if (user.role === 'faculty') {
      const subjectsCol = await getCollection('subjects')
      const taught = await subjectsCol
        .find({ branch: user.branch, professor: user.fullName, academicYear: user.academicYear, semester: user.semester })
        .project({ code: 1 })
        .toArray()
      codes = Array.from(new Set(taught.map((d: any) => d.code).filter(Boolean)))
    } else {
      return NextResponse.json({ ok: false, error: 'Unauthorized: student or faculty only' }, { status: 403 })
    }
    if (codes.length === 0) {
      return NextResponse.json({ ok: true, materials: [], uploadsConfigured: cloudinaryEnv() !== null })
    }
    const col = await getCollection<MongoMaterial>('materials')
    const rows = await col
      .find({
        branch: session.branch,
        subjectCode: { $in: codes },
        'term.academicYear': user.academicYear,
        'term.semester': user.semester,
      })
      .sort({ uploadedAt: -1 })
      .limit(200)
      .toArray()
    return NextResponse.json({ ok: true, materials: rows.map(toClient), uploadsConfigured: cloudinaryEnv() !== null })
  } catch (err) {
    console.error('Materials read error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to load materials.' }, { status: 500 })
  }
}

// ============================================================
//  POST /api/materials
//  Body (link): { branch, subjectCode, title, kind:'link', url, performedBy }
//  Body (file): { branch, subjectCode, title, kind:'file',
//    url, publicId, resourceType, bytes, format, performedBy }
//  Faculty only (session) + branch match + teaching-load check.
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { branch, subjectCode, title, kind, url, publicId, resourceType, bytes, format, filename, performedBy } = await request.json()
    const forbidden = spoofForbidden(session, performedBy)
    if (forbidden) return forbidden
    if (typeof branch !== 'string' || branch !== session.branch) {
      return NextResponse.json({ ok: false, error: 'Branch mismatch' }, { status: 403 })
    }
    // BUG-010: subject/title/kind/url must be plain values pre-query.
    if (typeof subjectCode !== 'string' || !subjectCode || typeof title !== 'string' || title.trim().length === 0 || title.length > 120) {
      return NextResponse.json({ ok: false, error: 'Subject and a 1-120 character title are required.' }, { status: 400 })
    }
    if (kind !== 'link' && kind !== 'file') {
      return NextResponse.json({ ok: false, error: 'Kind must be link or file.' }, { status: 400 })
    }
    // Teaching-load check runs as the session user.
    const check = await requireTeachingFaculty(session.username, session.branch, subjectCode)
    if (check.error) return check.error
    const { performer, current } = check as { performer: any; current: any[] }
    const term = {
      academicYear: performer.academicYear,
      semester: performer.semester,
      yearLevel: current[0]?.yearLevel || '',
    }

    const env = cloudinaryEnv()
    const col = await getCollection<MongoMaterial>('materials')

    if (kind === 'link') {
      if (typeof url !== 'string' || !/^https?:\/\/.+\..+/.test(url.trim())) {
        return NextResponse.json({ ok: false, error: 'A valid http(s) URL is required.' }, { status: 400 })
      }
      const doc: MongoMaterial = {
        branch: session.branch,
        subjectCode,
        term,
        title: title.trim(),
        kind: 'link',
        url: url.trim().slice(0, 2000),
        publicId: null,
        resourceType: null,
        bytes: null,
        format: null,
        uploadedBy: session.username,
        uploadedAt: new Date(),
      }
      const result = await col.insertOne(doc as any)
      return NextResponse.json({ ok: true, message: 'Link posted.', material: { _id: result.insertedId.toString(), title: doc.title, kind: 'link', url: doc.url } })
    }

    // kind === 'file': Cloudinary upload record.
    if (!env) {
      return NextResponse.json({ ok: false, error: 'File uploads are not configured. Post a link instead.' }, { status: 400 })
    }
    if (typeof publicId !== 'string' || !publicId || typeof url !== 'string' || !url.startsWith(`https://res.cloudinary.com/${env.cloudName}/`)) {
      return NextResponse.json({ ok: false, error: 'A valid Cloudinary file reference is required.' }, { status: 400 })
    }
    if (resourceType !== 'image' && resourceType !== 'raw') {
      return NextResponse.json({ ok: false, error: 'Resource type must be image or raw.' }, { status: 400 })
    }
    const size = Number(bytes)
    if (!isFinite(size) || size <= 0 || size > MATERIALS_MAX_BYTES) {
      // Refuse oversized orphans and clean the asset back up.
      await destroyAsset(publicId, resourceType)
      return NextResponse.json({ ok: false, error: `Files must be 10 MB or less.` }, { status: 400 })
    }
    // Cloudinary omits `format` for some raw assets (e.g. .txt), so
    // fall back to the original filename, then the public id.
    const nameForExt = typeof filename === 'string' && filename
      ? filename
      : publicId;
    const ext = (String(nameForExt).split('.').pop() || (typeof format === 'string' ? format : '')).toLowerCase();
    if (extResourceType(ext) !== resourceType) {
      await destroyAsset(publicId, resourceType)
      return NextResponse.json({ ok: false, error: 'File type is not allowed.' }, { status: 400 })
    }
    const doc: MongoMaterial = {
      branch: session.branch,
      subjectCode,
      term,
      title: title.trim(),
      kind: 'file',
      url: url.slice(0, 2000),
      publicId,
      resourceType,
      bytes: Math.floor(size),
      format: (typeof format === 'string' && format ? format : ext || null)?.slice(0, 16) || null,
      uploadedBy: session.username,
      uploadedAt: new Date(),
    }
    const result = await col.insertOne(doc as any)
    return NextResponse.json({ ok: true, message: 'File posted.', material: { _id: result.insertedId.toString(), title: doc.title, kind: 'file', url: doc.url } })
  } catch (err) {
    console.error('Material post error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to post material.' }, { status: 500 })
  }
}
