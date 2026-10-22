import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { getStudentByUsername, getAnnouncements } from '@/lib/mongodb/queries'
import { getCollection } from '@/lib/mongodb/connection'
import { requireCan } from '@/lib/authz'
import { parseBody, parseQuery, dateInput, trimmedString, errResponse, idQuerySchema } from '@/lib/validation'
import { moderateContent } from '@/lib/moderation'
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

    const student = await getStudentByUsername(username)
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
      announcements = await col.find({ branch: student.branch }).sort({ postedDate: -1 }).toArray()
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
    console.error('Announcements API error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to fetch announcements.' }, { status: 500 })
  }
}

// POST /api/announcements
// Body: { branch, title, body, category, priority?, expiryDate?, performedBy }
// Admin only. These posts render in the main announcement deck.
// Faculty reach students through POST /api/notifications instead,
// so teacher posts never land in the deck.
const VALID_CATEGORIES = ['academic', 'deadline', 'campus', 'holiday', 'general'] as const

// ---- Zod input schemas (the only place announcement input is shaped) ----

const announcementsGetQuerySchema = z.object({
  username: z.string().optional(),
  all: z.literal('1').optional(),
})

/** priority is lenient by design: anything but 'urgent' reads as 'normal'. */
const prioritySchema = z
  .string()
  .optional()
  .transform((p) => (p === 'urgent' ? 'urgent' as const : 'normal' as const))

const announcementPostSchema = z.object({
  branch: z.string({ error: 'Branch, title, body, and category are required.' }).min(1, {
    message: 'Branch, title, body, and category are required.',
  }),
  title: trimmedString(120, 'Title'),
  body: trimmedString(2000, 'Body'),
  category: z.enum(VALID_CATEGORIES, { error: 'Invalid category.' }),
  priority: prioritySchema,
  expiryDate: dateInput('Expiry date').optional(),
  // Legacy spoof-check field; identity always comes from the session.
  performedBy: z.string().optional(),
})

const announcementPatchSchema = z.object({
  id: z.string({ error: 'Announcement id is required.' }).min(1),
  title: trimmedString(120, 'Title'),
  body: trimmedString(2000, 'Body'),
  category: z.enum(VALID_CATEGORIES, { error: 'Invalid category.' }),
  priority: prioritySchema,
  expiryDate: dateInput('Expiry date').optional(),
})

export async function POST(request: NextRequest) {
  try {
    const { branch, title, body, category, priority, expiryDate, performedBy } = await parseBody(
      request,
      announcementPostSchema
    )
    // C2.1: session, spoof (performedBy), admin role, and branch parity
    // centralized in the announcement create case; author identity is
    // the session admin off the authz context.
    const {
      ctx: { actor },
    } = await requireCan(request, { kind: 'announcement', branch }, 'create', {
      claimedIdentity: performedBy,
    })
    // Content moderation (server-side, next to the Zod layer): a verdict
    // that is not ok carries the 422 response naming the rule that fired.
    const verdict = await moderateContent({
      surface: 'announcement',
      fields: { title, body },
      actor: { username: actor.username, role: actor.role, branch: actor.branch },
    })
    if (!verdict.ok) return verdict.response
    const col = await getCollection<MongoAnnouncement>('announcements')
    const doc: MongoAnnouncement = {
      branch,
      title,
      body,
      category,
      priority,
      author: actor.fullName,
      postedDate: new Date(),
      expiryDate: expiryDate ?? null,
    }
    const result = await col.insertOne(doc as any)
    return NextResponse.json({ ok: true, message: 'Announcement posted.', id: result.insertedId.toString() })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Announcement post error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to post announcement.' }, { status: 500 })
  }
}

// ------------------------------------------------------------
// PATCH /api/announcements (admin) — edit
// Body: { id, title, body, category, priority?, expiryDate? }
// The edit form sends the full field set; only these fields move.
// author and postedDate never change on edit. expiryDate: null
// clears the expiry (post becomes permanent).
// ------------------------------------------------------------
export async function PATCH(request: NextRequest) {
  try {
    // C2.1: session + admin-role gate centralized (announcement update).
    const {
      ctx: { actor },
    } = await requireCan(request, { kind: 'announcement' }, 'update')

    const { id, title, body, category, priority, expiryDate } = await parseBody(
      request,
      announcementPatchSchema
    )
    let idFilter: ObjectId
    try {
      idFilter = new ObjectId(id)
    } catch {
      return NextResponse.json({ ok: false, error: 'Announcement not found.' }, { status: 404 })
    }

    // Content moderation: edits pass through the same rules as posts.
    const verdict = await moderateContent({
      surface: 'announcement',
      fields: { title, body },
      actor: { username: actor.username, role: actor.role, branch: actor.branch },
    })
    if (!verdict.ok) return verdict.response

    const col = await getCollection<MongoAnnouncement>('announcements')
    const result = await col.updateOne(
      { _id: idFilter, branch: actor.branch },
      {
        $set: {
          title,
          body,
          category,
          priority,
          expiryDate: expiryDate ?? null,
        },
      }
    )
    if (result.matchedCount === 0) {
      return NextResponse.json({ ok: false, error: 'Announcement not found.' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, message: 'Announcement updated.' })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Announcement update error:', err)
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
    console.error('Announcement delete error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to delete announcement.' }, { status: 500 })
  }
}
