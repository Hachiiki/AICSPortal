import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/connection'
import { asString, HttpError } from '@/lib/http'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { branch, subjectCode, academicYear, semester, period, note } = body
    // BUG-002: performedBy required (matches release). BUG-010: must be a string pre-query.
    let performedBy: string
    try {
      performedBy = asString(body?.performedBy, 'performedBy')
    } catch (e) {
      if (e instanceof HttpError) {
        return NextResponse.json({ ok: false, error: 'Unauthorized: performedBy is required' }, { status: 403 })
      }
      throw e
    }

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

    // Auth: performedBy must be faculty in same branch (now required, not optional).
    {
      const studentsCol = await getCollection('students')
      const performer = await studentsCol.findOne({ username: performedBy })
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
        performedBy,
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
        performedBy,
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
