import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getStudentByUsername, getTasksForStudentCurrentTerm } from '@/lib/mongodb/queries'
import { getCollection } from '@/lib/mongodb/connection'
import { spoofCheck } from '@/lib/session'
import { resolveContext, createRelations, can, decisionToHttpError } from '@/lib/authz'
import { parseBody, parseQuery, trimmedString, errResponse } from '@/lib/validation'
import { moderateContent } from '@/lib/moderation'
import { HttpError } from '@/lib/http'
import type { MongoNotification, MongoTask, TaskType } from '@/lib/mongodb/types'
import type { Task } from '@/lib/aics/tasks'

// GET /api/tasks?username=juan.santos
// Returns tasks for the student's CURRENT TERM only (visibility rule).
// Phase 6: self or same-branch staff (faculty/admin) only.
export async function GET(request: NextRequest) {
  try {
    // C2.4: canonical actor off the DB doc (the FIX-M2 flip rides on
    // the staff gate, issue #62). The route keeps its lookup-first
    // ordering (404 before the staff gate, L1 pattern).
    const ctx = await resolveContext(request)
    if (!ctx) throw new HttpError(401, 'Unauthorized')

    const username = parseQuery(request, tasksGetQuerySchema).username || ctx.actor.username
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
    }

    const student = await getStudentByUsername(username)
    if (!student) {
      return NextResponse.json({ ok: false, error: 'Student not found.' }, { status: 404 })
    }

    // C2.4: self-or-staff gate centralized (task.list read; DB role).
    const gate = decisionToHttpError(
      await can(ctx, createRelations(ctx), { kind: 'task.list', studentUsername: username }, 'read')
    )
    if (gate) throw gate
    // Route-kept: staff reads of another student's tasks stay
    // same-branch (student.branch vs the JWT branch claim, as today).
    if (student.username !== ctx.actor.username && student.branch !== ctx.claims.branch) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
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
    if (err instanceof HttpError) return errResponse(err)
    console.error('Tasks API error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to fetch tasks.' }, { status: 500 })
  }
}

const VALID_TASK_TYPES: TaskType[] = ['Activity', 'Quiz', 'Test', 'Project']

// ---- Zod input schemas (the only place task input is shaped) ----

const tasksGetQuerySchema = z.object({
  username: z.string().optional(),
})

const REQUIRED_MSG = 'Branch, subject, title, type, max score, and due date are required.'

const taskPostSchema = z.object({
  branch: z.string({ error: REQUIRED_MSG }).min(1, { message: REQUIRED_MSG }),
  subjectCode: z.string({ error: REQUIRED_MSG }).min(1, { message: REQUIRED_MSG }),
  title: trimmedString(120, 'Title'),
  type: z.enum(VALID_TASK_TYPES, { error: 'Invalid task type.' }),
  description: z.string().trim().max(2000, { message: 'Description must be at most 2000 characters.' }).optional(),
  maxScore: z.coerce
    .number({ error: 'Max score must be a positive number.' })
    .finite({ message: 'Max score must be a positive number.' })
    .positive({ message: 'Max score must be a positive number.' }),
  dueDate: z.coerce.date({ error: 'Invalid due date.' }),
  // Legacy spoof-check field; identity always comes from the session.
  performedBy: z.string().optional(),
})

const taskPatchSchema = z.object({
  branch: z.string({ error: 'Branch, subject, title, and submissionsClosed are required.' }).min(1, {
    message: 'Branch, subject, title, and submissionsClosed are required.',
  }),
  subjectCode: z.string({ error: 'Branch, subject, title, and submissionsClosed are required.' }).min(1, {
    message: 'Branch, subject, title, and submissionsClosed are required.',
  }),
  title: z.string({ error: 'Branch, subject, title, and submissionsClosed are required.' }).min(1, {
    message: 'Branch, subject, title, and submissionsClosed are required.',
  }),
  dueDate: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.coerce.date({ error: 'Invalid due date.' }).optional()
  ),
  submissionsClosed: z.boolean({ error: 'Branch, subject, title, and submissionsClosed are required.' }),
  performedBy: z.string().optional(),
})

