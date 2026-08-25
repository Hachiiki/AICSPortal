import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/connection'

// POST /api/grades/release
// Body: { branch, subjectCode, academicYear, semester }
//
// ADMIN ONLY: Changes gradeStatus from 'submitted' to 'released'.
// Once released, grades are visible to students on their dashboard
// and academics page.
//
// TODO: Add admin role verification when session tokens are implemented.
export async function POST(request: NextRequest) {
  try {
    const { branch, subjectCode, academicYear, semester } = await request.json()

    if (!branch || !subjectCode) {
      return NextResponse.json({ ok: false, error: 'Branch and subjectCode are required.' }, { status: 400 })
    }

    const col = await getCollection('subjects')
    const query: Record<string, string> = { branch, code: subjectCode }
    if (academicYear) query.academicYear = academicYear
    if (semester) query.semester = semester

    const result = await col.updateMany(
      { ...query, gradeStatus: 'submitted' },
      { $set: { gradeStatus: 'released' } }
    )

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
