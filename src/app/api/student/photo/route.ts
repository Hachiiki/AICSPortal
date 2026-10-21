import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/connection'
import { resolveContext, createRelations, can, decisionToHttpError, requireCan } from '@/lib/authz'
import { parseQuery, errResponse, selfQuerySchema } from '@/lib/validation'
import { HttpError } from '@/lib/http'
import {
  cloudinaryEnv,
  photoFolder,
  photoRoot,
  publicIdFromPhotoUrl,
  signUpload,
  destroyAsset,
  PHOTO_MAX_BYTES,
} from '@/app/api/materials/cloudinary'

// ============================================================
//  Profile photo upload — POST /api/student/photo
//  Photo removal — DELETE /api/student/photo?username=<self>
// ============================================================
//
//  POST signs ONE direct browser→Cloudinary upload for the
//  session user's own avatar. Self-service only: the folder is
//  built from the session (branch + username), never from
//  client input, so a user can only ever write into their own
//  folder. The API secret never leaves the server.
//
//  The response includes `oldPublicId` (derived from the user's
//  current photoUrl) so the browser can destroy the replaced
//  asset afterwards via /api/student/photo/cleanup.
//
//  DELETE clears the session user's photoUrl and destroys the
//  Cloudinary asset (best-effort — the field is cleared even if
//  the destroy fails). External avatar URLs are just cleared;
//  there is nothing of ours to destroy.
//
//  Without CLOUDINARY_* env configured, POST refuses (503) and
//  DELETE still clears the field. Works for students AND faculty
//  — both live in the `students` collection.
// ============================================================

export async function POST(request: NextRequest) {
  try {
    // C2.2: auth + self-only sign gate centralized (account.photo
    // update). The upload signs for the session account only (no
    // username input), so the policy resource is the actor's own
    // username and the context is resolved first to state it.
    const ctx = await resolveContext(request)
    if (!ctx) throw new HttpError(401, 'Unauthorized')
    const gate = decisionToHttpError(
      await can(ctx, createRelations(ctx), { kind: 'account.photo', username: ctx.actor.username }, 'update')
    )
    if (gate) throw gate
    const { branch, username } = ctx.actor

    const env = cloudinaryEnv()
    if (!env) {
      return NextResponse.json({ ok: false, error: 'Photo upload is not configured on this server.' }, { status: 503 })
    }

    const folder = photoFolder(env.baseFolder, branch, username)
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = signUpload({ folder, timestamp, apiSecret: env.apiSecret })

    // Best-effort: which old asset should the browser clean up after
    // the replacement is saved? A read failure just skips cleanup.
    let oldPublicId: string | null = null
    try {
      const col = await getCollection('students')
      const me = await col.findOne(
        { username, branch },
        { projection: { photoUrl: 1 } }
      )
      oldPublicId = publicIdFromPhotoUrl(me?.photoUrl, photoRoot(env.baseFolder))
    } catch (err) {
      console.error('Photo sign: old-asset lookup failed (non-fatal):', err)
    }

    return NextResponse.json({
      ok: true,
      cloudName: env.cloudName,
      apiKey: env.apiKey,
      timestamp,
      folder,
      signature,
      uploadUrl: `https://api.cloudinary.com/v1_1/${env.cloudName}/image/upload`,
      maxBytes: PHOTO_MAX_BYTES,
      oldPublicId,
    })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Photo sign error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to prepare upload.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const username = parseQuery(request, selfQuerySchema).username
    // C2.2: auth + self gate centralized (account.photo delete: the
    // query username must be the actor's own; a missing or foreign
    // username denies here exactly where the old inline check did).
    const {
      ctx: { actor },
    } = await requireCan(request, { kind: 'account.photo', username: username ?? '' }, 'delete')

    const col = await getCollection('students')
    const me = await col.findOne(
      { username: actor.username, branch: actor.branch },
      { projection: { photoUrl: 1 } }
    )
    if (!me) {
      return NextResponse.json({ ok: false, error: 'Student not found.' }, { status: 404 })
    }

    // Destroy our Cloudinary asset if the current photo is one.
    const env = cloudinaryEnv()
    if (env) {
      const publicId = publicIdFromPhotoUrl(me.photoUrl, photoRoot(env.baseFolder))
      if (publicId) await destroyAsset(publicId, 'image')
    }

    await col.updateOne(
      { username: actor.username, branch: actor.branch },
      { $set: { photoUrl: '' } }
    )
    return NextResponse.json({ ok: true, message: 'Photo removed.' })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Photo remove error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to remove photo.' }, { status: 500 })
  }
}
