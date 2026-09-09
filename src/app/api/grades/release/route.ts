import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/connection'

// POST /api/grades/release
// Body: { branch, subjectCode, academicYear, semester, period?, performedBy }
// ADMIN ONLY: Changes per-period status from 'submitted' to 'released'.
// Once released, that period's grades are visible to students.
//
// GET /api/grades/release?username=
// Returns submitted groups awaiting release for the performer's branch:
// [{ subjectCode, title, academicYear, semester, period, count }]
export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get('username')
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
    }
    const studentsCol = await getCollection('students')
    const performer = await studentsCol.findOne({ username })
    if (!performer || performer.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Unauthorized: admin only' }, { status: 403 })
    }
    const col = await getCollection('subjects')
    const rows = await col
      .find({
        branch: performer.branch,
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
    console.error('Grade pending error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to load pending releases.' }, { status: 500 })
  }
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { branch, subjectCode, academicYear, semester, period, performedBy } = body

    if (!branch || !subjectCode) {
      return NextResponse.json({ ok: false, error: 'Branch and subjectCode are required.' }, { status: 400 })
    }
    // BUG-010: keys reaching Mongo filters must be strings.
    if (typeof branch !== 'string' || typeof subjectCode !== 'string') {
      return NextResponse.json({ ok: false, error: 'Branch and subjectCode are required.' }, { status: 400 })
    }
    if ((academicYear !== undefined && typeof academicYear !== 'string') || (semester !== undefined && typeof semester !== 'string') || (period !== undefined && typeof period !== 'string') || (typeof performedBy !== 'string' && performedBy !== undefined)) {
      return NextResponse.json({ ok: false, error: 'Invalid request shape.' }, { status: 400 })
    }

    // Auth: admin only, and the performer must be named. An unnamed
    // release is rejected instead of recorded as 'unknown'.
    if (!performedBy) {
      return NextResponse.json({ ok: false, error: 'Unauthorized: performedBy is required' }, { status: 403 })
    }
    const studentsCol = await getCollection('students')
    const performer = await studentsCol.findOne({ username: performedBy })
    if (!performer || performer.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Unauthorized: admin only' }, { status: 403 })
    }
    // BUG-008 context: enforce branch parity like tasks/announcements (cross-branch gap was code-confirmed).
    if (performer.branch !== branch) {
      return NextResponse.json({ ok: false, error: 'Branch mismatch' }, { status: 403 })
    }

    const col = await getCollection('subjects')
    const auditCol = await getCollection('grade_audits')
    const query: Record<string, string> = { branch, code: subjectCode }
    if (academicYear) query.academicYear = academicYear
    if (semester) query.semester = semester

    const periodKey = period === 'prelim' ? 'prelimStatus' : period === 'midterm' ? 'midtermStatus' : period === 'finals' ? 'finalsStatus' : null
    let result
    const now = new Date()
    if (periodKey) {
      const docs = await col.find({ ...query, [periodKey]: 'submitted' }).toArray()
      result = await col.updateMany(
        { ...query, [periodKey]: 'submitted' },
        { $set: { [periodKey]: 'released', gradeStatus: 'released' } }
      )
      if (docs.length) {
        const audits = docs.map((d: any) => ({
          branch, studentUsername: d.studentUsername, subjectCode: d.code, academicYear: d.academicYear || academicYear || '', semester: d.semester || semester || '', period, oldValue: d[period as string] || '', newValue: d[period as string] || '', action: 'release', performedBy: performedBy || 'unknown', performedAt: now,
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
          branch, studentUsername: d.studentUsername, subjectCode: d.code, academicYear: d.academicYear || academicYear || '', semester: d.semester || semester || '', period: 'all', oldValue: '', newValue: '', action: 'release', performedBy: performedBy || 'unknown', performedAt: now,
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
    console.error('Grade release error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to release grades.' }, { status: 500 })
  }
}
