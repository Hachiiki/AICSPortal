import { NextRequest, NextResponse } from 'next/server'
import { getStudentByUsername, getProfessors } from '@/lib/mongodb/queries'
import { getSession } from '@/lib/session'

// ADMIN CONTROL: Professor directory details (office
// hours, room, contact) are maintained by Admin. Students
// have read-only access.
//
// GET /api/professors?username=juan.santos
// Returns all professors for the student's branch. The client
// joins them with the student's current-term subjects by name.
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

    const student = await getStudentByUsername(username)
    if (!student) {
      return NextResponse.json({ ok: false, error: 'Student not found.' }, { status: 404 })
    }

    const professors = await getProfessors(student.branch)

    const clientProfessors = professors.map((p) => ({
      _id: p._id?.toString() || '',
      name: p.name,
      email: p.email,
      officeHours: p.officeHours,
      room: p.room,
    }))

    return NextResponse.json({ ok: true, professors: clientProfessors })
  } catch (err) {
    console.error('Professors API error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to fetch professors.' }, { status: 500 })
  }
}
