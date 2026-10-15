import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthedSession as getSession } from '@/lib/session-auth'
import { parseBody, errResponse } from '@/lib/validation'
import { HttpError } from '@/lib/http'
import { requireTeachingFaculty } from '@/app/api/tasks/route'
import { cloudinaryEnv, materialFolder, signUpload, spoofForbidden } from '../cloudinary'

// ---- Zod input schema (the only place upload-signing input is shaped) ----
const materialSignSchema = z.object({
  subjectCode: z.string({ error: 'Subject is required.' }).min(1),
  resourceType: z.enum(['image', 'raw'], { error: 'Resource type must be image or raw.' }),
  // Legacy spoof-check field; identity always comes from the session.
  performedBy: z.string().optional(),
})

// ============================================================
//  Materials upload signing — POST /api/materials/sign
//  Body: { subjectCode, resourceType: 'image'|'raw', performedBy }
// ============================================================
//
//  Faculty only (session) + teaching-load check. Returns the
//  signature for ONE direct browser→Cloudinary upload into the
//  portal's folder tree. The API secret never leaves the server;
//  only cloudName/apiKey (public identifiers) go to the client.
//  Without CLOUDINARY_* configured, signing is refused (503)
//  and the link-only flow remains available.
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { subjectCode, resourceType, performedBy } = await parseBody(request, materialSignSchema)
    const forbidden = spoofForbidden(session, performedBy)
    if (forbidden) return forbidden
    const env = cloudinaryEnv()
    if (!env) {
      return NextResponse.json({ ok: false, error: 'File uploads are not configured. Post a link instead.' }, { status: 503 })
    }
    // Teaching-load check runs as the session user.
    const check = await requireTeachingFaculty(session.username, session.branch, subjectCode)
    if (check.error) return check.error

    const folder = materialFolder(env.baseFolder, session.branch, subjectCode)
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = signUpload({ folder, timestamp, apiSecret: env.apiSecret })
    return NextResponse.json({
      ok: true,
      cloudName: env.cloudName,
      apiKey: env.apiKey,
      timestamp,
      folder,
      signature,
      uploadUrl: `https://api.cloudinary.com/v1_1/${env.cloudName}/${resourceType}/upload`,
      maxBytes: 10 * 1024 * 1024,
    })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Material sign error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to prepare upload.' }, { status: 500 })
  }
}
