import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { getStudentByUsername, getEvents } from '@/lib/mongodb/queries'
import { getCollection } from '@/lib/mongodb/connection'
import { requireCan } from '@/lib/authz'
import { parseBody, parseQuery, dateInput, trimmedString, errResponse, idQuerySchema } from '@/lib/validation'
import { HttpError } from '@/lib/http'
import type { MongoEvent, EventCategory } from '@/lib/mongodb/types'

// ADMIN CONTROL: Events are created/edited/deleted by Admin only.
// Students have read-only access to this calendar.
//
// GET /api/events?username=juan.santos
// Returns all school-wide events for the student's branch.
// The client filters by visible month/range.
//
// POST /api/events            (admin) create
// PATCH /api/events           (admin) edit — body { id, ...fields }
// DELETE /api/events?id=...   (admin) remove
//
// Writes are branch-scoped to the admin's OWN session branch — each
// branch manages its own calendar. Identity always comes from the
// session; the branch is derived from the admin's record, never
// accepted from the client.
export async function GET(request: NextRequest) {
  try {
    // C2.1: auth gate centralized (branch.calendar read: any authed).
    // The username-self check and the student lookup stay route-kept
    // (identity validation, lookup-first, not policy decisions).
    const {
      ctx: { actor },
    } = await requireCan(request, { kind: 'branch.calendar' }, 'read')
    const query = parseQuery(request, eventsGetQuerySchema)
    const username = query.username || actor.username
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
    }
    if (username !== actor.username) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }

    // Resolve the student to determine their branch (events are
    // branch-scoped, not student-scoped).
    const student = await getStudentByUsername(username)
    if (!student) {
      return NextResponse.json({ ok: false, error: 'Student not found.' }, { status: 404 })
    }

    const events = await getEvents(student.branch)

    const clientEvents = events.map((e) => ({
      _id: e._id?.toString() || '',
      title: e.title,
      description: e.description ?? null,
      date: e.date instanceof Date ? e.date.toISOString() : String(e.date),
      endDate: e.endDate
        ? e.endDate instanceof Date
          ? e.endDate.toISOString()
          : String(e.endDate)
        : null,
      category: e.category,
    }))

    return NextResponse.json({ ok: true, events: clientEvents })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Events API error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to fetch events.' }, { status: 500 })
  }
}

// ------------------------------------------------------------
// Shared write helpers
// ------------------------------------------------------------

const VALID_EVENT_CATEGORIES: EventCategory[] = ['academic', 'deadline', 'campus', 'holiday']

// ---- Zod input schemas (the only place event input is shaped) ----

const eventsGetQuerySchema = z.object({
  username: z.string().optional(),
})

const eventCategorySchema = z.enum(VALID_EVENT_CATEGORIES, { error: 'Invalid category.' })

/** Optional description: 0-2000 chars, trimmed; null/'' mean "none". */
const eventDescriptionSchema = z
  .string({ error: 'Description must be at most 2000 characters.' })
  .max(2000)
  .trim()
  .nullish()
  .transform((v) => (v && v.length > 0 ? v : null))

const eventCreateSchema = z.object({
  title: trimmedString(120, 'Title'),
  description: eventDescriptionSchema,
  date: z.coerce.date({ error: 'A valid event date is required.' }),
  endDate: dateInput('End date').optional(),
  category: eventCategorySchema,
})

const eventPatchSchema = z.object({
  id: z.string({ error: 'Event id is required.' }).min(1),
  title: trimmedString(120, 'Title').optional(),
  description: eventDescriptionSchema.optional(),
  date: z.coerce.date({ error: 'A valid event date is required.' }).optional(),
  endDate: dateInput('End date').optional(),
  category: eventCategorySchema.optional(),
})

// ------------------------------------------------------------
// POST /api/events (admin) — create
// Body: { title, description?, date, endDate?, category }
// ------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    // C2.1: session + admin-role gate centralized (branch.calendar create).
    const {
      ctx: { actor },
    } = await requireCan(request, { kind: 'branch.calendar' }, 'create')

    const { title, description, date, endDate, category } = await parseBody(request, eventCreateSchema)
    const safeEndDate = endDate ?? null
    if (safeEndDate && safeEndDate.getTime() < date.getTime()) {
      return NextResponse.json({ ok: false, error: 'End date cannot be before the start date.' }, { status: 400 })
    }

    const col = await getCollection<MongoEvent>('events')
    const doc: MongoEvent = {
      branch: actor.branch,
      title,
      description: description ?? undefined,
      date,
      endDate: safeEndDate,
      category,
    }
    const result = await col.insertOne(doc as any)
    return NextResponse.json({ ok: true, message: 'Event created.', id: result.insertedId.toString() })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Event create error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to create event.' }, { status: 500 })
  }
}

// ------------------------------------------------------------
// PATCH /api/events (admin) — edit
// Body: { id, title?, description?, date?, endDate?, category? }
// endDate: null clears the range (back to single-day).
// ------------------------------------------------------------
export async function PATCH(request: NextRequest) {
  try {
    // C2.1: session + admin-role gate centralized (branch.calendar update).
    const {
      ctx: { actor },
    } = await requireCan(request, { kind: 'branch.calendar' }, 'update')

    const { id, title, description, date, endDate, category } = await parseBody(request, eventPatchSchema)
    let idFilter: ObjectId
    try {
      idFilter = new ObjectId(id)
    } catch {
      return NextResponse.json({ ok: false, error: 'Event not found.' }, { status: 404 })
    }

    // Merge onto the existing doc so range validation sees final values.
    const col = await getCollection<MongoEvent>('events')
    const existing = await col.findOne({ _id: idFilter, branch: actor.branch })
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Event not found.' }, { status: 404 })
    }

    const update: Partial<MongoEvent> = {}
    if (title !== undefined) update.title = title
    if (description !== undefined) update.description = description ?? undefined
    if (category !== undefined) update.category = category
    if (date !== undefined) update.date = date
    if (endDate !== undefined) update.endDate = endDate ?? null

    const finalStart = update.date ?? existing.date
    const finalEnd = update.endDate ?? existing.endDate ?? null
    if (finalEnd && finalEnd.getTime() < new Date(finalStart).getTime()) {
      return NextResponse.json({ ok: false, error: 'End date cannot be before the start date.' }, { status: 400 })
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ ok: false, error: 'Nothing to update.' }, { status: 400 })
    }
    await col.updateOne({ _id: idFilter, branch: actor.branch }, { $set: update })
    return NextResponse.json({ ok: true, message: 'Event updated.' })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Event update error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to update event.' }, { status: 500 })
  }
}

// ------------------------------------------------------------
// DELETE /api/events?id=... (admin) — remove
// ------------------------------------------------------------
export async function DELETE(request: NextRequest) {
  try {
    // C2.1: session + admin-role gate centralized (branch.calendar delete).
    const {
      ctx: { actor },
    } = await requireCan(request, { kind: 'branch.calendar' }, 'delete')

    const query = parseQuery(request, idQuerySchema)
    let idFilter: ObjectId
    try {
      idFilter = new ObjectId(query.id)
    } catch {
      return NextResponse.json({ ok: false, error: 'Event not found.' }, { status: 404 })
    }
    const col = await getCollection<MongoEvent>('events')
    const result = await col.deleteOne({ _id: idFilter, branch: actor.branch })
    if (result.deletedCount === 0) {
      return NextResponse.json({ ok: false, error: 'Event not found.' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, message: 'Event deleted.' })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Event delete error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to delete event.' }, { status: 500 })
  }
}
