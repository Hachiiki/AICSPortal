import { NextRequest, NextResponse } from 'next/server'
import { getStudentByUsername, getCourses, getSessions } from '@/lib/mongodb/queries'
import { getCollection } from '@/lib/mongodb/connection'

// ============================================================
//  Faculty API — GET /api/faculty?username=...
// ============================================================
//
//  Faculty members are stored in the same `students` collection
//  as students (with `role='faculty'`). Their assigned subjects
//  come from the `subjects` collection — every document where
//  `professor === faculty.fullName`. Schedule sessions come
//  from the `sessions` collection (branch-scoped).
//
//  Returns:
//    - faculty: trimmed info about the logged-in faculty member
//    - subjects: every subject enrollment row taught by them
//      (one row per student per subject)
//    - students: unique students enrolled in those subjects
//    - courses / sessions: branch-level schedule data
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get('username')
    if (!username) {
      return NextResponse.json(
        { ok: false, error: 'Username is required.' },
        { status: 400 }
      )
    }

    const faculty = await getStudentByUsername(username)
    if (!faculty) {
      return NextResponse.json(
        { ok: false, error: 'Faculty member not found.' },
        { status: 404 }
      )
    }

    // Subjects are student-scoped (one doc per student per subject).
    // Faculty teaches ALL subjects where `professor === faculty.fullName`.
    // We query the collection directly instead of going through
    // `getSubjectsForStudent` (which is filtered by studentUsername).
    const subjectsCol = await getCollection('subjects')
    const taughtSubjects = await subjectsCol
      .find({
        branch: faculty.branch,
        professor: faculty.fullName,
      })
      .toArray()

    // Courses + sessions are branch-scoped (used for the schedule grid).
    const [courses, sessions] = await Promise.all([
      getCourses(faculty.branch),
      getSessions(faculty.branch),
    ])

    // Unique students enrolled in this faculty's subjects — we look them
    // up from the `students` collection by username so the dashboard can
    // show a roster (full name, student number, program, year, section).
    const studentUsernames = Array.from(
      new Set(taughtSubjects.map((s) => s.studentUsername))
    )
    const studentsCol = await getCollection('students')
    const students = studentUsernames.length
      ? await studentsCol
          .find(
            { branch: faculty.branch, username: { $in: studentUsernames } },
            {
              projection: {
                username: 1,
                fullName: 1,
                studentNumber: 1,
                program: 1,
                yearLevel: 1,
                section: 1,
              },
            }
          )
          .toArray()
      : []

    return NextResponse.json({
      ok: true,
      faculty: {
        username: faculty.username,
        fullName: faculty.fullName,
        firstName: faculty.firstName,
        lastName: faculty.lastName,
        email: faculty.email,
        phone: faculty.phone,
        branch: faculty.branch,
        semester: faculty.semester,
        academicYear: faculty.academicYear,
        role: faculty.role,
      },
      subjects: taughtSubjects.map((s) => ({
        code: s.code,
        title: s.title,
        units: s.units,
        studentUsername: s.studentUsername,
        professor: s.professor,
        professorEmail: s.professorEmail,
        schedule: s.schedule,
        room: s.room,
        midterm: s.midterm,
        finals: s.finals,
        finalGrade: s.finalGrade,
        remarks: s.remarks,
        academicYear: s.academicYear,
        semester: s.semester,
        yearLevel: s.yearLevel,
        status: s.status,
        gradeStatus: s.gradeStatus || 'released',
      })),
      students: students.map((s) => ({
        username: s.username,
        fullName: s.fullName,
        studentNumber: s.studentNumber,
        program: s.program,
        yearLevel: s.yearLevel,
        section: s.section,
      })),
      courses,
      sessions,
    })
  } catch (err) {
    console.error('Faculty API error:', err)
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch faculty data.' },
      { status: 500 }
    )
  }
}
