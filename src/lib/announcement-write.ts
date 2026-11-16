import { ObjectId } from 'mongodb'
import { z } from 'zod'
import type { AuthzActor } from '@/lib/authz'
import { HttpError } from '@/lib/http'
import { moderateContent } from '@/lib/moderation'
import { getCollection } from '@/lib/mongodb/connection'
import type { MongoAnnouncement, MongoAnnouncementImage } from '@/lib/mongodb/types'
import { dateInput, trimmedString } from '@/lib/validation'

const fields = z.object({
  title: trimmedString(120, 'Title'),
  body: trimmedString(2000, 'Body'),
  category: z.enum(['academic', 'deadline', 'campus', 'holiday', 'general'], { error: 'Invalid category.' }),
  priority: z.string().optional().transform((priority) => priority === 'urgent' ? 'urgent' as const : 'normal' as const),
  expiryDate: dateInput('Expiry date').optional(),
})

export const announcementPostSchema = fields.extend({
  branch: z.string({ error: 'Branch, title, body, and category are required.' }).min(1, {
    message: 'Branch, title, body, and category are required.',
  }),
  performedBy: z.string().optional(),
})

export const announcementPatchSchema = fields.extend({
  id: z.string({ error: 'Announcement id is required.' }).min(1),
})

export const announcementFieldsSchema = fields

type Fields = z.output<typeof fields>
type Attachment = { alt: string; read: () => Promise<MongoAnnouncementImage> }

async function moderationResponse(fields: Fields, actor: AuthzActor, attachment?: Attachment | null) {
  const verdict = await moderateContent({
    surface: 'announcement',
    fields: { title: fields.title, body: fields.body, imageAlt: attachment?.alt },
    actor: { username: actor.username, role: actor.role, branch: actor.branch },
  })
  if (!verdict.ok) return verdict.response ?? Response.json({ ok: false, error: 'Announcement rejected.' }, { status: 422 })
  return null
}

export async function createAnnouncement(fields: Fields, actor: AuthzActor, attachment?: Attachment) {
  const rejected = await moderationResponse(fields, actor, attachment)
  if (rejected) return rejected
  const image = await attachment?.read()
  const col = await getCollection<MongoAnnouncement>('announcements')
  const result = await col.insertOne({
    ...fields,
    branch: actor.branch,
    author: actor.fullName,
    postedDate: new Date(),
    expiryDate: fields.expiryDate ?? null,
    ...(image ? { image } : {}),
  })
  return Response.json({ ok: true, message: 'Announcement posted.', id: result.insertedId.toString() })
}

export async function editAnnouncement(
  { id, ...fields }: z.output<typeof announcementPatchSchema>,
  actor: AuthzActor,
  attachment?: Attachment | null,
) {
  if (!ObjectId.isValid(id)) throw new HttpError(404, 'Announcement not found.')
  const rejected = await moderationResponse(fields, actor, attachment)
  if (rejected) return rejected
  const image = await attachment?.read()
  const col = await getCollection<MongoAnnouncement>('announcements')
  const result = await col.updateOne(
    { _id: new ObjectId(id), branch: actor.branch },
    {
      $set: { ...fields, expiryDate: fields.expiryDate ?? null, ...(image ? { image } : {}) },
      ...(attachment === null ? { $unset: { image: '' } } : {}),
    },
  )
  if (!result.matchedCount) throw new HttpError(404, 'Announcement not found.')
  return Response.json({ ok: true, message: 'Announcement updated.' })
}
