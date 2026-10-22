import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getStudentByUsername } from '@/lib/mongodb/queries'
import { getCollection } from '@/lib/mongodb/connection'
import { resolveContext, createRelations, can, decisionToHttpError, professorOwnership } from '@/lib/authz'
import { parseBody, parseQuery, trimmedString, errResponse, selfQuerySchema } from '@/lib/validation'
import { moderateContent } from '@/lib/moderation'
import { HttpError } from '@/lib/http'
import type { MongoMaterial } from '@/lib/mongodb/types'
import { cloudinaryEnv, destroyAsset, extResourceType, materialFolder, spoofForbidden, MATERIALS_MAX_BYTES } from './cloudinary'

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

// ---- Zod input schema (the only place material input is shaped) ----
const materialPostSchema = z.object({
  branch: z.string().min(1),
  subjectCode: z.string({ error: 'Subject and a 1-120 character title are required.' }).min(1),
  title: trimmedString(120, 'Title'),
  kind: z.enum(['link', 'file'], { error: 'Kind must be link or file.' }),
  url: z.string().optional(),
  publicId: z.string().optional(),
  resourceType: z.enum(['image', 'raw'], { error: 'Resource type must be image or raw.' }).optional(),
  bytes: z.coerce.number().optional(),
  format: z.string().optional(),
  filename: z.string().optional(),
  // Legacy spoof-check field; identity always comes from the session.
  performedBy: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    // C2.4: canonical actor off the DB doc. The self-username check,
    // the user lookup (404), and the user.branch vs claims.branch
    // comparison stay route-kept (per the material.list policy
    // comment); the admin-excluded role gate centralizes below.
    const ctx = await resolveContext(request)
    if (!ctx) throw new HttpError(401, 'Unauthorized')

    const username = parseQuery(request, selfQuerySchema).username || ctx.actor.username
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
    }
    if (username !== ctx.actor.username) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }
    const user = await getStudentByUsername(username)
    if (!user) {
      return NextResponse.json({ ok: false, error: 'User not found.' }, { status: 404 })
    }
    if (user.branch !== ctx.claims.branch) {
      return NextResponse.json({ ok: false, error: 'Branch mismatch' }, { status: 403 })
    }
    // C2.4: role gate centralized (material.list read: student or
    // faculty, admin excluded by design).
    const gate = decisionToHttpError(
      await can(ctx, createRelations(ctx), { kind: 'material.list' }, 'read')
    )
    if (gate) throw gate

    let codes: string[]
    if (user.role === 'student') {
      const subjectsCol = await getCollection('subjects')
      const mine = await subjectsCol
        .find({ branch: user.branch, studentUsername: username, academicYear: user.academicYear, semester: user.semester })
        .project({ code: 1 })
        .toArray()
      codes = Array.from(new Set(mine.map((d: any) => d.code).filter(Boolean)))
    } else if (user.role === 'faculty') {
      // A1 phase 3 (issue #72): the faculty material-list load uses the
      // strict ownership key — username equality only — alongside the
      // term keys.
      const subjectsCol = await getCollection('subjects')
      const taught = await subjectsCol
        .find({
          branch: user.branch,
          ...professorOwnership(user.username),
          academicYear: user.academicYear,
          semester: user.semester,
        })
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
        branch: ctx.claims.branch,
        subjectCode: { $in: codes },
        'term.academicYear': user.academicYear,
        'term.semester': user.semester,
      })
      .sort({ uploadedAt: -1 })
      .limit(200)
      .toArray()
    return NextResponse.json({ ok: true, materials: rows.map(toClient), uploadsConfigured: cloudinaryEnv() !== null })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
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
    // C2.4: canonical actor first (the resource term comes off it).
    const ctx = await resolveContext(request)
    if (!ctx) throw new HttpError(401, 'Unauthorized')

    const { branch, subjectCode, title, kind, url, publicId, resourceType, bytes, format, filename, performedBy } =
      await parseBody(request, materialPostSchema)
    const forbidden = spoofForbidden(ctx.claims, performedBy)
    if (forbidden) return forbidden
    // C2.4: faculty role, claimed-branch parity, and the current-term
    // teaching load centralized (material.upload create).
    const actor = ctx.actor
    const gate = decisionToHttpError(
      await can(ctx, createRelations(ctx), {
        kind: 'material.upload',
        subjectCode,
        term: { academicYear: actor.academicYear, semester: actor.semester },
        branch,
      }, 'create')
    )
    if (gate) throw gate

    // Term stamp (data query, same JS-side term matching the policy's
    // relation uses; yearLevel off a current-term load row).
    // A1 phase 3 (issue #72): the upload load check uses the strict
    // ownership key, same as the policy gate's relation.
    const loadCol = await getCollection('subjects')
    const loadRows = await loadCol
      .find({
        branch,
        ...professorOwnership(actor.username),
        code: subjectCode,
      })
      .project({ academicYear: 1, semester: 1, yearLevel: 1 })
      .toArray()
    const current = loadRows.filter(
      (d: any) => (d.academicYear || '') === (actor.academicYear || '') && (d.semester || '') === (actor.semester || '')
    )
    const term = {
      academicYear: actor.academicYear,
      semester: actor.semester,
      yearLevel: current[0]?.yearLevel || '',
    }

    // Content moderation: title text plus the URL field. Link posts carry
    // an arbitrary external URL (rule 4, untrusted hosts flag for review);
    // file posts are Cloudinary-hosted by construction, so their URL is
    // trusted and only the title is effectively scanned.
    const verdict = await moderateContent({
      surface: 'material-link',
      fields: { title },
      urlFields: { url: typeof url === 'string' ? url.trim() : url },
      actor: { username: actor.username, role: actor.role, branch: actor.branch },
    })
    if (!verdict.ok) return verdict.response

    const env = cloudinaryEnv()
    const col = await getCollection<MongoMaterial>('materials')

    // FIX-M4 (C3.7, issue #64): any URL inside the portal's own
    // Cloudinary cloud must sit under the signed subject folder tree
    // (materialFolder(base, branch, subjectCode) — exactly what the sign
    // route signs). This covers file records by url AND link records
    // masquerading as internal assets; a rogue asset anywhere else in the
    // cloud can no longer be attached to a material. External links are
    // untouched (moderation handles them) and bytes stay advisory. No
    // destroy here: an out-of-tree asset may legitimately belong to
    // another subject, so rejecting the record is the only safe move.
    // Reads keep serving legacy out-of-tree records — outliers are
    // surfaced by scripts/report-legacy-materials.ts, not broken.
    const folder = env ? materialFolder(env.baseFolder, ctx.claims.branch, subjectCode) : null
    if (
      env &&
      typeof url === 'string' &&
      url.startsWith(`https://res.cloudinary.com/${env.cloudName}/`) &&
      !(folder && url.includes(`/${folder}/`))
    ) {
      return NextResponse.json(
        { ok: false, error: `Cloud assets must live in this subject's upload folder (${folder}).` },
        { status: 400 }
      )
    }

    if (kind === 'link') {
      if (!url || !/^https?:\/\/.+\..+/.test(url.trim())) {
        return NextResponse.json({ ok: false, error: 'A valid http(s) URL is required.' }, { status: 400 })
      }
      const doc: MongoMaterial = {
        branch: ctx.claims.branch,
        subjectCode,
        term,
        title,
        kind: 'link',
        url: url.trim().slice(0, 2000),
        publicId: null,
        resourceType: null,
        bytes: null,
        format: null,
        uploadedBy: actor.username,
        uploadedAt: new Date(),
      }
      const result = await col.insertOne(doc as any)
      return NextResponse.json({ ok: true, message: 'Link posted.', material: { _id: result.insertedId.toString(), title: doc.title, kind: 'link', url: doc.url } })
    }

    // kind === 'file': Cloudinary upload record.
    if (!env) {
      return NextResponse.json({ ok: false, error: 'File uploads are not configured. Post a link instead.' }, { status: 400 })
    }
    if (!publicId || !url || !url.startsWith(`https://res.cloudinary.com/${env.cloudName}/`)) {
      return NextResponse.json({ ok: false, error: 'A valid Cloudinary file reference is required.' }, { status: 400 })
    }
    // FIX-M4 (C3.7, issue #64): the publicId must sit under the signed
    // folder tree as well, with no traversal segments — a contained url
    // with a foreign publicId is still a foreign asset. No destroy: the
    // asset may legitimately belong to another subject's folder.
    if (
      !folder ||
      !publicId.startsWith(`${folder}/`) ||
      publicId.split('/').includes('..')
    ) {
      return NextResponse.json(
        { ok: false, error: `Cloud assets must live in this subject's upload folder (${folder}).` },
        { status: 400 }
      )
    }
    if (resourceType !== 'image' && resourceType !== 'raw') {
      return NextResponse.json({ ok: false, error: 'Resource type must be image or raw.' }, { status: 400 })
    }
    const size = bytes ?? 0
    if (!isFinite(size) || size <= 0 || size > MATERIALS_MAX_BYTES) {
      // Refuse oversized orphans and clean the asset back up.
      await destroyAsset(publicId, resourceType)
      return NextResponse.json({ ok: false, error: `Files must be 10 MB or less.` }, { status: 400 })
    }
    // Cloudinary omits `format` for some raw assets (e.g. .txt), so
    // fall back to the original filename, then the public id.
    const nameForExt = filename || publicId
    const ext = (String(nameForExt).split('.').pop() || format || '').toLowerCase()
    if (extResourceType(ext) !== resourceType) {
      await destroyAsset(publicId, resourceType)
      return NextResponse.json({ ok: false, error: 'File type is not allowed.' }, { status: 400 })
    }
    const doc: MongoMaterial = {
      branch: ctx.claims.branch,
      subjectCode,
      term,
      title,
      kind: 'file',
      url: url.slice(0, 2000),
      publicId,
      resourceType,
      bytes: Math.floor(size),
      format: (format || ext || null)?.slice(0, 16) || null,
      uploadedBy: actor.username,
      uploadedAt: new Date(),
    }
    const result = await col.insertOne(doc as any)
    return NextResponse.json({ ok: true, message: 'File posted.', material: { _id: result.insertedId.toString(), title: doc.title, kind: 'file', url: doc.url } })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Material post error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to post material.' }, { status: 500 })
  }
}
