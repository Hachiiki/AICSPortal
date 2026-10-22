import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCollection } from '@/lib/mongodb/connection'
import { requireCan } from '@/lib/authz'
import { parseBody, errResponse } from '@/lib/validation'
import { HttpError } from '@/lib/http'

// ---- Zod input schema (the only place submit input is shaped) ----
const gradeSubmitSchema = z.object({
  branch: z.string({ error: 'Branch and subjectCode are required.' }).min(1, {
    message: 'Branch and subjectCode are required.',
  }),
  subjectCode: z.string({ error: 'Branch and subjectCode are required.' }).min(1, {
    message: 'Branch and subjectCode are required.',
  }),
  academicYear: z.string().optional(),
  semester: z.string().optional(),
  // Only real periods pass; garbage no longer falls through to the
  // all-periods path (old lenient behavior).
  period: z.enum(['prelim', 'midterm', 'finals'], { error: 'Invalid request shape.' }).optional(),
  note: z.string().max(2000, { message: 'Invalid request shape.' }).optional(),
  // Legacy spoof-check field; identity always comes from the session.
  performedBy: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const { branch, subjectCode, academicYear, semester, period, note, performedBy } = await parseBody(
      request,
      gradeSubmitSchema
    )
    // C2.5: session, spoof (performedBy), faculty role, and claimed
    // branch parity centralized (grade.submit submit). FIX-C1 (C3.1):
    // the policy requires the subject in the caller's teaching load and
    // the write scope below carries the professor-of-record key, so only
    // the subject's teaching faculty can submit its grades (issue #57).
    const { ctx, scope } = await requireCan(
      request,
      {
        kind: 'grade.submit',
        subjectCode,
        term: { academicYear: academicYear ?? '', semester: semester ?? '' },
        branch,
      },
      'submit',
      { claimedIdentity: performedBy }
    )
    const performedByUser = ctx.actor.username

    const col = await getCollection('subjects')
    const auditCol = await getCollection('grade_audits')
    // Write scope (scopes.ts): branch + code + professor-of-record key
    // (FIX-C1, C3.1) + conditional term keys — the filter only touches
    // rows the actor teaches (issue #57).
    const query = scope.subjectRows(subjectCode, {
      academicYear: academicYear ?? '',
      semester: semester ?? '',
    })

    const periodKey = period === 'prelim' ? 'prelimStatus' : period === 'midterm' ? 'midtermStatus' : period === 'finals' ? 'finalsStatus' : null

    let result
    let auditEntries: any[] = []
    const now = new Date()

    if (periodKey) {
      // Per-period submit: draft -> submitted only for that period
      const docs = await col.find({ ...query, [periodKey]: 'draft' }).toArray()
      result = await col.updateMany(
        { ...query, [periodKey]: 'draft' },
        { $set: { [periodKey]: 'submitted', gradeStatus: 'submitted' } }
      )
      auditEntries = docs.map((d: any) => ({
        branch,
        studentUsername: d.studentUsername,
        subjectCode: d.code,
        academicYear: d.academicYear || academicYear || '',
        semester: d.semester || semester || '',
        period,
        oldValue: d[period as string] || '',
        newValue: d[period as string] || '',
        action: 'submit',
        performedBy: performedByUser,
        performedAt: now,
        note: note || '',
      }))
    } else {
      // All periods: set all three draft -> submitted
      const docs = await col.find({ ...query, $or: [{ prelimStatus: 'draft' }, { midtermStatus: 'draft' }, { finalsStatus: 'draft' }, { gradeStatus: 'draft' }] }).toArray()
      // If no per-period statuses but legacy gradeStatus draft, handle that too
      const orQuery: any = { ...query, $or: [{ prelimStatus: 'draft' }, { midtermStatus: 'draft' }, { finalsStatus: 'draft' }, { gradeStatus: 'draft' }, { prelimStatus: '' }, { midtermStatus: '' }] }
      // Simpler: update any draft
      result = await col.updateMany(
        { ...query, $or: [{ prelimStatus: 'draft' }, { midtermStatus: 'draft' }, { finalsStatus: 'draft' }, { gradeStatus: 'draft' }] },
        { $set: { prelimStatus: 'submitted', midtermStatus: 'submitted', finalsStatus: 'submitted', gradeStatus: 'submitted' } }
      )
      // For legacy docs where per-period is empty but gradeStatus draft, also mark
      if (result.modifiedCount === 0) {
        result = await col.updateMany(
          { ...query, gradeStatus: 'draft' },
          { $set: { prelimStatus: 'submitted', midtermStatus: 'submitted', finalsStatus: 'submitted', gradeStatus: 'submitted' } }
        )
      }
      auditEntries = docs.map((d: any) => ({
        branch,
        studentUsername: d.studentUsername,
        subjectCode: d.code,
        academicYear: d.academicYear || academicYear || '',
        semester: d.semester || semester || '',
        period: 'all',
        oldValue: '',
        newValue: '',
        action: 'submit',
        performedBy: performedByUser,
        performedAt: now,
        note: note || '',
      }))
    }

    if (auditEntries.length > 0) {
      // BUG-011: surface audit failures instead of swallowing them.
      try {
        await auditCol.insertMany(auditEntries)
      } catch (auditErr) {
        console.error('Grade submit audit insert failed:', auditErr)
        return NextResponse.json({
          ok: true,
          message: `${result.modifiedCount} grade(s) submitted for approval.`,
          modifiedCount: result.modifiedCount,
          auditWarning: 'Some grade audits failed to persist. See server logs.',
        })
      }
    }

    return NextResponse.json({
      ok: true,
      message: `${result.modifiedCount} grade(s) submitted for approval.`,
      modifiedCount: result.modifiedCount,
    })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Grade submit error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to submit grades.' }, { status: 500 })
  }
}
