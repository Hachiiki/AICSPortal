import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getStudentByUsername, getEvents } from '@/lib/mongodb/queries'
import { getCollection } from '@/lib/mongodb/connection'
import { getAuthedSession as getSession } from '@/lib/session-auth'
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
    // Phase 6: branch directory reads require a session; username must be self.
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    const username = request.nextUrl.searchParams.get('username') || session.username
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
    }
    if (username !== session.username) {
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
    console.error('Events API error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to fetch events.' }, { status: 500 })
  }
}

// ------------------------------------------------------------
// Shared write helpers
// ------------------------------------------------------------

const VALID_EVENT_CATEGORIES: EventCategory[] = ['academic', 'deadline', 'campus', 'holiday']

/** Session + admin-role gate for write operations. Returns the admin's doc or a 401/403 response. */
async function requireAdmin(request: NextRequest) {
  const session = await getSession(request)
  if (!session) {
    return { error: NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 }) }
  }
  const performer = await getStudentByUsername(session.username)
  if (!performer || performer.role !== 'admin') {
    return { error: NextResponse.json({ ok: false, error: 'Unauthorized: admin only' }, { status: 403 }) }
  }
  return { performer }
}

/** Validate + normalize a date field. undefined = not supplied; null = clear (.endDate); 'invalid' = bad input. */
function parseDateField(value: unknown): Date | null | 'invalid' | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  if (typeof value !== 'string') return 'invalid'
  const parsed = new Date(value)
  if (isNaN(parsed.getTime())) return 'invalid'
  return parsed
}

function validateTitle(title: unknown): string | 'invalid' {
  if (typeof title !== 'string' || title.trim().length === 0 || title.length > 120) return 'invalid'
  return title.trim()
}

function validateDescription(description: unknown): string | null | 'invalid' {
  if (description === undefined || description === null || description === '') return null
  if (typeof description !== 'string' || description.length > 2000) return 'invalid'
  return description.trim()
}

// ------------------------------------------------------------
// POST /api/events (admin) — create
// Body: { title, description?, date, endDate?, category }
// ------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const gate = await requireAdmin(request)
    if ('error' in gate) return gate.error
    const { performer } = gate

    const { title, description, date, endDate, category } = await request.json()
    const safeTitle = validateTitle(title)
    if (safeTitle === 'invalid') {
      return NextResponse.json({ ok: false, error: 'Title must be 1-120 characters.' }, { status: 400 })
    }
    const safeDescription = validateDescription(description)
    if (safeDescription === 'invalid') {
      return NextResponse.json({ ok: false, error: 'Description must be at most 2000 characters.' }, { status: 400 })
    }
    if (!VALID_EVENT_CATEGORIES.includes(category)) {
      return NextResponse.json({ ok: false, error: 'Invalid category.' }, { status: 400 })
    }
    const safeDate = parseDateField(date)
    if (safeDate === 'invalid' || safeDate === null || safeDate === undefined) {
      return NextResponse.json({ ok: false, error: 'A valid event date is required.' }, { status: 400 })
    }
    const safeEndDate = parseDateField(endDate)
    if (safeEndDate === 'invalid') {
      return NextResponse.json({ ok: false, error: 'Invalid end date.' }, { status: 400 })
    }
    if (safeEndDate && safeEndDate.getTime() < safeDate.getTime()) {
      return NextResponse.json({ ok: false, error: 'End date cannot be before the start date.' }, { status: 400 })
    }

    const col = await getCollection<MongoEvent>('events')
    const doc: MongoEvent = {
      branch: performer.branch,
      title: safeTitle,
      description: safeDescription ?? undefined,
      date: safeDate,
      endDate: safeEndDate ?? null,
      category,
    }
    const result = await col.insertOne(doc as any)
    return NextResponse.json({ ok: true, message: 'Event created.', id: result.insertedId.toString() })
  } catch (err) {
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
    const gate = await requireAdmin(request)
    if ('error' in gate) return gate.error
    const { performer } = gate

    const { id, title, description, date, endDate, category } = await request.json()
    let idFilter: ObjectId
    try {
      idFilter = new ObjectId(id)
    } catch {
      return NextResponse.json({ ok: false, error: 'Event not found.' }, { status: 404 })
    }

    // Merge onto the existing doc so range validation sees final values.
    const col = await getCollection<MongoEvent>('events')
    const existing = await col.findOne({ _id: idFilter, branch: performer.branch })
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Event not found.' }, { status: 404 })
    }

    const update: Partial<MongoEvent> = {}
    if (title !== undefined) {
      const safeTitle = validateTitle(title)
      if (safeTitle === 'invalid') {
        return NextResponse.json({ ok: false, error: 'Title must be 1-120 characters.' }, { status: 400 })
      }
      update.title = safeTitle
    }
    if (description !== undefined) {
      const safeDescription = validateDescription(description)
      if (safeDescription === 'invalid') {
        return NextResponse.json({ ok: false, error: 'Description must be at most 2000 characters.' }, { status: 400 })
      }
      update.description = safeDescription ?? undefined
    }
    if (category !== undefined) {
      if (!VALID_EVENT_CATEGORIES.includes(category)) {
        return NextResponse.json({ ok: false, error: 'Invalid category.' }, { status: 400 })
      }
      update.category = category
    }
    if (date !== undefined) {
      const safeDate = parseDateField(date)
      if (safeDate === 'invalid' || safeDate === null || safeDate === undefined) {
        return NextResponse.json({ ok: false, error: 'A valid event date is required.' }, { status: 400 })
      }
      update.date = safeDate
    }
    if (endDate !== undefined) {
      const safeEndDate = parseDateField(endDate)
      if (safeEndDate === 'invalid') {
        return NextResponse.json({ ok: false, error: 'Invalid end date.' }, { status: 400 })
      }
      update.endDate = safeEndDate ?? null
    }

    const finalStart = update.date ?? existing.date
    const finalEnd = update.endDate ?? existing.endDate ?? null
    if (finalEnd && finalEnd.getTime() < new Date(finalStart).getTime()) {
      return NextResponse.json({ ok: false, error: 'End date cannot be before the start date.' }, { status: 400 })
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ ok: false, error: 'Nothing to update.' }, { status: 400 })
    }
    await col.updateOne({ _id: idFilter, branch: performer.branch }, { $set: update })
    return NextResponse.json({ ok: true, message: 'Event updated.' })
  } catch (err) {
    console.error('Event update error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to update event.' }, { status: 500 })
  }
}

// ------------------------------------------------------------
// DELETE /api/events?id=... (admin) — remove
// ------------------------------------------------------------
export async function DELETE(request: NextRequest) {
  try {
    const gate = await requireAdmin(request)
    if ('error' in gate) return gate.error
    const { performer } = gate

    const id = request.nextUrl.searchParams.get('id')
    let idFilter: ObjectId
    try {
      idFilter = new ObjectId(id ?? '')
    } catch {
      return NextResponse.json({ ok: false, error: 'Event not found.' }, { status: 404 })
    }
    const col = await getCollection<MongoEvent>('events')
    const result = await col.deleteOne({ _id: idFilter, branch: performer.branch })
    if (result.deletedCount === 0) {
      return NextResponse.json({ ok: false, error: 'Event not found.' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, message: 'Event deleted.' })
  } catch (err) {
    console.error('Event delete error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to delete event.' }, { status: 500 })
  }
}
