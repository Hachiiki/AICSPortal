import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getStudentByUsername } from '@/lib/mongodb/queries'
import { getCollection } from '@/lib/mongodb/connection'
import { requireCan, professorOwnership } from '@/lib/authz'
import { parseBody, parseQuery, trimmedString, errResponse, objectIdSchema } from '@/lib/validation'
import { moderateContent } from '@/lib/moderation'
import { HttpError } from '@/lib/http'
import type { MongoNotification } from '@/lib/mongodb/types'

// ============================================================
//  Notifications API — section-targeted faculty messages
// ============================================================
//
//  Faculty posts never touch the announcements collection, so
//  they never appear in the main announcement deck. They fan
//  out here as one doc per targeted student, and students read
//  them in the Topbar bell inbox.
//
//  GET /api/notifications?username=
//    The student's own docs, newest first. Students only.
//    (Faculty SENT history moved to /api/notifications/sent —
//    grouped, paginated, 30-day expiry. Do not reintroduce a flat
//    sentBy query here; it would bypass the expiry filter.)
//  POST /api/notifications
//    Body: { branch, title, body, sectionKeys[], performedBy }
//    Faculty only. sectionKeys must come from the performer's
//    own teaching load — anything else is rejected.
//  PATCH /api/notifications
//    Body: { username, id? | all? } — marks one or all read.
// ============================================================

function toClient(d: any) {
  return {
    _id: d._id?.toString() || '',
    title: d.title,
    body: d.body,
    fromName: d.fromName,
    subjectCode: d.subjectCode,
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt),
    read: d.read === true,
    taskId: typeof d.taskId === 'string' ? d.taskId : null,
  }
}

// ---- Zod input schemas (the only place notification input is shaped) ----

const notificationsGetQuerySchema = z.object({
  username: z.string().optional(),
})

const notificationPostSchema = z.object({
  branch: z.string({ error: 'Branch, title, body, and at least one section are required.' }).min(1, {
    message: 'Branch, title, body, and at least one section are required.',
  }),
  title: trimmedString(120, 'Title'),
  body: trimmedString(2000, 'Body'),
  // BUG-010: sectionKeys must be strings; objects would pollute the fan-out.
  sectionKeys: z
    .array(z.string(), { error: 'Section keys must be strings.' })
    .min(1, { message: 'Branch, title, body, and at least one section are required.' }),
  // Legacy spoof-check field; identity always comes from the session.
  performedBy: z.string().optional(),
})

