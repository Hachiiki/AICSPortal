import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/connection'
import { spoofCheck, type SessionClaims } from '@/lib/session'
import { getAuthedSession as getSession } from '@/lib/session-auth'

// ============================================================
//  Materials Cloudinary config + signing helpers (refs #35)
// ============================================================
//
//  Files upload DIRECT from the browser to Cloudinary with a
//  server-signed signature, so uploads never pass through
//  Vercel and the API secret never leaves the server. Only
//  the record (title/url/publicId) is stored in Mongo.
//
//  Layout in Cloudinary: <base>/<branch>/<subjectCode>/,
//  e.g. aics-portal/materials/commonwealth/CS-208/ — the
//  portal's own folder tree, per the owner's request.
//
//  Without CLOUDINARY_* env configured, signing and file
//  records are refused and the link-only flow keeps working.
// ============================================================

export const MATERIALS_MAX_BYTES = 10 * 1024 * 1024 // 10 MB

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif'])
const RAW_EXTS = new Set(['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'csv', 'zip'])

export function cloudinaryEnv(): { cloudName: string; apiKey: string; apiSecret: string; baseFolder: string } | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) return null
  return { cloudName, apiKey, apiSecret, baseFolder: process.env.CLOUDINARY_FOLDER || 'aics-portal/materials' }
}

export function materialFolder(baseFolder: string, branch: string, subjectCode: string): string {
  // BUG-010 style: folder segments are sanitized, never raw user input.
  const safeBranch = String(branch).replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 64) || 'branch'
  const safeCode = String(subjectCode).replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 64) || 'subject'
  return `${baseFolder}/${safeBranch}/${safeCode}`
}

export function extResourceType(format: string): 'image' | 'raw' | null {
  const ext = String(format || '').toLowerCase().replace(/^\./, '')
  if (IMAGE_EXTS.has(ext)) return 'image'
  if (RAW_EXTS.has(ext)) return 'raw'
  return null
}

// Sign upload params for a direct browser POST to Cloudinary.
// Only timestamp+folder are signed because those are the only
// params the browser sends besides file/cloud_name/api_key.
export function signUpload(params: { folder: string; timestamp: number; apiSecret: string }): string {
  const toSign = `folder=${params.folder}&timestamp=${params.timestamp}${params.apiSecret}`
  return createHash('sha1').update(toSign).digest('hex')
}

export async function getSessionFaculty(request: NextRequest) {
  const session = await getSession(request)
  if (!session) {
    return { error: NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 }) }
  }
  return { session }
}

export function spoofForbidden(session: SessionClaims, performedBy: unknown) {
  const spoof = spoofCheck(session, performedBy)
  if (spoof) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }
  return null
}

// Best-effort Cloudinary destroy for file cleanup. Failures are
// logged, never fatal — the DB record is still deleted.
export async function destroyAsset(publicId: string, resourceType: 'image' | 'raw'): Promise<void> {
  const env = cloudinaryEnv()
  if (!env || !publicId) return
  try {
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = createHash('sha1').update(`public_id=${publicId}&timestamp=${timestamp}${env.apiSecret}`).digest('hex')
    const form = new URLSearchParams({
      public_id: publicId,
      timestamp: String(timestamp),
      api_key: env.apiKey,
      signature,
    })
    await fetch(`https://api.cloudinary.com/v1_1/${env.cloudName}/${resourceType}/destroy`, {
      method: 'POST',
      headers: {
        // Admin API authenticates with HTTP Basic (key:secret).
        Authorization: `Basic ${Buffer.from(`${env.apiKey}:${env.apiSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    })
  } catch (err) {
    console.error('Cloudinary destroy failed (non-fatal):', err)
  }
}
