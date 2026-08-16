import { NextRequest, NextResponse } from 'next/server'
import { getStudentByUsername, getEvents } from '@/lib/mongodb/queries'

// ADMIN CONTROL: Events are created/edited/deleted by
// Admin only. Students have read-only access to this
// calendar. The admin UI for managing events will be
// wired when the admin portal exists.
//
// GET /api/events?username=juan.santos
// Returns all school-wide events for the student's branch.
// The client filters by visible month/range.
export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get('username')
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
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
