import { NextRequest, NextResponse } from 'next/server'
import {
  getStudentByUsername,
  getSubjectsForStudent,
  getCourses,
  getSessions,
} from '@/lib/mongodb/queries'
import { TEST_STUDENT } from '@/lib/aics/mock-data'
import { COURSES, SESSIONS } from '@/lib/schedule'

// GET /api/student?username=juan.santos
// Returns the full student profile + subjects + courses + sessions
// for the logged-in student's branch.
export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get('username')

    if (!username) {
      return NextResponse.json(
        { ok: false, error: 'Username is required.' },
        { status: 400 }
      )
    }

    let student
    let subjects
    let courses
    let sessions

    try {
      student = await getStudentByUsername(username)

      if (!student) {
        return NextResponse.json(
          { ok: false, error: 'Student not found.' },
          { status: 404 }
        )
      }

      const [s, c, sess] = await Promise.all([
        getSubjectsForStudent(student.username, student.branch),
        getCourses(student.branch),
        getSessions(student.branch),
      ])
      subjects = s
      courses = c
      sessions = sess
    } catch (mongoErr) {
      // MongoDB connection failed — fall back to mock data for demo
      console.error('MongoDB connection failed, using mock fallback:', mongoErr)
      if (username === 'juan.santos') {
        student = TEST_STUDENT
        subjects = TEST_STUDENT.subjects
        courses = COURSES
        sessions = SESSIONS
      } else {
        return NextResponse.json(
          { ok: false, error: 'Student not found.' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json({
      ok: true,
      student: student,
      courses,
      sessions,
    })
  } catch (err) {
    console.error('Student data error:', err)
    return NextResponse.json(
      { ok: false, error: 'An error occurred while fetching student data.' },
      { status: 500 }
    )
  }
}
