import { NextRequest, NextResponse } from 'next/server'
import { getStudentByUsername, getTasksForStudentCurrentTerm } from '@/lib/mongodb/queries'
import { getCollection } from '@/lib/mongodb/connection'
import { spoofCheck } from '@/lib/session'
import { getAuthedSession as getSession } from '@/lib/session-auth'
import type { MongoNotification, MongoTask, TaskType } from '@/lib/mongodb/types'
import type { Task } from '@/lib/aics/tasks'

// GET /api/tasks?username=juan.santos
// Returns tasks for the student's CURRENT TERM only (visibility rule).
// Phase 6: self or same-branch staff (faculty/admin) only.
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    const username = request.nextUrl.searchParams.get('username') || session.username
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
    }

    const student = await getStudentByUsername(username)
    if (!student) {
      return NextResponse.json({ ok: false, error: 'Student not found.' }, { status: 404 })
    }
    if (student.username !== session.username) {
      const isStaff = session.role === 'faculty' || session.role === 'admin'
      if (!isStaff || student.branch !== session.branch) {
        return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
      }
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

const VALID_TASK_TYPES: TaskType[] = ['Activity', 'Quiz', 'Test', 'Project']

// Faculty must only create for codes they teach this term. Returns
// the faculty doc plus the code list, or an error response.
// Exported for reuse by the grade + submissions endpoints (refs #32).
export async function requireTeachingFaculty(performedBy: unknown, branch: unknown, subjectCode: unknown) {
  // BUG-010: reject operator objects before they reach Mongo filters.
  if (typeof performedBy !== 'string' || !performedBy || typeof branch !== 'string' || !branch || typeof subjectCode !== 'string' || !subjectCode) {
    return { error: NextResponse.json({ ok: false, error: 'Unauthorized: performedBy is required' }, { status: 403 }) }
  }
  const studentsCol = await getCollection('students')
  const performer = await studentsCol.findOne({ username: performedBy })
  if (!performer || performer.role !== 'faculty') {
    return { error: NextResponse.json({ ok: false, error: 'Unauthorized: faculty only' }, { status: 403 }) }
  }
  if (performer.branch !== branch) {
    return { error: NextResponse.json({ ok: false, error: 'Branch mismatch' }, { status: 403 }) }
  }
  const subjectsCol = await getCollection('subjects')
  const taught = await subjectsCol
    .find({ branch, professor: performer.fullName, code: subjectCode })
    .project({ academicYear: 1, semester: 1, yearLevel: 1, studentUsername: 1 })
    .toArray()
  const current = taught.filter(
    (d: any) => (d.academicYear || '') === (performer.academicYear || '') && (d.semester || '') === (performer.semester || '')
  )
  if (current.length === 0) {
    return { error: NextResponse.json({ ok: false, error: 'Subject is not in your current teaching load.' }, { status: 403 }) }
  }
  return { performer, current }
}

// POST /api/tasks
// Body: { branch, subjectCode, title, type, description?, maxScore, dueDate, performedBy }
// Faculty only. Fans out one task doc per enrolled student in that
// subject so each student's submit and score stay independent.
export async function POST(request: NextRequest) {
  try {
    // Phase 6: performer is the session user. A mismatched performedBy is a spoof attempt.
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { branch, subjectCode, title, type, description, maxScore, dueDate, performedBy } = await request.json()
    const spoof = spoofCheck(session, performedBy)
    if (spoof) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }
    if (typeof branch !== 'string' || branch !== session.branch) {
      return NextResponse.json({ ok: false, error: 'Branch mismatch' }, { status: 403 })
    }
    if (!branch || !subjectCode || !title || !type || maxScore === undefined || !dueDate) {
      return NextResponse.json({ ok: false, error: 'Branch, subject, title, type, max score, and due date are required.' }, { status: 400 })
    }
    if (typeof title !== 'string' || title.trim().length === 0 || title.length > 120) {
      return NextResponse.json({ ok: false, error: 'Title must be 1-120 characters.' }, { status: 400 })
    }
    if (!VALID_TASK_TYPES.includes(type)) {
      return NextResponse.json({ ok: false, error: 'Invalid task type.' }, { status: 400 })
    }
    const max = Number(maxScore)
    if (!isFinite(max) || max <= 0) {
      return NextResponse.json({ ok: false, error: 'Max score must be a positive number.' }, { status: 400 })
    }
    const due = new Date(dueDate)
    if (isNaN(due.getTime())) {
      return NextResponse.json({ ok: false, error: 'Invalid due date.' }, { status: 400 })
    }
    // Phase 6: teaching-load check runs as the session user, not a body field.
    // (Legacy performedBy already spoof-checked above; it is otherwise ignored.)
    const check = await requireTeachingFaculty(session.username, branch, subjectCode)
    if (check.error) return check.error
    const { performer, current } = check as { performer: any; current: any[] }
    const yearLevel = current[0]?.yearLevel || ''
    const usernames = Array.from(new Set(current.map((d) => d.studentUsername).filter(Boolean)))
    if (usernames.length === 0) {
      return NextResponse.json({ ok: false, error: 'No enrolled students in this subject.' }, { status: 400 })
    }
    const now = new Date()
    const docs: MongoTask[] = usernames.map((studentUsername) => ({
      branch,
      studentUsername,
      subjectCode,
      term: { academicYear: performer.academicYear, semester: performer.semester, yearLevel },
      title: title.trim(),
      type,
      description: typeof description === 'string' ? description.trim().slice(0, 2000) : undefined,
      dueDate: due,
      postedDate: now,
      submitted: false,
      submittedAt: null,
      score: null,
      maxScore: max,
      feedback: null,
      submissionsClosed: false,
    }))
    const col = await getCollection<MongoTask>('tasks')
    const result = await col.insertMany(docs as any)
    // Bell fan-out (refs #37-review): one notification per student so
    // the task announcement lands in their inbox and deep-links into
    // Academics → Tasks. Best-effort — a notify failure must never
    // fail the task post itself.
    try {
      const notifCol = await getCollection<MongoNotification>('notifications')
      const sectionKey = `${subjectCode}|${performer.academicYear}|${performer.semester}`
      const dueLabel = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      const trimmedDesc = typeof description === 'string' && description.trim() ? description.trim().slice(0, 140) : ''
      const notifs: MongoNotification[] = usernames.map((studentUsername, i) => ({
        branch,
        studentUsername,
        title: `New ${type}: ${title.trim()}`,
        body: trimmedDesc ? `${subjectCode} — due ${dueLabel} — ${trimmedDesc}` : `${subjectCode} — due ${dueLabel}`,
        fromName: performer.fullName,
        fromUsername: session.username,
        sectionKey,
        subjectCode,
        taskId: (result.insertedIds as any)?.[i]?.toString() || null,
        createdAt: now,
        read: false,
        readAt: null,
      }))
      await notifCol.insertMany(notifs as any)
    } catch (notifyErr) {
      console.error('Task notification fan-out failed (non-fatal):', notifyErr)
    }
    return NextResponse.json({ ok: true, message: `Task posted to ${result.insertedCount} students.`, created: result.insertedCount })
  } catch (err) {
    console.error('Task create error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to create task.' }, { status: 500 })
  }
}

