import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { getCollection } from '@/lib/mongodb/connection'
import { resolveContext, createRelations, can, decisionToHttpError, professorOwnership } from '@/lib/authz'
import { parseBody, parseQuery, trimmedString, errResponse, selfQuerySchema } from '@/lib/validation'
import { moderateContent } from '@/lib/moderation'
import { HttpError } from '@/lib/http'
import type { MongoMaterial } from '@/lib/mongodb/types'
import { spoofCheck } from '@/lib/session'
import { cloudinaryEnv, isPortalCloudUrl, MATERIALS_MAX_BYTES, materialUploadsConfigured, safeHttpUrl, uploadTokenSchema, verifyUploadedAsset, verifyUploadGrant } from './cloudinary'

// ============================================================
//  Materials API — GET /api/materials?username=
// ============================================================
//
//  Role-aware reads, branch-scoped, honest {ok, ...} envelope.
//  Students see materials for their own current-term subjects;
//  faculty see materials for the subjects they teach this term.
// ============================================================

function toClient(d: MongoMaterial) {
  const url = safeHttpUrl(d.url)
  if (!url) return null
  return {
    _id: d._id?.toString() || '',
    subjectCode: d.subjectCode,
    title: d.title,
    kind: d.kind,
    url: url.href,
    bytes: d.bytes ?? null,
    format: d.format ?? null,
    uploadedAt: d.uploadedAt instanceof Date ? d.uploadedAt.toISOString() : String(d.uploadedAt),
    uploadedBy: d.uploadedBy,
  }
}

const materialFields = {
  branch: z.string().min(1).max(128),
  subjectCode: z.string().min(1).max(128),
  title: trimmedString(120, 'Title'),
  performedBy: z.string().max(64).optional(),
}
const materialPostSchema = z.discriminatedUnion('kind', [
  z.object({ ...materialFields, kind: z.literal('link'), url: z.string().min(1).max(2000) }),
  z.object({ ...materialFields, kind: z.literal('file'), uploadToken: uploadTokenSchema }),
])

export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveContext(request)
    if (!ctx) throw new HttpError(401, 'Unauthorized')
    const { username, branch, academicYear, semester, role } = ctx.actor
    const query = parseQuery(request, selfQuerySchema)
    if (query.username && query.username !== username) throw new HttpError(403, 'Forbidden')
    const gate = decisionToHttpError(await can(ctx, createRelations(ctx), { kind: 'material.list' }, 'read'))
    if (gate) throw gate

    const subjects = await getCollection('subjects')
    const owned = role === 'student' ? { studentUsername: username } : professorOwnership(username)
    const rows: { code: string }[] = await subjects.find({ branch, academicYear, semester, ...owned })
      .project({ code: 1 })
      .toArray()
    const codes = Array.from(new Set(rows.map((row) => row.code).filter(Boolean)))
    if (codes.length === 0) {
      return NextResponse.json({ ok: true, materials: [], uploadsConfigured: materialUploadsConfigured() })
    }
    const col = await getCollection<MongoMaterial>('materials')
    const materials: MongoMaterial[] = await col
      .find({
        branch,
        subjectCode: { $in: codes },
        'term.academicYear': academicYear,
        'term.semester': semester,
        deletedAt: null,
      })
      .sort({ uploadedAt: -1 })
      .limit(200)
      .toArray()
    return NextResponse.json({ ok: true, materials: materials.map(toClient).filter((row) => row !== null), uploadsConfigured: materialUploadsConfigured() })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Materials read error.')
    return NextResponse.json({ ok: false, error: 'Failed to load materials.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveContext(request)
    if (!ctx) throw new HttpError(401, 'Unauthorized')
    const input = await parseBody(request, materialPostSchema)
    const { branch, subjectCode, title, performedBy } = input
    if (spoofCheck(ctx.claims, performedBy)) throw new HttpError(403, 'Forbidden')
    const actor = ctx.actor
    const termKey = { academicYear: actor.academicYear, semester: actor.semester }
    const gate = decisionToHttpError(await can(ctx, createRelations(ctx), {
      kind: 'material.upload', subjectCode, term: termKey, branch,
    }, 'create'))
    if (gate) throw gate

    const url = input.kind === 'link' ? safeHttpUrl(input.url) : null
    if (input.kind === 'link' && !url) throw new HttpError(400, 'A valid http(s) URL is required.')
    if (url && isPortalCloudUrl(url)) throw new HttpError(400, 'Use file upload to attach an asset in the portal’s Cloudinary account.')
    const verdict = await moderateContent({
      surface: 'material-link',
      fields: { title },
      urlFields: { url: url?.href },
      actor: { username: actor.username, role: actor.role, branch: actor.branch },
    })
    if (!verdict.ok) return verdict.response

    const load = await getCollection('subjects')
    const enrollment = await load.findOne({
      branch: actor.branch, ...professorOwnership(actor.username), code: subjectCode,
      academicYear: actor.academicYear || { $in: ['', null] },
      semester: actor.semester || { $in: ['', null] },
    }, { projection: { yearLevel: 1 } })
    if (!enrollment) throw new HttpError(403, 'Subject is not in your current teaching load.')
    const common = {
      branch: actor.branch, subjectCode, title, term: { ...termKey, yearLevel: enrollment.yearLevel || '' },
      uploadedBy: actor.username, uploadedAt: new Date(),
    }
    const col = await getCollection<MongoMaterial>('materials')
    if (input.kind === 'link' && url) {
      const doc: MongoMaterial = { ...common, kind: 'link', url: url.href }
      const result = await col.insertOne(doc)
      return NextResponse.json({ ok: true, message: 'Link posted.', material: { ...toClient(doc), _id: result.insertedId.toString() } })
    }
    if (input.kind !== 'file') throw new HttpError(400, 'A valid http(s) URL is required.')

    const env = cloudinaryEnv()
    if (!env) throw new HttpError(503, 'File uploads are not configured. Post a link instead.')
    const grant = await verifyUploadGrant(env, input.uploadToken, actor, { kind: 'material', subjectCode, ...termKey })
    const id = new ObjectId(grant.jti)
    const target = { _id: id, branch: actor.branch, subjectCode, uploadedBy: actor.username }
    const prior: MongoMaterial | null = await col.findOne(target)
    if (prior?.deletedAt) throw new HttpError(409, 'This upload is no longer available. Choose the file again.')
    if (prior) return NextResponse.json({ ok: true, message: 'File posted.', material: toClient(prior) })
    const asset = await verifyUploadedAsset(env, grant, MATERIALS_MAX_BYTES)
    const doc = { ...common, ...asset, _id: id, kind: 'file' as const, assetCloud: env.cloudName }
    try {
      await col.insertOne(doc)
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 11000)) throw error
      const existing: MongoMaterial | null = await col.findOne(target)
      if (!existing || existing.deletedAt) throw new HttpError(409, 'This upload is no longer available. Choose the file again.')
      return NextResponse.json({ ok: true, message: 'File posted.', material: toClient(existing) })
    }
    return NextResponse.json({ ok: true, message: 'File posted.', material: toClient({ ...doc, _id: id.toHexString() }) })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Material post error.')
    return NextResponse.json({ ok: false, error: 'Failed to post material.' }, { status: 500 })
  }
}
