import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCollection } from '@/lib/mongodb/connection'
import { requireCan } from '@/lib/authz'
import { parseBody, parseQuery, errResponse, selfQuerySchema } from '@/lib/validation'
import { HttpError } from '@/lib/http'

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
    const rows = await col
      .find({
        branch: actor.branch,
        $or: [{ prelimStatus: 'submitted' }, { midtermStatus: 'submitted' }, { finalsStatus: 'submitted' }],
      })
      .project({ code: 1, title: 1, academicYear: 1, semester: 1, prelimStatus: 1, midtermStatus: 1, finalsStatus: 1 })
      .toArray()
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
    return NextResponse.json({ ok: true, groups: Array.from(groups.values()) })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Grade pending error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to load pending releases.' }, { status: 500 })
  }
}
export async function POST(request: NextRequest) {
  try {
    const { branch, subjectCode, academicYear, semester, period, action, performedBy } = await parseBody(
      request,
      gradeReleaseSchema
    )
    const releaseAction = action === 'unrelease' ? 'unrelease' : 'release'
    // C2.5: session, spoof (performedBy), admin role, and claimed
    // branch parity centralized (grade.releaseQueue release/unrelease —
    // both actions share the admin role and same-branch parity gate).
    const { ctx } = await requireCan(
      request,
      { kind: 'grade.releaseQueue', branch },
      releaseAction,
      { claimedIdentity: performedBy }
    )
    const performedByUser = ctx.actor.username

    const col = await getCollection('subjects')
    const auditCol = await getCollection('grade_audits')
    const query: Record<string, string> = { branch, code: subjectCode }
    if (academicYear) query.academicYear = academicYear
    if (semester) query.semester = semester

    const periodKey = period === 'prelim' ? 'prelimStatus' : period === 'midterm' ? 'midtermStatus' : period === 'finals' ? 'finalsStatus' : null
    let result
    const now = new Date()
    if (releaseAction === 'unrelease') {
      // FIX-H1a (C3.3): released -> submitted, audited as 'unrelease'.
      // The released guard rides the write filter itself, so only rows
      // actually released move (issue #58).
      if (periodKey) {
        const docs = await col.find({ ...query, [periodKey]: 'released' }).toArray()
        result = await col.updateMany(
          { ...query, [periodKey]: 'released' },
          { $set: { [periodKey]: 'submitted', gradeStatus: 'submitted' } }
        )
        if (docs.length) {
          const audits = docs.map((d: any) => ({
            branch, studentUsername: d.studentUsername, subjectCode: d.code, academicYear: d.academicYear || academicYear || '', semester: d.semester || semester || '', period, oldValue: 'released', newValue: 'submitted', action: 'unrelease', performedBy: performedByUser, performedAt: now,
          }))
          try {
            await auditCol.insertMany(audits)
          } catch (auditErr) {
            console.error('Grade unrelease audit insert failed:', auditErr)
          }
        }
      } else {
        const docs = await col.find({ ...query, $or: [{ prelimStatus: 'released' }, { midtermStatus: 'released' }, { finalsStatus: 'released' }] }).toArray()
        result = await col.updateMany(
          { ...query, $or: [{ prelimStatus: 'released' }, { midtermStatus: 'released' }, { finalsStatus: 'released' }] },
          { $set: { prelimStatus: 'submitted', midtermStatus: 'submitted', finalsStatus: 'submitted', gradeStatus: 'submitted' } }
        )
        if (docs.length) {
          const audits = docs.map((d: any) => ({
            branch, studentUsername: d.studentUsername, subjectCode: d.code, academicYear: d.academicYear || academicYear || '', semester: d.semester || semester || '', period: 'all', oldValue: 'released', newValue: 'submitted', action: 'unrelease', performedBy: performedByUser, performedAt: now,
          }))
          try {
            await auditCol.insertMany(audits)
          } catch (auditErr) {
            console.error('Grade unrelease audit insert failed:', auditErr)
          }
        }
      }
      return NextResponse.json({
        ok: true,
        message: `${result.modifiedCount} grade(s) unreleased for correction.`,
        modifiedCount: result.modifiedCount,
      })
    }
    if (periodKey) {
      const docs = await col.find({ ...query, [periodKey]: 'submitted' }).toArray()
      result = await col.updateMany(
        { ...query, [periodKey]: 'submitted' },
        { $set: { [periodKey]: 'released', gradeStatus: 'released' } }
      )
      if (docs.length) {
        const audits = docs.map((d: any) => ({
          branch, studentUsername: d.studentUsername, subjectCode: d.code, academicYear: d.academicYear || academicYear || '', semester: d.semester || semester || '', period, oldValue: d[period as string] || '', newValue: d[period as string] || '', action: 'release', performedBy: performedByUser, performedAt: now,
        }))
        // BUG-011: log audit failures instead of swallowing.
        try {
          await auditCol.insertMany(audits)
        } catch (auditErr) {
          console.error('Grade release audit insert failed:', auditErr)
        }
      }
    } else {
      const docs = await col.find({ ...query, $or: [{ prelimStatus: 'submitted' }, { midtermStatus: 'submitted' }, { finalsStatus: 'submitted' }, { gradeStatus: 'submitted' }] }).toArray()
      result = await col.updateMany(
        { ...query, $or: [{ prelimStatus: 'submitted' }, { midtermStatus: 'submitted' }, { finalsStatus: 'submitted' }, { gradeStatus: 'submitted' }] },
        { $set: { prelimStatus: 'released', midtermStatus: 'released', finalsStatus: 'released', gradeStatus: 'released' } }
      )
      if (result.modifiedCount === 0) {
        result = await col.updateMany({ ...query, gradeStatus: 'submitted' }, { $set: { prelimStatus: 'released', midtermStatus: 'released', finalsStatus: 'released', gradeStatus: 'released' } })
      }
      if (docs.length) {
        const audits = docs.map((d: any) => ({
          branch, studentUsername: d.studentUsername, subjectCode: d.code, academicYear: d.academicYear || academicYear || '', semester: d.semester || semester || '', period: 'all', oldValue: '', newValue: '', action: 'release', performedBy: performedByUser, performedAt: now,
        }))
        try {
          await auditCol.insertMany(audits)
        } catch (auditErr) {
          console.error('Grade release audit insert failed:', auditErr)
        }
      }
    }

    return NextResponse.json({
      ok: true,
      message: `${result.modifiedCount} grade(s) released to students.`,
      modifiedCount: result.modifiedCount,
    })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Grade release error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to release grades.' }, { status: 500 })
  }
}
