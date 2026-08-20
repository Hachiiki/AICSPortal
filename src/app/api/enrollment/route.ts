import { NextRequest, NextResponse } from 'next/server'
import { getStudentByUsername, getEnrollment } from '@/lib/mongodb/queries'

export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get('username')
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
    }
    const student = await getStudentByUsername(username)
    if (!student) {
      return NextResponse.json({ ok: false, error: 'Student not found.' }, { status: 404 })
    }
    const enrollment = await getEnrollment(
      student.username,
      student.branch,
      { academicYear: student.academicYear, semester: student.semester }
    )
    if (!enrollment) {
      return NextResponse.json({ ok: false, error: 'No enrollment record found for this term.' }, { status: 404 })
    }
    const clientEnrollment = {
      currentStep: enrollment.currentStep,
      steps: enrollment.steps.map(s => ({ step: s.step, label: s.label, description: s.description, status: s.status, date: s.date })),
      assessment: {
        tuitionPerUnit: enrollment.assessment.tuitionPerUnit,
        totalUnits: enrollment.assessment.totalUnits,
        tuitionAmount: enrollment.assessment.tuitionAmount,
        miscFees: enrollment.assessment.miscFees,
        totalAssessment: enrollment.assessment.totalAssessment,
        amountPaid: enrollment.assessment.amountPaid,
        balance: enrollment.assessment.balance,
        paymentStatus: enrollment.assessment.paymentStatus,
        paymentDeadline: enrollment.assessment.paymentDeadline,
        paymentDate: enrollment.assessment.paymentDate,
      },
      registrar: enrollment.registrar,
      academicYear: enrollment.academicYear,
      semester: enrollment.semester,
    }
    return NextResponse.json({ ok: true, enrollment: clientEnrollment })
  } catch (err) {
    console.error('Enrollment API error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to fetch enrollment data.' }, { status: 500 })
  }
}
