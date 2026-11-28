import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveContext, createRelations, can, decisionToHttpError } from '@/lib/authz'
import { parseBody, errResponse } from '@/lib/validation'
import { HttpError } from '@/lib/http'
import { rateLimit } from '@/lib/rate-limit'
import { spoofCheck } from '@/lib/session'
import { cloudinaryEnv, IMAGE_FORMATS, MATERIALS_MAX_BYTES, RAW_FORMATS, materialUploadsConfigured, prepareUpload } from '../cloudinary'

const fields = { subjectCode: z.string().min(1).max(128), performedBy: z.string().max(64).optional() }
const materialSignSchema = z.discriminatedUnion('resourceType', [
  z.object({ ...fields, resourceType: z.literal('image'), format: z.enum(IMAGE_FORMATS) }),
  z.object({ ...fields, resourceType: z.literal('raw'), format: z.enum(RAW_FORMATS) }),
])

export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveContext(request)
    if (!ctx) throw new HttpError(401, 'Unauthorized')
    const { subjectCode, resourceType, format, performedBy } = await parseBody(request, materialSignSchema)
    if (spoofCheck(ctx.claims, performedBy)) throw new HttpError(403, 'Forbidden')
    const actor = ctx.actor
    const term = { academicYear: actor.academicYear, semester: actor.semester }
    const gate = decisionToHttpError(await can(ctx, createRelations(ctx), {
      kind: 'material.upload', subjectCode, term, branch: actor.branch,
    }, 'signUpload'))
    if (gate) throw gate
    const env = cloudinaryEnv()
    if (!env || !materialUploadsConfigured()) throw new HttpError(503, 'File uploads are not configured. Post a link instead.')
    const throttle = await rateLimit(`material-upload:${actor.branch}:${actor.username}`, 30, 15 * 60_000)
    if (!throttle.ok) {
      return NextResponse.json(
        { ok: false, error: 'Too many upload attempts. Please wait and try again.' },
        { status: 429, headers: { 'Retry-After': String(throttle.retryAfterSec) } },
      )
    }
    const params = await prepareUpload(env, actor, { kind: 'material', subjectCode, ...term }, resourceType, format)
    return NextResponse.json({ ok: true, ...params, maxBytes: MATERIALS_MAX_BYTES })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Material sign error.')
    return NextResponse.json({ ok: false, error: 'Failed to prepare upload.' }, { status: 500 })
  }
}
