import type { NextRequest } from 'next/server'
import { Binary, ObjectId } from 'mongodb'
import { z } from 'zod'
import { ANNOUNCEMENT_IMAGE_ALT_MAX_LENGTH, ANNOUNCEMENT_IMAGE_MAX_BYTES } from '@/lib/aics/announcements'
import { announcementFieldsSchema, announcementPatchSchema, createAnnouncement, editAnnouncement } from '@/lib/announcement-write'
import { requireCan } from '@/lib/authz'
import { HttpError } from '@/lib/http'
import { getCollection } from '@/lib/mongodb/connection'
import { activeAnnouncementFilter } from '@/lib/mongodb/queries'
import type { MongoAnnouncement } from '@/lib/mongodb/types'
import { errResponse, idQuerySchema, parseQuery, zodMessage } from '@/lib/validation'

const MAX_FORM_BYTES = ANNOUNCEMENT_IMAGE_MAX_BYTES + 16 * 1024
const imageAltSchema = z.string().trim().max(ANNOUNCEMENT_IMAGE_ALT_MAX_LENGTH)

async function readForm(request: NextRequest) {
  const contentType = request.headers.get('content-type')
  if (!contentType?.startsWith('multipart/form-data;')) throw new HttpError(415, 'Use a multipart form to attach an image.')
  const reader = request.body?.getReader()
  if (!reader) throw new HttpError(400, 'An announcement form is required.')

  const chunks: Uint8Array[] = []
  let bytes = 0
  try {
    if (Number(request.headers.get('content-length')) > MAX_FORM_BYTES) {
      throw new HttpError(413, 'The image must be 2 MB or smaller.')
    }
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > MAX_FORM_BYTES) throw new HttpError(413, 'The image must be 2 MB or smaller.')
      chunks.push(value)
    }
    return await new Response(Buffer.concat(chunks, bytes), { headers: { 'Content-Type': contentType } }).formData()
  } catch (err) {
    if (err instanceof HttpError) throw err
    throw new HttpError(400, 'The announcement form could not be read.')
  } finally {
    void reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}

async function normalizeImage(file: File, alt: string) {
  const { default: sharp } = await import('sharp')
  try {
    const image = sharp(await file.arrayBuffer(), { limitInputPixels: 20_000_000, failOn: 'warning' })
    const metadata = await image.metadata()
    if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages ?? 1) > 1) {
      throw new HttpError(415, 'Choose a JPG, PNG, or WebP still image.')
    }
    const bytes = await image.autoOrient()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()
    if (bytes.length > ANNOUNCEMENT_IMAGE_MAX_BYTES) throw new HttpError(413, 'Choose a smaller image.')
    return { alt, bytes: new Binary(bytes) }
  } catch (err) {
    if (err instanceof HttpError) throw err
    throw new HttpError(400, 'The image could not be opened. Choose a valid JPG, PNG, or WebP image.')
  }
}

async function saveImageAnnouncement(request: NextRequest, action: 'create' | 'update') {
  try {
    const { ctx: { actor } } = await requireCan(request, { kind: 'announcement' }, action)
    const form = await readForm(request)
    const schema = action === 'create' ? announcementFieldsSchema : announcementPatchSchema
    const content = form.get('announcement')
    let raw: unknown
    try {
      raw = typeof content === 'string' ? JSON.parse(content) : undefined
    } catch {
      throw new HttpError(400, 'The announcement fields must be valid JSON.')
    }
    const result = schema.safeParse(raw)
    if (!result.success) throw new HttpError(400, zodMessage(result.error))
    const fields = result.data
    const id = 'id' in fields && typeof fields.id === 'string' ? fields.id : undefined

    const file = form.get('image')
    if (id && form.get('removeImage') === '1' && file === null) {
      return await editAnnouncement({ ...fields, id }, actor, null)
    }
    if (!(file instanceof File) || file.size === 0) throw new HttpError(400, 'Choose an image to attach.')
    if (file.size > ANNOUNCEMENT_IMAGE_MAX_BYTES) throw new HttpError(413, 'The image must be 2 MB or smaller.')
    const alt = imageAltSchema.safeParse(form.get('imageAlt') ?? '')
    if (!alt.success) throw new HttpError(400, 'The image description is too long.')
    const attachment = { alt: alt.data, read: () => normalizeImage(file, alt.data) }
    if (id) return await editAnnouncement({ ...fields, id }, actor, attachment)
    return await createAnnouncement(fields, actor, attachment)
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Announcement image save error:', err)
    return Response.json({ ok: false, error: 'Failed to save the announcement image.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return saveImageAnnouncement(request, 'create')
}

export async function PATCH(request: NextRequest) {
  return saveImageAnnouncement(request, 'update')
}

export async function GET(request: NextRequest) {
  try {
    const { ctx: { actor } } = await requireCan(request, { kind: 'announcement' }, 'read')
    const { id } = parseQuery(request, idQuerySchema)
    const col = await getCollection<MongoAnnouncement>('announcements')
    const scope = actor.role === 'admin' ? { branch: actor.branch } : activeAnnouncementFilter(actor.branch)
    const post: Pick<MongoAnnouncement, 'image'> | null = await col.findOne(
      { _id: new ObjectId(id), ...scope },
      { projection: { _id: 0, 'image.bytes': 1 } },
    )
    if (!post?.image?.bytes) throw new HttpError(404, 'Announcement image not found.')
    return new Response(Uint8Array.from(post.image.bytes.value()), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Announcement image read error:', err)
    return Response.json({ ok: false, error: 'Failed to load the announcement image.' }, { status: 500 })
  }
}
