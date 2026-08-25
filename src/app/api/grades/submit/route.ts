import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/connection'

// POST /api/grades/submit
// Body: { branch, subjectCode, academicYear, semester }
//
// Changes gradeStatus from 'draft' to 'submitted' for ALL student-subject
// records matching the given subject + term. This is the teacher saying
// "I'm done encoding grades for this subject, please review."
//
// Once submitted, the teacher can no longer edit grades (the UI should
// disable inputs). An admin must release them.
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
      { ...query, gradeStatus: 'draft' },
      { $set: { gradeStatus: 'submitted' } }
    )

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
