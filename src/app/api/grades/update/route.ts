import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/connection'

// PATCH /api/grades/update
// Body: { updates: [{ studentUsername, subjectCode, branch, midterm?, finals?, finalGrade?, remarks? }] }
//
// Updates grades for one or more student-subject pairs.
// Only the fields provided are updated ($set), not the whole document.
//
// GRADE APPROVAL WORKFLOW (not yet implemented):
// Per the project roadmap, grades should follow this flow:
//   1. Teacher saves grades as "draft" (only visible to teacher)
//   2. Teacher submits all grades for a subject (status: "submitted")
//   3. Admin reviews and releases (status: "released")
//   4. Only "released" grades are visible to students
//
// TODO: Add gradeStatus field to subjects collection:
//   gradeStatus: 'draft' | 'submitted' | 'released'
// - This endpoint should set gradeStatus = 'draft' on save
// - Add POST /api/grades/submit to change status to 'submitted'
// - Add POST /api/grades/release (admin only) to change to 'released'
// - Student API (/api/student) should filter: only show grades where
//   gradeStatus === 'released'
// - Faculty grade encoding page shows all grades with status badge
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { updates } = body

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ ok: false, error: 'No updates provided.' }, { status: 400 })
    }

    const col = await getCollection('subjects')
    const results: { ok: boolean; studentUsername: string; subjectCode: string }[] = []

    for (const update of updates) {
      const { studentUsername, subjectCode, branch, midterm, finals, finalGrade, remarks } = update

      if (!studentUsername || !subjectCode || !branch) {
        results.push({ ok: false, studentUsername, subjectCode })
        continue
      }

      // Build the $set object with only provided fields
      const setDoc: Record<string, string> = {}
      if (midterm !== undefined) setDoc.midterm = String(midterm)
      if (finals !== undefined) setDoc.finals = String(finals)
      if (finalGrade !== undefined) setDoc.finalGrade = String(finalGrade)
      if (remarks !== undefined) setDoc.remarks = String(remarks)
      // GRADE APPROVAL WORKFLOW: saving grades sets status to 'draft'
      // so students don't see unsaved/in-progress grades.
      setDoc.gradeStatus = 'draft'

      if (Object.keys(setDoc).length === 0) {
        results.push({ ok: false, studentUsername, subjectCode })
        continue
      }

      const result = await col.updateOne(
        { studentUsername, branch, code: subjectCode },
        { $set: setDoc }
      )

      results.push({
        ok: result.modifiedCount > 0,
        studentUsername,
        subjectCode,
      })
    }

    const successCount = results.filter((r) => r.ok).length
    const failCount = results.filter((r) => !r.ok).length

    return NextResponse.json({
      ok: true,
      message: `${successCount} updated, ${failCount} skipped`,
      results,
    })
  } catch (err) {
    console.error('Grade update error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to update grades.' }, { status: 500 })
  }
}
