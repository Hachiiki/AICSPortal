import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCollection } from '@/lib/mongodb/connection'
import { requireCan } from '@/lib/authz'
import { parseBody, parseQuery, errResponse, selfQuerySchema } from '@/lib/validation'
import { HttpError } from '@/lib/http'
import { exportPendingGradeAudits, gradeReleaseAudit, pendingAuditFilter } from '@/lib/mongodb/grade-release-audit'
import type { GradePeriodStatus, MongoSubject } from '@/lib/mongodb/types'

// ---- Zod input schema (the only place release input is shaped) ----
const gradeReleaseSchema = z.object({
  branch: z.string({ error: 'Branch and subjectCode are required.' }).min(1, {
    message: 'Branch and subjectCode are required.',
  }),
  subjectCode: z.string({ error: 'Branch and subjectCode are required.' }).min(1, {
    message: 'Branch and subjectCode are required.',
  }),
  academicYear: z.string().optional(),
  semester: z.string().optional(),
  // Only real periods pass; garbage no longer falls through to the
  // release-all-periods path (old lenient behavior).
  period: z.enum(['prelim', 'midterm', 'finals'], { error: 'Invalid request shape.' }).optional(),
  // FIX-H1a (C3.3): 'unrelease' is the admin correction path — released
  // -> submitted, audited. Omitted or 'release' keeps the default
  // forward transition; existing callers are unchanged (issue #58).
  action: z.enum(['release', 'unrelease'], { error: 'Invalid request shape.' }).optional(),
  // Legacy spoof-check field; identity always comes from the session.
  performedBy: z.string().optional(),
})

const auditRetrySchema = gradeReleaseSchema.pick({ branch: true, performedBy: true })

// POST /api/grades/release
// Body: { branch, subjectCode, academicYear, semester, period?, action?, performedBy }
// ADMIN ONLY: action 'release' (default) moves per-period status
// 'submitted' -> 'released'; once released, that period's grades are
// visible to students. action 'unrelease' (FIX-H1a, C3.3) is the audited
// correction path: 'released' -> 'submitted', same admin role and
// same-branch parity (issue #58).
//
// GET /api/grades/release?username=
// Returns submitted groups awaiting release for the performer's branch:
// [{ subjectCode, title, academicYear, semester, period, count }]
export async function GET(request: NextRequest) {
  try {
    const claimed = parseQuery(request, selfQuerySchema).username
    // C2.5: auth + username-self + admin-role gates centralized
    // (grade.releaseQueue read: the queue belongs to the session
    // admin; the username query field rides the guard's spoof check).
    const {
      ctx: { actor },
    } = await requireCan(request, { kind: 'grade.releaseQueue' }, 'read', {
      claimedIdentity: claimed,
    })
    const username = claimed || actor.username
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
    }
    const col = await getCollection('subjects')
    const [rows, pendingAudit] = await Promise.all([
      col.find({
        branch: actor.branch,
        $or: [{ prelimStatus: 'submitted' }, { midtermStatus: 'submitted' }, { finalsStatus: 'submitted' }],
      })
        .project({ code: 1, title: 1, academicYear: 1, semester: 1, prelimStatus: 1, midtermStatus: 1, finalsStatus: 1 })
        .toArray(),
      col.findOne({ branch: actor.branch, ...pendingAuditFilter }, { projection: { _id: 1 } }),
    ])
    const groups = new Map<string, { subjectCode: string; title: string; academicYear: string; semester: string; period: string; count: number }>()
    for (const r of rows as any[]) {
      for (const period of ['prelim', 'midterm', 'finals'] as const) {
        if (r[`${period}Status`] !== 'submitted') continue
        const key = `${r.code}|${r.academicYear || ''}|${r.semester || ''}|${period}`
        const existing = groups.get(key)
        if (existing) existing.count += 1
        else {
          groups.set(key, {
            subjectCode: r.code,
            title: r.title || '',
            academicYear: r.academicYear || '',
            semester: r.semester || '',
            period,
            count: 1,
          })
        }
      }
    }
    return NextResponse.json({
      ok: true,
      groups: Array.from(groups.values()),
      hasPendingAuditExport: pendingAudit !== null,
    })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Grade pending error.')
    return NextResponse.json({ ok: false, error: 'Failed to load pending releases.' }, { status: 500 })
  }
}
// Retry only the audit export. Released grades stay in their current state.
export async function PATCH(request: NextRequest) {
  try {
    const { branch, performedBy } = await parseBody(request, auditRetrySchema)
    const { ctx } = await requireCan(request, { kind: 'grade.releaseQueue', branch }, 'release', {
      claimedIdentity: performedBy,
    })
    await exportPendingGradeAudits({ branch: ctx.actor.branch })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Grade audit export retry failed.')
    return NextResponse.json({ ok: false, error: 'Could not export grade history. Try again.' }, { status: 503 })
  }
}

