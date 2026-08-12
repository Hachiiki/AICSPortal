import { NextRequest, NextResponse } from 'next/server'
import {
  getStudentByUsername,
  getSubjectsForStudent,
  getCourses,
  getSessions,
} from '@/lib/mongodb/queries'
import type { Student } from '@/lib/aics/types'

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

    const mongoStudent = await getStudentByUsername(username)

    if (!mongoStudent) {
      return NextResponse.json(
        { ok: false, error: 'Student not found.' },
        { status: 404 }
      )
    }

    // Fetch all branch-scoped data in parallel
    const [subjects, courses, sessions] = await Promise.all([
      getSubjectsForStudent(mongoStudent.username, mongoStudent.branch),
      getCourses(mongoStudent.branch),
      getSessions(mongoStudent.branch),
    ])

    // Construct the Student-shaped response object.
    // The MongoStudent does NOT have `subjects` or `schedule` —
    // subjects are fetched from a separate collection and merged
    // here. `schedule` is not used by the current dashboard
    // (the calendar reads from src/lib/schedule.ts directly),
    // so we pass an empty array to satisfy the Student type.
    const student: Student = {
      username: mongoStudent.username,
      fullName: mongoStudent.fullName,
      firstName: mongoStudent.firstName,
      lastName: mongoStudent.lastName,
      middleName: mongoStudent.middleName,
      photoUrl: mongoStudent.photoUrl,
      studentNumber: mongoStudent.studentNumber,
      program: mongoStudent.program,
      programShort: mongoStudent.programShort,
      yearLevel: mongoStudent.yearLevel,
      section: mongoStudent.section,
      semester: mongoStudent.semester,
      academicYear: mongoStudent.academicYear,
      enrollmentStatus: mongoStudent.enrollmentStatus,
      deanLister: mongoStudent.deanLister,
      deanListerSemester: mongoStudent.deanListerSemester,
      gpa: mongoStudent.gpa,
      email: mongoStudent.email,
      phone: mongoStudent.phone,
      address: mongoStudent.address,
      emergencyContactName: mongoStudent.emergencyContactName,
      emergencyContactNumber: mongoStudent.emergencyContactNumber,
      branch: mongoStudent.branch,
      branchAddress: mongoStudent.branchAddress,
      documents: mongoStudent.documents,
      subjects: subjects.map((s) => ({
        code: s.code,
        title: s.title,
        units: s.units,
        professor: s.professor,
        professorEmail: s.professorEmail,
        schedule: s.schedule,
        room: s.room,
        midterm: s.midterm,
        finals: s.finals,
        finalGrade: s.finalGrade,
        remarks: s.remarks,
      })),
      schedule: [], // not used — calendar reads from src/lib/schedule.ts
    }

    return NextResponse.json({
      ok: true,
      student,
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
