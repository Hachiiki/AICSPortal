import { NextRequest, NextResponse } from 'next/server'
import { getStudentByUsername, getAnnouncements } from '@/lib/mongodb/queries'

// GET /api/announcements?username=juan.santos
// Returns active announcements for the student's branch, newest first.
export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get('username')
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
    }

    const student = await getStudentByUsername(username)
    if (!student) {
      return NextResponse.json({ ok: false, error: 'Student not found.' }, { status: 404 })
    }

    const announcements = await getAnnouncements(student.branch)

    const clientAnnouncements = announcements.map((a) => ({
      _id: a._id?.toString() || '',
      title: a.title,
      body: a.body,
      category: a.category,
      priority: a.priority,
      author: a.author,
      postedDate: a.postedDate instanceof Date ? a.postedDate.toISOString() : String(a.postedDate),
    }))

    return NextResponse.json({ ok: true, announcements: clientAnnouncements })
  } catch (err) {
    console.error('Announcements API error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to fetch announcements.' }, { status: 500 })
  }
}
