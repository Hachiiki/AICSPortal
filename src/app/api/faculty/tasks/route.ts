import { NextRequest, NextResponse } from 'next/server'
import { getStudentByUsername } from '@/lib/mongodb/queries'
import { getCollection } from '@/lib/mongodb/connection'
import { requireCan } from '@/lib/authz'
import { HttpError } from '@/lib/http'
import { parseQuery, selfQuerySchema, errResponse } from "@/lib/validation"

// ============================================================
//  Faculty tasks API — GET /api/faculty/tasks?username=...
// ============================================================
//
//  Groups this faculty member's current-term tasks by subject,
//  title, and due date so the Tasks page can show one row per
//  assignment with submit counts and the submissions toggle.
//  Docs are per student, so counts come from the group.
// ============================================================

export async function GET(request: NextRequest) {
  try {
    // C2.3: auth + username-self + role gates centralized (task.board
    // read: faculty or admin, DB role). The username query field rides
    // the guard's spoof check; the faculty lookup (404) and the
    // server-derived load + term grouping stay route-kept.
    const claimed = parseQuery(request, selfQuerySchema).username
    const {
      ctx: { actor },
    } = await requireCan(request, { kind: 'task.board' }, 'read', {
      claimedIdentity: claimed,
    })
    const username = claimed || actor.username
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
    }
    const faculty = await getStudentByUsername(username)
    if (!faculty) {
      return NextResponse.json({ ok: false, error: 'Faculty member not found.' }, { status: 404 })
    }

    const subjectsCol = await getCollection('subjects')
    const taught = await subjectsCol
      .find({ branch: faculty.branch, professor: faculty.fullName })
      .project({ code: 1, academicYear: 1, semester: 1 })
      .toArray()
    const codes = Array.from(
      new Set(
        taught
          .filter((d: any) => (d.academicYear || '') === (faculty.academicYear || '') && (d.semester || '') === (faculty.semester || ''))
          .map((d: any) => d.code)
      )
    )
    if (codes.length === 0) {
      return NextResponse.json({ ok: true, groups: [] })
    }

    const tasksCol = await getCollection('tasks')
    const rows = await tasksCol
      .find({
        branch: faculty.branch,
        subjectCode: { $in: codes },
        'term.academicYear': faculty.academicYear,
        'term.semester': faculty.semester,
      })
      .project({ subjectCode: 1, title: 1, type: 1, dueDate: 1, maxScore: 1, submitted: 1, score: 1, submissionsClosed: 1 })
      .sort({ dueDate: 1 })
      .toArray()

    const groups = new Map<string, any>()
    for (const r of rows as any[]) {
      const dueISO = r.dueDate instanceof Date ? r.dueDate.toISOString() : String(r.dueDate)
      const key = `${r.subjectCode}|${r.title}|${dueISO}`
      let group = groups.get(key)
      if (!group) {
        group = {
          subjectCode: r.subjectCode,
          title: r.title,
          type: r.type,
          dueDate: dueISO,
          maxScore: r.maxScore,
          total: 0,
          submitted: 0,
          graded: 0,
          closed: 0,
        }
        groups.set(key, group)
      }
      group.total += 1
      if (r.submitted) group.submitted += 1
      if (r.score !== null && r.score !== undefined) group.graded += 1
      if (r.submissionsClosed === true) group.closed += 1
    }

    return NextResponse.json({ ok: true, groups: Array.from(groups.values()) })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Faculty tasks error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to load tasks.' }, { status: 500 })
  }
}
