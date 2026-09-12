import { NextRequest, NextResponse } from 'next/server'
import { getAuthedSession as getSession } from '@/lib/session-auth'
import { requireTeachingFaculty } from '@/app/api/tasks/route'
import { cloudinaryEnv, materialFolder, signUpload, spoofForbidden } from '../cloudinary'

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
    const { subjectCode, resourceType, performedBy } = await request.json()
    const forbidden = spoofForbidden(session, performedBy)
    if (forbidden) return forbidden
    // BUG-010: subject/resourceType must be plain strings pre-query.
    if (typeof subjectCode !== 'string' || !subjectCode) {
      return NextResponse.json({ ok: false, error: 'Subject is required.' }, { status: 400 })
    }
    if (resourceType !== 'image' && resourceType !== 'raw') {
      return NextResponse.json({ ok: false, error: 'Resource type must be image or raw.' }, { status: 400 })
    }
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
    console.error('Material sign error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to prepare upload.' }, { status: 500 })
  }
}
