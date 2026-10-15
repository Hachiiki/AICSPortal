import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthedSession as getSession } from '@/lib/session-auth'
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
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
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
    const folder = photoFolder(env.baseFolder, session.branch, session.username)
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