const notificationPatchSchema = z.object({
  username: z.string({ error: 'Username is required.' }).min(1),
  id: objectIdSchema.optional(),
  all: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const query = parseQuery(request, notificationsGetQuerySchema)
    const username = query.username
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
    }
    // C2.4: self-or-staff gate centralized (notification.inbox read;
    // DB role — the FIX-M2 flip rides here, issue #62). The student
    // lookup (404) and the branch-mismatch 403 stay route-kept below,
    // exactly as today. (Faculty sent history lives in
    // /api/notifications/sent with grouping + expiry.)
    const {
      ctx: { claims },
    } = await requireCan(request, { kind: 'notification.inbox', username }, 'read')
    const student = await getStudentByUsername(username)
    if (!student) {
      return NextResponse.json({ ok: false, error: 'Student not found.' }, { status: 404 })
    }
    if (student.branch !== claims.branch) {
      return NextResponse.json({ ok: false, error: 'Branch mismatch' }, { status: 403 })
    }
    const col = await getCollection<MongoNotification>('notifications')
    const docs = await col
      .find({ branch: student.branch, studentUsername: username })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()
    return NextResponse.json({ ok: true, notifications: docs.map(toClient) })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Notifications read error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to load notifications.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { branch, title, body, sectionKeys, performedBy } = await parseBody(request, notificationPostSchema)
    // C2.4: session, spoof (performedBy), faculty role, and claimed
    // branch parity centralized (notification.send create); the
    // sender identity comes off the authz context.
    const {
      ctx: { actor },
    } = await requireCan(request, { kind: 'notification.send', sectionKeys, branch }, 'send', {
      claimedIdentity: performedBy,
    })

    // Resolve the actor's own sections from their teaching load.
    // Requested keys outside this set are rejected, so a teacher can
    // never notify another teacher's students (unowned keys are
    // silently dropped, all-unowned is a 403 — preserved behavior).
    // A1 phase 3 (issue #72): the load query is the strict ownership
    // key — username equality only.
    const subjectsCol = await getCollection('subjects')
    const taught = await subjectsCol
      .find({
        branch,
        ...professorOwnership(actor.username),
      })
      .project({ code: 1, academicYear: 1, semester: 1, studentUsername: 1 })
      .toArray()
    const owned = new Map<string, { code: string; students: Set<string> }>()
    for (const d of taught as any[]) {
      const key = `${d.code}|${d.academicYear || ''}|${d.semester || ''}`
      let entry = owned.get(key)
      if (!entry) {
        entry = { code: d.code, students: new Set() }
        owned.set(key, entry)
      }
      if (d.studentUsername) entry.students.add(d.studentUsername)
    }
    const targets = (sectionKeys as string[]).filter((k) => owned.has(k))
    if (targets.length === 0) {
      return NextResponse.json({ ok: false, error: 'None of the chosen sections are in your teaching load.' }, { status: 403 })
    }

    // Content moderation: one verdict covers the message every targeted
    // student would receive — checked before the fan-out insert.
    const verdict = await moderateContent({
      surface: 'section-notification',
      fields: { title, body },
      actor: { username: actor.username, role: actor.role, branch: actor.branch },
    })
    if (!verdict.ok) return verdict.response

    const now = new Date()
    const docs: MongoNotification[] = []
    for (const key of targets) {
      const entry = owned.get(key)!
      for (const studentUsername of entry.students) {
        docs.push({
          branch,
          studentUsername,
          title,
          body,
          fromName: actor.fullName,
          fromUsername: actor.username,
          sectionKey: key,
          subjectCode: entry.code,
          createdAt: now,
          read: false,
          readAt: null,
        })
      }
    }
    if (docs.length === 0) {
      return NextResponse.json({ ok: false, error: 'The chosen sections have no enrolled students.' }, { status: 400 })
    }
    const col = await getCollection<MongoNotification>('notifications')
    // BUG-017: indexes are created by seed/migration tooling, not per request.
    const result = await col.insertMany(docs as any)
    const sections = targets.length
    return NextResponse.json({
      ok: true,
      message: `Sent to ${result.insertedCount} students in ${sections} section${sections === 1 ? '' : 's'}.`,
      notified: result.insertedCount,
      sections,
    })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Notification send error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to send notification.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { username, id, all } = await parseBody(request, notificationPatchSchema)
    // C2.4: auth + username-self gate centralized (notification.inbox
    // markRead: self only, notOwner 403 otherwise).
    const {
      ctx: { actor },
    } = await requireCan(request, { kind: 'notification.inbox', username }, 'markRead')
    const student = await getStudentByUsername(username)
    if (!student) {
      return NextResponse.json({ ok: false, error: 'Student not found.' }, { status: 404 })
    }
    const col = await getCollection<MongoNotification>('notifications')
    const base = { branch: student.branch, studentUsername: actor.username }
    // Session-scoped to the reader's own username and branch (see above).
    if (all === true) {
      const result = await col.updateMany({ ...base, read: false }, { $set: { read: true, readAt: new Date() } })
      return NextResponse.json({ ok: true, marked: result.modifiedCount })
    }
    if (!id) {
      return NextResponse.json({ ok: false, error: 'Notification id or all is required.' }, { status: 400 })
    }
    const { ObjectId } = await import('mongodb')
    await col.updateOne({ ...base, _id: new ObjectId(id) }, { $set: { read: true, readAt: new Date() } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Notification read error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to update notification.' }, { status: 500 })
  }
}
