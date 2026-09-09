import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/connection'
import { spoofCheck } from '@/lib/session'
import { getAuthedSession as getSession } from '@/lib/session-auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { branch, subjectCode, academicYear, semester, period, note, performedBy } = body
    // Phase 6: writer is the session user; mismatched performedBy is a spoof attempt.
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    const spoof = spoofCheck(session, performedBy)
    if (spoof) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }
    const performedByUser = session.username

    if (!branch || !subjectCode) {
      return NextResponse.json({ ok: false, error: 'Branch and subjectCode are required.' }, { status: 400 })
    }
    // BUG-010: keys reaching Mongo filters must be strings.
    if (typeof branch !== 'string' || typeof subjectCode !== 'string') {
      return NextResponse.json({ ok: false, error: 'Branch and subjectCode are required.' }, { status: 400 })
    }
    if ((academicYear !== undefined && typeof academicYear !== 'string') || (semester !== undefined && typeof semester !== 'string') || (period !== undefined && typeof period !== 'string') || (note !== undefined && typeof note !== 'string')) {
      return NextResponse.json({ ok: false, error: 'Invalid request shape.' }, { status: 400 })
    }

    // Auth: writer must be the session faculty in the same branch.
    {
      const studentsCol = await getCollection('students')
      const performer = await studentsCol.findOne({ username: performedByUser })
      if (!performer || performer.role !== 'faculty') {
        return NextResponse.json({ ok: false, error: 'Unauthorized: faculty only' }, { status: 403 })
      }
      if (performer.branch !== branch) {
        return NextResponse.json({ ok: false, error: 'Branch mismatch' }, { status: 403 })
      }
    }

    const col = await getCollection('subjects')
    const auditCol = await getCollection('grade_audits')
    const query: Record<string, string> = { branch, code: subjectCode }
    if (academicYear) query.academicYear = academicYear
    if (semester) query.semester = semester

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
    console.error('Grade submit error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to submit grades.' }, { status: 500 })
  }
}
