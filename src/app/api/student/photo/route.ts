import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCollection } from '@/lib/mongodb/connection'
import { resolveContext, createRelations, can, decisionToHttpError } from '@/lib/authz'
import { parseBody, parseQuery, errResponse, selfQuerySchema } from '@/lib/validation'
import { HttpError } from '@/lib/http'
import { rateLimit } from '@/lib/rate-limit'
import type { MongoStudent } from '@/lib/mongodb/types'
import { cloudinaryEnv, destroyVerifiedAsset, PHOTO_MAX_BYTES, prepareUpload, uploadTokenSchema, verifyUploadedAsset, verifyUploadGrant } from '@/app/api/materials/cloudinary'

const photoSaveSchema = z.object({ uploadToken: uploadTokenSchema })
const photoProjection = { photoUrl: 1, photoAssetId: 1, photoAssetCloud: 1, photoRevision: 1 }
type PhotoRecord = Pick<MongoStudent, 'photoUrl' | 'photoAssetId' | 'photoAssetCloud' | 'photoRevision'>

async function ownPhoto(request: NextRequest, action: 'update' | 'delete') {
  const { username } = parseQuery(request, selfQuerySchema)
  const ctx = await resolveContext(request)
  if (!ctx) throw new HttpError(401, 'Unauthorized')
  const { actor } = ctx
  const gate = decisionToHttpError(await can(ctx, createRelations(ctx), { kind: 'account.photo', username: username ?? (action === 'update' ? actor.username : '') }, action))
  if (gate) throw gate
  const target = { username: actor.username, branch: actor.branch }
  const col = await getCollection<MongoStudent>('students')
  const photo: PhotoRecord | null = await col.findOne(target, { projection: photoProjection })
  if (!photo) throw new HttpError(404, 'Profile not found.')
  return { actor, target, col, photo, scope: { kind: 'photo' as const, revision: photo.photoRevision ?? null } }
}

export async function POST(request: NextRequest) {
  try {
    const { actor, scope } = await ownPhoto(request, 'update')
    const env = cloudinaryEnv()
    if (!env) throw new HttpError(503, 'Photo upload is not configured on this server.')
    const throttle = await rateLimit(`photo-upload:${actor.branch}:${actor.username}`, 10, 15 * 60_000)
    if (!throttle.ok) {
      return NextResponse.json(
        { ok: false, error: 'Too many upload attempts. Please wait and try again.' },
        { status: 429, headers: { 'Retry-After': String(throttle.retryAfterSec) } },
      )
    }
    const params = await prepareUpload(env, actor, scope, 'image', 'jpg')
    return NextResponse.json({ ok: true, ...params, maxBytes: PHOTO_MAX_BYTES })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Photo sign error.')
    return NextResponse.json({ ok: false, error: 'Failed to prepare upload.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { actor, target, col, photo, scope } = await ownPhoto(request, 'update')
    const { uploadToken } = await parseBody(request, photoSaveSchema)
    const env = cloudinaryEnv()
    if (!env) throw new HttpError(503, 'Photo upload is not configured on this server.')
    const grant = await verifyUploadGrant(env, uploadToken, actor, scope)
    if (grant.jti === scope.revision && photo.photoUrl) return NextResponse.json({ ok: true, photoUrl: photo.photoUrl })
    if (grant.revision !== scope.revision) throw new HttpError(409, 'The photo changed while uploading. Choose the photo again.')
    const asset = await verifyUploadedAsset(env, grant, PHOTO_MAX_BYTES)
    const result = await col.updateOne(
      { ...target, photoRevision: scope.revision },
      { $set: { photoUrl: asset.url, photoAssetId: asset.assetId, photoAssetCloud: env.cloudName, photoRevision: grant.jti } },
    )
    if (result.matchedCount === 0) throw new HttpError(409, 'The photo changed while uploading. Choose the photo again.')
    if (photo.photoAssetCloud === env.cloudName) await destroyVerifiedAsset(env, photo.photoAssetId)
    return NextResponse.json({ ok: true, photoUrl: asset.url })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Photo save error.')
    return NextResponse.json({ ok: false, error: 'Failed to save the photo.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { target, col, photo, scope } = await ownPhoto(request, 'delete')
    const result = await col.updateOne(
      { ...target, photoRevision: scope.revision },
      { $set: { photoUrl: '', photoRevision: randomUUID() }, $unset: { photoAssetId: '', photoAssetCloud: '' } },
    )
    if (result.matchedCount === 0) throw new HttpError(409, 'The photo changed while removing it. Refresh and try again.')
    const env = cloudinaryEnv()
    if (env && photo.photoAssetCloud === env.cloudName) await destroyVerifiedAsset(env, photo.photoAssetId)
    return NextResponse.json({ ok: true, message: 'Photo removed.' })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Photo remove error.')
    return NextResponse.json({ ok: false, error: 'Failed to remove photo.' }, { status: 500 })
  }
}