const periods = ['prelim', 'midterm', 'finals'] as const

export async function POST(request: NextRequest) {
  try {
    const { branch, subjectCode, academicYear, semester, period, action, performedBy } =
      await parseBody(request, gradeReleaseSchema)
    const releaseAction = action === 'unrelease' ? 'unrelease' : 'release'
    const { ctx } = await requireCan(
      request,
      { kind: 'grade.releaseQueue', branch },
      releaseAction,
      { claimedIdentity: performedBy }
    )

    const subjects = await getCollection<MongoSubject>('subjects')
    const query = {
      branch,
      code: subjectCode,
      ...(academicYear ? { academicYear } : {}),
      ...(semester ? { semester } : {}),
    }
    const from: GradePeriodStatus = releaseAction === 'release' ? 'submitted' : 'released'
    const to = releaseAction === 'release' ? 'released' : 'submitted'
    const selected: readonly (typeof periods)[number][] = period ? [period] : periods
    const statusKeys = { prelim: 'prelimStatus', midterm: 'midtermStatus', finals: 'finalsStatus' } as const
    const statusFilters: Record<string, GradePeriodStatus | null>[] =
      selected.map((item) => ({ [statusKeys[item]]: from }))
    if (!period) {
      statusFilters.push({ prelimStatus: null, midtermStatus: null, finalsStatus: null, gradeStatus: from })
    }
    const candidates: MongoSubject[] = await subjects.find({ ...query, $or: statusFilters }).toArray()
    const performedAt = new Date()
    const writes = candidates.map((row) => {
      const legacy = !period && periods.every((item) => row[statusKeys[item]] == null)
      const affected = selected.filter((item) => (legacy ? row.gradeStatus : row[statusKeys[item]]) === from)
      const statusSnapshot = Object.fromEntries(periods.map((item) => [
        statusKeys[item], row[statusKeys[item]] ?? null,
      ]))
      const affectedValues = Object.fromEntries(affected.map((item) => [item, row[item] ?? null]))
      const events = affected.map((item) => gradeReleaseAudit(row, item, releaseAction, ctx.actor.username, performedAt))
      const statuses = Object.fromEntries(affected.map((item) => [statusKeys[item], to]))
      return {
        updateOne: {
          filter: { ...query, _id: row._id, ...statusSnapshot, ...affectedValues, ...(legacy ? { gradeStatus: from } : {}) },
          update: {
            $set: { ...statuses, gradeStatus: to },
            $push: { pendingReleaseAudits: { $each: events } },
          },
        },
      }
    })
    const result = writes.length ? await subjects.bulkWrite(writes, { ordered: false }) : { modifiedCount: 0 }

    // The transition and pending event are one document write. Retry the
    // export to grade_audits even when this request has no new transitions.
    let auditWarning: string | undefined
    try {
      await exportPendingGradeAudits(query)
    } catch (err) {
      console.error('Grade release audit export pending.')
      auditWarning = 'Grade history was saved with the grade. Export to the audit collection is pending.'
    }

    const operation = releaseAction === 'release' ? 'released to students' : 'unreleased for correction'
    return NextResponse.json({
      ok: true,
      message: result.modifiedCount + ' grade(s) ' + operation + '.',
      modifiedCount: result.modifiedCount,
      ...(auditWarning ? { auditWarning } : {}),
    })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Grade release error.')
    return NextResponse.json({ ok: false, error: 'Failed to complete the grade release. Reload to check the latest grades before retrying.' }, { status: 500 })
  }
}
