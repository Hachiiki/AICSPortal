import { NextRequest, NextResponse } from 'next/server'
import { getStudentByUsername, getSubjectsForStudent, getCourses, getSessions } from '@/lib/mongodb/queries'
import type { Student } from '@/lib/aics/types'

export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get('username')
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
    }

    const mongoStudent = await getStudentByUsername(username)
    if (!mongoStudent) {
      return NextResponse.json({ ok: false, error: 'Student not found.' }, { status: 404 })
    }

    const [subjects, courses, sessions] = await Promise.all([
      getSubjectsForStudent(mongoStudent.username, mongoStudent.branch),
      getCourses(mongoStudent.branch),
      getSessions(mongoStudent.branch),
    ])

    const student: Student = {
      username: mongoStudent.username,
      role: mongoStudent.role || 'student',
      fullName: mongoStudent.fullName,
      firstName: mongoStudent.firstName, lastName: mongoStudent.lastName,
      middleName: mongoStudent.middleName, photoUrl: mongoStudent.photoUrl,
      studentNumber: mongoStudent.studentNumber, program: mongoStudent.program,
      programShort: mongoStudent.programShort, yearLevel: mongoStudent.yearLevel,
      section: mongoStudent.section, semester: mongoStudent.semester,
      academicYear: mongoStudent.academicYear, enrollmentStatus: mongoStudent.enrollmentStatus,
      deanLister: mongoStudent.deanLister, deanListerSemester: mongoStudent.deanListerSemester,
      gpa: mongoStudent.gpa, email: mongoStudent.email, phone: mongoStudent.phone,
      address: mongoStudent.address, emergencyContactName: mongoStudent.emergencyContactName,
      emergencyContactNumber: mongoStudent.emergencyContactNumber,
      branch: mongoStudent.branch, branchAddress: mongoStudent.branchAddress,
      documents: mongoStudent.documents,
      subjects: subjects.map((x) => ({
        code: x.code, title: x.title, units: x.units, professor: x.professor,
        professorEmail: x.professorEmail, schedule: x.schedule, room: x.room,
        midterm: x.midterm, finals: x.finals, finalGrade: x.finalGrade, remarks: x.remarks,
        academicYear: x.academicYear, semester: x.semester, yearLevel: x.yearLevel, status: x.status,
      })),
      // schedule is an empty array — kept on the type for backward compat.
      // The live weekly schedule is rendered from the `sessions` collection
      // (passed separately in this response) plus the `courses` collection.
      schedule: [],
    }

    return NextResponse.json({ ok: true, student, courses, sessions })
  } catch (err) {
    console.error('Student data error:', err)
    return NextResponse.json({ ok: false, error: 'An error occurred while fetching student data.' }, { status: 500 })
  }
}
