import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/connection'
import { requireCan } from '@/lib/authz'
import { HttpError } from '@/lib/http'
import { parseQuery, selfQuerySchema, errResponse } from "@/lib/validation"
import type { MongoSubject } from "@/lib/mongodb/types"

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
    const claimed = parseQuery(request, selfQuerySchema).username
    const {
      ctx: { actor },
      scope,
    } = await requireCan(request, { kind: 'task.board' }, 'read', {
      claimedIdentity: claimed,
    })

    const subjectsCol = await getCollection('subjects')
    const taught: Pick<MongoSubject, 'code' | 'academicYear' | 'semester' | 'studentUsername'>[] = await subjectsCol
      .find(scope.teachingLoad())
      .project({ code: 1, academicYear: 1, semester: 1, studentUsername: 1 })
      .toArray()
    const rosters = new Map<string, Set<string>>()
    for (const row of taught) {
      if ((row.academicYear || '') !== actor.academicYear || (row.semester || '') !== actor.semester || !row.studentUsername) continue
      const students = rosters.get(row.code) ?? new Set<string>()
      students.add(row.studentUsername)
      rosters.set(row.code, students)
    }
    if (rosters.size === 0) {
      return NextResponse.json({ ok: true, groups: [] })
    }

    const tasksCol = await getCollection('tasks')
    const rows = await tasksCol
      .find({
        ...scope.branchDocs(),
        $or: Array.from(rosters, ([subjectCode, students]) => ({ subjectCode, studentUsername: { $in: [...students] } })),
        'term.academicYear': actor.academicYear,
        'term.semester': actor.semester,
      })
      .project({ subjectCode: 1, assignmentId: 1, title: 1, type: 1, dueDate: 1, postedDate: 1, maxScore: 1, submitted: 1, score: 1, submissionsClosed: 1 })
      .sort({ dueDate: 1 })
      .toArray()

    const groups = new Map<string, any>()
    for (const r of rows as any[]) {
      const dueISO = r.dueDate instanceof Date ? r.dueDate.toISOString() : String(r.dueDate)
      const postedDate = r.postedDate instanceof Date ? r.postedDate.toISOString() : r.postedDate
      const key = r.assignmentId ?? JSON.stringify([r.subjectCode, r.title, dueISO, postedDate])
      let group = groups.get(key)
      if (!group) {
        group = {
          key,
          assignmentId: r.assignmentId,
          postedDate,
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
    console.error('Faculty tasks error.')
    return NextResponse.json({ ok: false, error: 'Failed to load tasks.' }, { status: 500 })
  }
}
