import { NextRequest, NextResponse } from 'next/server'
import {
  getStudentByUsername,
  getSubjectsForStudent,
  getCourses,
  getSessions,
} from '@/lib/mongodb/queries'

// GET /api/student?username=juan.santos
// Returns the full student profile + subjects + courses + sessions
// for the logged-in student's branch.
export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get('username')

    if (!username) {
      return NextResponse.json(
        { ok: false, error: 'Username is required.' },
        { status: 400 }
      )
    }

    const student = await getStudentByUsername(username)

    if (!student) {
      return NextResponse.json(
        { ok: false, error: 'Student not found.' },
        { status: 404 }
      )
    }

    // Fetch all branch-scoped data in parallel
    const [subjects, courses, sessions] = await Promise.all([
      getSubjectsForStudent(student.username, student.branch),
      getCourses(student.branch),
      getSessions(student.branch),
    ])

    return NextResponse.json({
      ok: true,
      student: {
        username: student.username,
        fullName: student.fullName,
        firstName: student.firstName,
        lastName: student.lastName,
        middleName: student.middleName,
        photoUrl: student.photoUrl,
        studentNumber: student.studentNumber,
        program: student.program,
        programShort: student.programShort,
        yearLevel: student.yearLevel,
        section: student.section,
        semester: student.semester,
        academicYear: student.academicYear,
        enrollmentStatus: student.enrollmentStatus,
        deanLister: student.deanLister,
        deanListerSemester: student.deanListerSemester,
        gpa: student.gpa,
        email: student.email,
        phone: student.phone,
        address: student.address,
        emergencyContactName: student.emergencyContactName,
        emergencyContactNumber: student.emergencyContactNumber,
        branch: student.branch,
        branch_name: student.branch_name,
        branchAddress: student.branchAddress,
        documents: student.documents,
        subjects,
      },
      courses,
      sessions,
    })
  } catch (err) {
    console.error('Student data error:', err)
    return NextResponse.json(
      { ok: false, error: 'An error occurred while fetching student data.' },
      { status: 500 }
    )
  }
}
