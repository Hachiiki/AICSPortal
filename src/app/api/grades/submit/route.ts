import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/connection'

export async function POST(request: NextRequest) {
  try {
    const { branch, subjectCode, academicYear, semester, period, performedBy, note } = await request.json()

    if (!branch || !subjectCode) {
      return NextResponse.json({ ok: false, error: 'Branch and subjectCode are required.' }, { status: 400 })
    }

    // Auth: performedBy must be faculty in same branch
    if (performedBy) {
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
        performedBy: performedBy || 'unknown',
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
        performedBy: performedBy || 'unknown',
        performedAt: now,
        note: note || '',
      }))
    }

    if (auditEntries.length > 0) {
      try { await auditCol.insertMany(auditEntries) } catch {}
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
