import type { NextRequest } from 'next/server'
import { ObjectId } from 'mongodb'
import { requireCan } from '@/lib/authz'
import { HttpError } from '@/lib/http'
import { getCollection } from '@/lib/mongodb/connection'
import { activeAnnouncementFilter } from '@/lib/mongodb/queries'
import type { MongoAnnouncement } from '@/lib/mongodb/types'
import { errResponse, objectIdSchema } from '@/lib/validation'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { ctx: { actor } } = await requireCan(request, { kind: 'announcement' }, 'read')
    const id = objectIdSchema.safeParse((await params).id)
    if (!id.success) throw new HttpError(404, 'Announcement not found.')

    const col = await getCollection<MongoAnnouncement>('announcements')
    const scope = actor.role === 'admin' ? { branch: actor.branch } : activeAnnouncementFilter(actor.branch)
    const post: MongoAnnouncement | null = await col.findOne(
      { _id: new ObjectId(id.data), ...scope },
      { projection: { 'image.bytes': 0 } },
    )
    if (!post) throw new HttpError(404, 'Announcement not found.')

    return Response.json({
      ok: true,
      announcement: {
        _id: id.data,
        title: post.title,
        body: post.body,
        author: post.author,
        category: post.category,
        priority: post.priority,
        postedDate: post.postedDate instanceof Date ? post.postedDate.toISOString() : String(post.postedDate),
        ...(post.image && { image: { alt: post.image.alt } }),
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Announcement details error.')
    return Response.json({ ok: false, error: 'Failed to load the announcement.' }, { status: 500 })
  }
}