// Faculty must only create for codes they teach this term. Returns
// the faculty doc plus the code list, or an error response.
// Exported for reuse by the grade + submissions endpoints (refs #32).
// C2.4: zero importers remain after this commit (its own calls below
// died in the task.section swap); the definition is deleted in C4.1.
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
    // C2.4: canonical actor first (the resource term comes off it).
    const ctx = await resolveContext(request)
    if (!ctx) throw new HttpError(401, 'Unauthorized')

    const { branch, subjectCode, title, type, description, maxScore, dueDate, performedBy } = await parseBody(
      request,
      taskPostSchema
    )
    // Phase 6: performer is the session user. A mismatched performedBy is a spoof attempt.
    const spoof = spoofCheck(ctx.claims, performedBy)
    if (spoof) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }
    // C2.4: faculty role, claimed-branch parity, and the current-term
    // teaching load centralized (task.section create).
    const actor = ctx.actor
    const gate = decisionToHttpError(
      await can(ctx, createRelations(ctx), {
        kind: 'task.section',
        subjectCode,
        term: { academicYear: actor.academicYear, semester: actor.semester },
        branch,
      }, 'create')
    )
    if (gate) throw gate

    // Fan-out roster + term stamp (data query, same JS-side term
    // matching the policy's relation uses).
    const subjectsCol = await getCollection('subjects')
    const taught = await subjectsCol
      .find({ branch, professor: actor.fullName, code: subjectCode })
      .project({ academicYear: 1, semester: 1, yearLevel: 1, studentUsername: 1 })
      .toArray()
    const current: any[] = taught.filter(
      (d: any) => (d.academicYear || '') === (actor.academicYear || '') && (d.semester || '') === (actor.semester || '')
    )
    const yearLevel = current[0]?.yearLevel || ''
    const usernames = Array.from(new Set(current.map((d) => d.studentUsername).filter(Boolean)))
    if (usernames.length === 0) {
      return NextResponse.json({ ok: false, error: 'No enrolled students in this subject.' }, { status: 400 })
    }
    // Content moderation: the task title/description fan out to every
    // enrolled student — checked before the insert and its bell fan-out.
    const verdict = await moderateContent({
      surface: 'task',
      fields: { title, description },
      actor: { username: actor.username, role: actor.role, branch: actor.branch },
    })
    if (!verdict.ok) return verdict.response
    const now = new Date()
    const docs: MongoTask[] = usernames.map((studentUsername) => ({
      branch,
      studentUsername,
      subjectCode,
      term: { academicYear: actor.academicYear, semester: actor.semester, yearLevel },
      title,
      type,
      description: description || undefined,
      dueDate,
      postedDate: now,
      submitted: false,
      submittedAt: null,
      score: null,
      maxScore,
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
      const sectionKey = `${subjectCode}|${actor.academicYear}|${actor.semester}`
      const dueLabel = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      const trimmedDesc = description || ''
      const notifs: MongoNotification[] = usernames.map((studentUsername, i) => ({
        branch,
        studentUsername,
        title: `New ${type}: ${title}`,
        body: trimmedDesc ? `${subjectCode} · due ${dueLabel} · ${trimmedDesc.slice(0, 140)}` : `${subjectCode} · due ${dueLabel}`,
        fromName: actor.fullName,
        fromUsername: actor.username,
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
    if (err instanceof HttpError) return errResponse(err)
    console.error('Task create error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to create task.' }, { status: 500 })
  }
}

// PATCH /api/tasks
// Body: { branch, subjectCode, title, dueDate?, submissionsClosed, performedBy }
// Faculty only (session). Flips submissionsClosed on every matching student doc.
export async function PATCH(request: NextRequest) {
  try {
    // C2.4: canonical actor first (the resource term comes off it).
    const ctx = await resolveContext(request)
    if (!ctx) throw new HttpError(401, 'Unauthorized')

    const { branch, subjectCode, title, dueDate, submissionsClosed, performedBy } = await parseBody(
      request,
      taskPatchSchema
    )
    // Phase 6: performer is the session user; mismatched performedBy is a spoof attempt.
    const spoof = spoofCheck(ctx.claims, performedBy)
    if (spoof) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }
    // C2.4: faculty role, claimed-branch parity, and the current-term
    // teaching load centralized (task.section update).
    const actor = ctx.actor
    const gate = decisionToHttpError(
      await can(ctx, createRelations(ctx), {
        kind: 'task.section',
        subjectCode,
        term: { academicYear: actor.academicYear, semester: actor.semester },
        branch,
      }, 'update')
    )
    if (gate) throw gate

    const query: Record<string, any> = {
      branch,
      subjectCode,
      title,
      'term.academicYear': actor.academicYear,
      'term.semester': actor.semester,
    }
    if (dueDate) {
      const start = new Date(dueDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      query.dueDate = { $gte: start, $lt: end }
    }
    const col = await getCollection<MongoTask>('tasks')
    const result = await col.updateMany(query, { $set: { submissionsClosed } })
    return NextResponse.json({
      ok: true,
      message: submissionsClosed ? `Submissions closed for ${result.modifiedCount} students.` : `Submissions reopened for ${result.modifiedCount} students.`,
      modifiedCount: result.modifiedCount,
    })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Task toggle error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to update task.' }, { status: 500 })
  }
}
