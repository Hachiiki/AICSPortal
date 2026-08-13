import { NextRequest, NextResponse } from 'next/server'
import { getStudentByUsername, getSubjectsForStudent, getCourses, getSessions } from '@/lib/mongodb/queries'
import { TEST_STUDENT } from '@/lib/aics/mock-data'
import { COURSES, SESSIONS } from '@/lib/schedule'
import type { Student } from '@/lib/aics/types'

export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get('username')
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
    }

    let student: Student
    let courses
    let sessions

    try {
      const mongoStudent = await getStudentByUsername(username)
      if (!mongoStudent) {
        return NextResponse.json({ ok: false, error: 'Student not found.' }, { status: 404 })
      }
      const [s, c, sess] = await Promise.all([
        getSubjectsForStudent(mongoStudent.username, mongoStudent.branch),
        getCourses(mongoStudent.branch),
        getSessions(mongoStudent.branch),
      ])
      student = {
        username: mongoStudent.username, fullName: mongoStudent.fullName,
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
        subjects: s.map((x) => ({ code: x.code, title: x.title, units: x.units, professor: x.professor, professorEmail: x.professorEmail, schedule: x.schedule, room: x.room, midterm: x.midterm, finals: x.finals, finalGrade: x.finalGrade, remarks: x.remarks })),
        schedule: [],
      }
      courses = c
      sessions = sess
    } catch (mongoErr) {
      console.error('MongoDB failed, mock fallback:', mongoErr)
      if (username === 'juan.santos') {
        student = TEST_STUDENT
        courses = COURSES
        sessions = SESSIONS
      } else {
        return NextResponse.json({ ok: false, error: 'Student not found.' }, { status: 404 })
      }
    }

    return NextResponse.json({ ok: true, student, courses, sessions })
  } catch (err) {
    console.error('Student data error:', err)
    return NextResponse.json({ ok: false, error: 'An error occurred while fetching student data.' }, { status: 500 })
  }
}
