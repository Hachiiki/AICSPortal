import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveContext, createRelations, can, decisionToHttpError } from '@/lib/authz'
import { parseBody, errResponse } from '@/lib/validation'
import { HttpError } from '@/lib/http'
import { cloudinaryEnv, photoFolder, destroyAsset } from '@/app/api/materials/cloudinary'

// ---- Zod input schema (the only place cleanup input is shaped) ----
const photoCleanupSchema = z.object({
  publicId: z.string({ error: 'publicId is required.' }).min(1),
})

// ============================================================
//  Replaced-photo cleanup — POST /api/student/photo/cleanup
//  Body: { publicId }
// ============================================================
//
//  Called by the browser AFTER a new avatar is uploaded and
//  saved, to destroy the previous Cloudinary asset instead of
//  orphaning it. Fire-and-forget from the client; failures are
//  logged and never surface to the user.
//
//  The publicId must resolve EXACTLY to the session user's own
//  photo folder (built from session branch + username, same
//  sanitization as the sign route). Anything else is a 403 — a
//  user can never destroy course materials or another user's
//  photo through this endpoint.
// ============================================================

export async function POST(request: NextRequest) {
  try {
    // C2.2: auth + self-only cleanup gate centralized (account.photo
    // cleanup). The destroyable subtree is the session account's own
    // folder (no username input), so the policy resource is the
    // actor's username and the context is resolved first to state it;
    // the folder-containment check below stays route-kept.
    const ctx = await resolveContext(request)
    if (!ctx) throw new HttpError(401, 'Unauthorized')
    const gate = decisionToHttpError(
      await can(ctx, createRelations(ctx), { kind: 'account.photo', username: ctx.actor.username }, 'cleanup')
    )
    if (gate) throw gate

    const { publicId } = await parseBody(request, photoCleanupSchema)
    const env = cloudinaryEnv()
    if (!env) {
      // Nothing was ever uploaded through us without Cloudinary env.
      return NextResponse.json({ ok: false, error: 'Cloudinary is not configured.' }, { status: 503 })
    }

    // The public_id of a delivery URL is "<folder>/<filename>", so a
    // prefix match — not equality — against the session user's own
    // folder is the right boundary: only assets inside the caller's
    // own branch+username subtree can ever be destroyed here.
    const folder = photoFolder(env.baseFolder, ctx.actor.branch, ctx.actor.username)
    if (!publicId.startsWith(`${folder}/`)) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }

    await destroyAsset(publicId, 'image')
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Photo cleanup error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to clean up old photo.' }, { status: 500 })
  }
}
