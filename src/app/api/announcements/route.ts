import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { getStudentByUsername, getAnnouncements } from '@/lib/mongodb/queries'
import { getCollection } from '@/lib/mongodb/connection'
import { requireCan } from '@/lib/authz'
import { parseBody, parseQuery, errResponse, idQuerySchema } from '@/lib/validation'
import { announcementPostSchema, announcementPatchSchema, createAnnouncement, editAnnouncement } from '@/lib/announcement-write'
import { HttpError } from '@/lib/http'
import type { MongoAnnouncement } from '@/lib/mongodb/types'

// GET /api/announcements?username=juan.santos
// Returns active announcements for the session user's branch, newest first.
// Phase 6: the username param must match the session (read markers are per-user).
//
// GET /api/announcements?username=admin&all=1
// Admin-only: every announcement in the branch INCLUDING expired ones,
// so the manage page can edit/remove posts after they lapse.
// The response also carries expiryDate (ignored by the student deck).
export async function GET(request: NextRequest) {
  try {
    // C2.1: auth gate centralized (announcement read: any authed reader).
    // The username-self check and the student lookup stay route-kept
    // (identity validation, lookup-first, not policy decisions).
    const {
      ctx: { actor },
    } = await requireCan(request, { kind: 'announcement' }, 'read')
    const query = parseQuery(request, announcementsGetQuerySchema)
    const username = query.username || actor.username
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
    }
    if (username !== actor.username) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }

    const student = await getStudentByUsername(username, actor.branch)
    if (!student) {
      return NextResponse.json({ ok: false, error: 'Student not found.' }, { status: 404 })
    }

    const wantsAll = query.all === '1'
    let announcements: MongoAnnouncement[]
    if (wantsAll) {
      // Admin-only variant; the role is the DB value off the authz context.
      if (actor.role !== 'admin') {
        return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
      }
      const col = await getCollection<MongoAnnouncement>('announcements')
      announcements = await col.find({ branch: student.branch }, { projection: { 'image.bytes': 0 } }).sort({ postedDate: -1 }).toArray()
    } else {
      announcements = await getAnnouncements(student.branch)
    }

    // Announcements this user already read or dismissed, so the
    // deck can hide them instead of replaying them every visit.
    const readsCol = await getCollection('announcement_reads')
    const reads = await readsCol
      .find({ branch: student.branch, username })
      .project({ announcementId: 1 })
      .toArray()

    const clientAnnouncements = announcements.map((a) => ({
      _id: a._id?.toString() || '',
      title: a.title,
      body: a.body,
      category: a.category,
      priority: a.priority,
      author: a.author,
      ...(a.image && { image: { alt: a.image.alt } }),
      postedDate: a.postedDate instanceof Date ? a.postedDate.toISOString() : String(a.postedDate),
      expiryDate: a.expiryDate
        ? a.expiryDate instanceof Date
          ? a.expiryDate.toISOString()
          : String(a.expiryDate)
        : null,
    }))

    return NextResponse.json({
      ok: true,
      announcements: clientAnnouncements,
      readIds: reads.map((r: any) => String(r.announcementId)),
    })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Announcements API error.')
    return NextResponse.json({ ok: false, error: 'Failed to fetch announcements.' }, { status: 500 })
  }
}

// POST /api/announcements
// Body: { branch, title, body, category, priority?, expiryDate?, performedBy }
// Admin only. These posts render in the main announcement deck.
// Faculty reach students through POST /api/notifications instead,
// so teacher posts never land in the deck.
const announcementsGetQuerySchema = z.object({
  username: z.string().optional(),
  all: z.literal('1').optional(),
})

export async function POST(request: NextRequest) {
  try {
    const { branch, performedBy, ...fields } = await parseBody(request, announcementPostSchema)
    const { ctx: { actor } } = await requireCan(request, { kind: 'announcement', branch }, 'create', {
      claimedIdentity: performedBy,
    })
    return await createAnnouncement(fields, actor)
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Announcement post error.')
    return NextResponse.json({ ok: false, error: 'Failed to post announcement.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { ctx: { actor } } = await requireCan(request, { kind: 'announcement' }, 'update')
    return await editAnnouncement(await parseBody(request, announcementPatchSchema), actor)
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Announcement update error.')
    return NextResponse.json({ ok: false, error: 'Failed to update announcement.' }, { status: 500 })
  }
}

// ------------------------------------------------------------
// DELETE /api/announcements?id=... (admin) — remove
// Also drops the announcement's read markers so nothing dangles.
// ------------------------------------------------------------
export async function DELETE(request: NextRequest) {
  try {
    // C2.1: session + admin-role gate centralized (announcement delete).
    const {
      ctx: { actor },
    } = await requireCan(request, { kind: 'announcement' }, 'delete')

    const query = parseQuery(request, idQuerySchema)
    let idFilter: ObjectId
    try {
      idFilter = new ObjectId(query.id)
    } catch {
      return NextResponse.json({ ok: false, error: 'Announcement not found.' }, { status: 404 })
    }

    const col = await getCollection<MongoAnnouncement>('announcements')
    const result = await col.deleteOne({ _id: idFilter, branch: actor.branch })
    if (result.deletedCount === 0) {
      return NextResponse.json({ ok: false, error: 'Announcement not found.' }, { status: 404 })
    }
    // Read markers reference the announcement by id; remove them so
    // the collection never accumulates orphans.
    const readsCol = await getCollection('announcement_reads')
    await readsCol.deleteMany({ branch: actor.branch, announcementId: query.id })
    return NextResponse.json({ ok: true, message: 'Announcement deleted.' })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Announcement delete error.')
    return NextResponse.json({ ok: false, error: 'Failed to delete announcement.' }, { status: 500 })
  }
}