// PATCH /api/tasks
// Body: { branch, subjectCode, title, dueDate?, submissionsClosed, performedBy }
// Faculty only (session). Flips submissionsClosed on every matching student doc.
export async function PATCH(request: NextRequest) {
  try {
    // Phase 6: performer is the session user; mismatched performedBy is a spoof attempt.
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { branch, subjectCode, title, dueDate, submissionsClosed, performedBy } = await request.json()
    const spoof = spoofCheck(session, performedBy)
    if (spoof) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }
    if (typeof branch !== 'string' || branch !== session.branch) {
      return NextResponse.json({ ok: false, error: 'Branch mismatch' }, { status: 403 })
    }
    if (!branch || !subjectCode || !title || submissionsClosed === undefined) {
      return NextResponse.json({ ok: false, error: 'Branch, subject, title, and submissionsClosed are required.' }, { status: 400 })
    }
    const check = await requireTeachingFaculty(session.username, branch, subjectCode)
    if (check.error) return check.error
    const { performer } = check as { performer: any }
    const query: Record<string, any> = {
      branch,
      subjectCode,
      title,
      'term.academicYear': performer.academicYear,
      'term.semester': performer.semester,
    }
    if (dueDate) {
      const due = new Date(dueDate)
      if (isNaN(due.getTime())) {
        return NextResponse.json({ ok: false, error: 'Invalid due date.' }, { status: 400 })
      }
      const start = new Date(due)
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      query.dueDate = { $gte: start, $lt: end }
    }
    const col = await getCollection<MongoTask>('tasks')
    const result = await col.updateMany(query, { $set: { submissionsClosed: submissionsClosed === true } })
    return NextResponse.json({
      ok: true,
      message: submissionsClosed ? `Submissions closed for ${result.modifiedCount} students.` : `Submissions reopened for ${result.modifiedCount} students.`,
      modifiedCount: result.modifiedCount,
    })
  } catch (err) {
    console.error('Task toggle error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to update task.' }, { status: 500 })
  }
}
