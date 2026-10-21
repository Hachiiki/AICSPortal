import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getStudentByUsername } from '@/lib/mongodb/queries'
import { getCollection } from '@/lib/mongodb/connection'
import { resolveContext, createRelations, can, decisionToHttpError } from '@/lib/authz'
import { parseQuery, errResponse } from '@/lib/validation'
import { HttpError } from '@/lib/http'
import type { MongoTask } from '@/lib/mongodb/types'

// ---- Zod input schema (the only place submission-filter input is shaped) ----
const submissionsGetQuerySchema = z.object({
  username: z.string().optional(),
  subjectCode: z.string({ error: 'Subject, title, and due date are required.' }).min(1, {
    message: 'Subject, title, and due date are required.',
  }),
  title: z.string({ error: 'Subject, title, and due date are required.' }).min(1, {
    message: 'Subject, title, and due date are required.',
  }),
  dueDate: z.coerce.date({ error: 'Invalid due date.' }),
})

// ============================================================
//  Faculty task submissions API
//  GET /api/faculty/tasks/submissions?username=&subjectCode=&title=&dueDate=
// ============================================================
//
//  Lists every per-student doc for one posted assignment (the
//  group key the Tasks page shows: subject + title + due date)
//  so the grading drawer can show names, submit state, scores,
//  and feedback. dueDate matches the calendar day, same as the
//  close/reopen PATCH, so exact-ms drift cannot hide rows.
//  C2.3: faculty role, branch parity, and the teaching-load check
//  run in the task.section read policy case; the load check uses
//  the actor's current term, exactly as requireTeachingFaculty did
//  (its last import outside G4 dies here; the definition follows
//  in C2.4/C4.1).
// ============================================================

export async function GET(request: NextRequest) {
  try {
    // C2.3: canonical actor first (the resource term comes off it).
    const ctx = await resolveContext(request)
    if (!ctx) throw new HttpError(401, 'Unauthorized')
    const rel = createRelations(ctx)

    const { username: usernameParam, subjectCode, title, dueDate } = parseQuery(
      request,
      submissionsGetQuerySchema
    )
    // Identity validation, route-kept: an explicit username must be
    // the session user's (the spoof-check semantics).
    if (usernameParam !== undefined && usernameParam !== ctx.actor.username) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }
    const username = usernameParam || ctx.actor.username
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
    }
    const due = dueDate

    // task.section read: faculty role, claimed-branch parity vs the DB
    // branch (claims.branch, the same comparison the old inline check
    // ran), and the current-term teaching load.
    const gate = decisionToHttpError(
      await can(ctx, rel, {
        kind: 'task.section',
        subjectCode,
        term: { academicYear: ctx.actor.academicYear, semester: ctx.actor.semester },
        branch: ctx.claims.branch,
      }, 'read')
    )
    if (gate) throw gate

    const faculty = await getStudentByUsername(username)
    if (!faculty) {
      return NextResponse.json({ ok: false, error: 'Faculty member not found.' }, { status: 404 })
    }

    const start = new Date(due)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    const tasksCol = await getCollection<MongoTask>('tasks')
    const rows = await tasksCol
      .find({
        branch: ctx.actor.branch,
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
      .find({ branch: ctx.actor.branch, username: { $in: usernames } })
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
    if (err instanceof HttpError) return errResponse(err)
    console.error('Faculty task submissions error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to load submissions.' }, { status: 500 })
  }
}
