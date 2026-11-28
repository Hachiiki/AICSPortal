import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCollection } from '@/lib/mongodb/connection'
import { requireCan, professorOwnership } from '@/lib/authz'
import { parseQuery, errResponse } from '@/lib/validation'
import { HttpError } from '@/lib/http'
import type { MongoGradeAudit, MongoSubject } from '@/lib/mongodb/types'

// ---- Zod input schema (the only place audit-filter input is shaped) ----
// limit: 1-200 whole number, default 50; junk silently reads as 50
// (the old parseInt path leaked NaN into .limit()).
const auditsGetQuerySchema = z.object({
  username: z.string().optional(),
  branch: z.string().optional(),
  subjectCode: z.string().optional(),
  studentUsername: z.string().optional(),
  academicYear: z.string().optional(),
  semester: z.string().optional(),
  limit: z.preprocess(
    (v) => (v === undefined ? 50 : v),
    z.coerce.number().int().min(1).max(200).catch(50)
  ),
})

export async function GET(request: NextRequest) {
  try {
    const { username, branch, subjectCode, studentUsername, academicYear, semester, limit } = parseQuery(
      request,
      auditsGetQuerySchema
    )
    const {
      ctx: { actor },
    } = await requireCan(
      request,
      { kind: 'grade.audits', subjectCode, studentUsername },
      'read',
      { claimedIdentity: username }
    )
    if (branch && branch !== actor.branch) {
      return NextResponse.json({ ok: false, error: 'Branch mismatch' }, { status: 403 })
    }

    const term = {
      ...(academicYear === undefined ? {} : { academicYear: academicYear || { $in: ['', null] } }),
      ...(semester === undefined ? {} : { semester: semester || { $in: ['', null] } }),
    }
    const base = { branch: actor.branch, ...term, ...(studentUsername ? { studentUsername } : {}) }
    const subjects = await getCollection('subjects')
    const subjectQuery = {
      ...base,
      ...(subjectCode ? { code: subjectCode } : {}),
      ...(actor.role === 'faculty' ? professorOwnership(actor.username) : {}),
    }
    const query: Record<string, unknown> = { ...base, ...(subjectCode ? { subjectCode } : {}) }

    if (actor.role === 'faculty') {
      // Exported audits have no professor field. Link each audit to the
      // exact student, subject, and term that the faculty member owns.
      const rows: Pick<MongoSubject, 'code' | 'studentUsername' | 'academicYear' | 'semester'>[] = await subjects
        .find(subjectQuery)
        .project({ code: 1, studentUsername: 1, academicYear: 1, semester: 1 })
        .toArray()
      const roster = rows.filter((row) => row.code && row.studentUsername)
      if (!roster.length) {
        return NextResponse.json({ ok: true, audits: [] })
      }
      query.$or = roster.map((row) => ({
        subjectCode: row.code,
        studentUsername: row.studentUsername,
        academicYear: row.academicYear || { $in: ['', null] },
        semester: row.semester || { $in: ['', null] },
      }))
    }

    const pending: MongoGradeAudit[] = await subjects.aggregate([
      { $match: {
        ...subjectQuery,
        'pendingReleaseAudits.0': { $exists: true },
      } },
      { $unwind: '$pendingReleaseAudits' },
      { $replaceWith: '$pendingReleaseAudits' },
      { $sort: { performedAt: -1 } },
      { $limit: limit },
    ]).toArray()
    const col = await getCollection<MongoGradeAudit>('grade_audits')
    const exported: MongoGradeAudit[] = await col.find(query).sort({ performedAt: -1 }).limit(limit).toArray()
    const audits = Array.from(new Map([...pending, ...exported].map((entry) => [String(entry._id), entry])).values())
      .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())
      .slice(0, limit)

    return NextResponse.json({ ok: true, audits })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Grade audits error.')
    return NextResponse.json({ ok: false, error: 'Failed to fetch audits.' }, { status: 500 })
  }
}
