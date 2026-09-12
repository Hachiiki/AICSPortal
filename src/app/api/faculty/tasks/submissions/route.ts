import { NextRequest, NextResponse } from 'next/server'
import { getStudentByUsername } from '@/lib/mongodb/queries'
import { getCollection } from '@/lib/mongodb/connection'
import { getAuthedSession as getSession } from '@/lib/session-auth'
import { requireTeachingFaculty } from '@/app/api/tasks/route'
import type { MongoTask } from '@/lib/mongodb/types'

// ============================================================
//  Faculty task submissions API
//  GET /api/faculty/tasks/submissions?username=&subjectCode=&title=&dueDate=
// ============================================================
//
//  Lists every per-student doc for one posted assignment (the
//  group key the Tasks page shows: subject + title + due date)
//  so the grading drawer can show names, submit state, scores,
//  and feedback. Faculty only (session) + branch match +
//  teaching-load check via the shared requireTeachingFaculty
//  helper. dueDate matches the calendar day, same as the
//  close/reopen PATCH, so exact-ms drift cannot hide rows.
// ============================================================

export async function GET(request: NextRequest) {
  try {
    // Phase 6: submissions belong to the session user.
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    const username = request.nextUrl.searchParams.get('username') || session.username
    const subjectCode = request.nextUrl.searchParams.get('subjectCode')
    const title = request.nextUrl.searchParams.get('title')
    const dueDate = request.nextUrl.searchParams.get('dueDate')
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
    }
    if (username !== session.username) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }
    // BUG-010: group-key fields must be plain strings before they reach Mongo filters.
    if (typeof subjectCode !== 'string' || !subjectCode || typeof title !== 'string' || !title || typeof dueDate !== 'string' || !dueDate) {
      return NextResponse.json({ ok: false, error: 'Subject, title, and due date are required.' }, { status: 400 })
    }
    const due = new Date(dueDate)
    if (isNaN(due.getTime())) {
      return NextResponse.json({ ok: false, error: 'Invalid due date.' }, { status: 400 })
    }
    const faculty = await getStudentByUsername(username)
    if (!faculty) {
      return NextResponse.json({ ok: false, error: 'Faculty member not found.' }, { status: 404 })
    }
    if (faculty.role !== 'faculty') {
      return NextResponse.json({ ok: false, error: 'Unauthorized: faculty only' }, { status: 403 })
    }
    if (faculty.branch !== session.branch) {
      return NextResponse.json({ ok: false, error: 'Branch mismatch' }, { status: 403 })
    }
    // Teaching-load check runs as the session user.
    const check = await requireTeachingFaculty(session.username, session.branch, subjectCode)
    if (check.error) return check.error

    const start = new Date(due)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    const tasksCol = await getCollection<MongoTask>('tasks')
    const rows = await tasksCol
      .find({
        branch: session.branch,
        subjectCode,
        title,
        dueDate: { $gte: start, $lt: end },
        'term.academicYear': faculty.academicYear,
        'term.semester': faculty.semester,
      })
      .project({ studentUsername: 1, subjectCode: 1, title: 1, dueDate: 1, submitted: 1, submittedAt: 1, score: 1, maxScore: 1, feedback: 1, submissionsClosed: 1 })
      .toArray()

    const usernames = Array.from(new Set(rows.map((r: any) => r.studentUsername).filter(Boolean)))
    const studentsCol = await getCollection('students')
    const students = await studentsCol
      .find({ branch: session.branch, username: { $in: usernames } })
      .project({ username: 1, fullName: 1, studentNumber: 1 })
      .toArray()
    const names = new Map((students as any[]).map((s) => [s.username, s]))

    const submissions = rows.map((r: any) => {
      const s = names.get(r.studentUsername)
      return {
        _id: r._id?.toString() || '',
        studentUsername: r.studentUsername,
        fullName: s?.fullName || r.studentUsername,
        studentNumber: s?.studentNumber || '',
        submitted: r.submitted === true,
        submittedAt: r.submittedAt ? (r.submittedAt instanceof Date ? r.submittedAt.toISOString() : String(r.submittedAt)) : null,
        score: r.score ?? null,
        maxScore: r.maxScore ?? null,
        feedback: r.feedback ?? null,
        submissionsClosed: r.submissionsClosed === true,
      }
    })
    submissions.sort((a, b) => String(a.fullName).localeCompare(String(b.fullName)))

    return NextResponse.json({ ok: true, submissions })
  } catch (err) {
    console.error('Faculty task submissions error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to load submissions.' }, { status: 500 })
  }
}
