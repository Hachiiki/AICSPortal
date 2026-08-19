import { NextRequest, NextResponse } from 'next/server'
import { getStudentByUsername, getTasksForStudentCurrentTerm } from '@/lib/mongodb/queries'
import type { Task } from '@/lib/aics/tasks'

// GET /api/tasks?username=juan.santos
// Returns tasks for the student's CURRENT TERM only (visibility rule).
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

    // VISIBILITY RULE: Students only see tasks of the ACTIVE
    // term. When the sem/year ends, tasks are hidden from
    // students but NOT deleted. Admin and Teacher roles can
    // see full task history (to be wired when those roles
    // exist).
    const tasks = await getTasksForStudentCurrentTerm(
      student.username,
      student.branch,
      { academicYear: student.academicYear, semester: student.semester }
    )

    const clientTasks: Task[] = tasks.map((t) => ({
      _id: t._id?.toString() || '',
      subjectCode: t.subjectCode,
      term: t.term,
      title: t.title,
      type: t.type,
      description: t.description,
      dueDate: t.dueDate instanceof Date ? t.dueDate.toISOString() : String(t.dueDate),
      postedDate: t.postedDate instanceof Date ? t.postedDate.toISOString() : String(t.postedDate),
      submitted: t.submitted,
      submittedAt: t.submittedAt ? (t.submittedAt instanceof Date ? t.submittedAt.toISOString() : String(t.submittedAt)) : null,
      score: t.score,
      maxScore: t.maxScore,
      feedback: t.feedback,
      submissionsClosed: t.submissionsClosed === true,
    }))

    return NextResponse.json({ ok: true, tasks: clientTasks })
  } catch (err) {
    console.error('Tasks API error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to fetch tasks.' }, { status: 500 })
  }
}
