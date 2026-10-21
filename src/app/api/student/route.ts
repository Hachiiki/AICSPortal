import { NextRequest, NextResponse } from 'next/server'
import { getStudentByUsername, getSubjectsForStudent, getCourses, getSessions } from '@/lib/mongodb/queries'
import { resolveContext, createRelations, can, decisionToHttpError } from '@/lib/authz'
import { HttpError } from '@/lib/http'
import { parseQuery, selfQuerySchema, errResponse } from "@/lib/validation"
import type { Student } from '@/lib/aics/types'

export async function GET(request: NextRequest) {
  try {
    // C2.2: canonical actor off the DB doc (role and branch never come
    // from the JWT claim; the FIX-M2 flip rides here, issue #62).
    // FIX-L1 (C3.8, issue #65): the policy gate now runs BEFORE the
    // student lookup — the 404 oracle is closed. Absent usernames deny
    // identically to cross-branch ones (notOwner 403 via
    // sameBranchUsername), so an unauthorized caller cannot distinguish
    // exists-elsewhere from never-existed. The 404 below is post-gate
    // defense in depth; an allowed reader has already verified existence
    // (self is the session actor; staff passed sameBranchUsername).
    const ctx = await resolveContext(request)
    if (!ctx) throw new HttpError(401, 'Unauthorized')
    const rel = createRelations(ctx)

    const username = parseQuery(request, selfQuerySchema).username || ctx.actor.username
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
    }

    // C2.2: staff-read gate centralized (student.profile read: self, or
    // same-branch faculty/admin with the DB role).
    const gate = decisionToHttpError(
      await can(ctx, rel, { kind: 'student.profile', username }, 'read')
    )
    if (gate) throw gate

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
      subjects: subjects.map((x) => {
        const prelimStatus = (x as any).prelimStatus ?? x.gradeStatus
        const midtermStatus = (x as any).midtermStatus ?? x.gradeStatus
        const finalsStatus = (x as any).finalsStatus ?? x.gradeStatus
        // Per-period workflow: each period visible only when its status is 'released'.
        // '' / draft / submitted → hidden as '-' / Pending.
        // FIX-A5 (C3.13, issue #70): finalGrade and remarks need ALL THREE
        // periods released — the legacy gradeStatus field alone no longer
        // exposes them after a single-period release. The legacy field
        // itself stays on the documents for backward compatibility.
        const allReleased =
          prelimStatus === 'released' && midtermStatus === 'released' && finalsStatus === 'released'
        return {
          code: x.code, title: x.title, units: x.units, professor: x.professor,
          professorEmail: x.professorEmail, schedule: x.schedule, room: x.room,
          prelim: prelimStatus === 'released' ? (x.prelim ?? '-') : '-',
          midterm: midtermStatus === 'released' ? x.midterm : '-',
          finals: finalsStatus === 'released' ? x.finals : '-',
          finalGrade: allReleased ? x.finalGrade : '-',
          remarks: allReleased ? x.remarks : 'Pending',
          academicYear: x.academicYear, semester: x.semester, yearLevel: x.yearLevel, status: x.status,
        }
      }),
      // schedule is an empty array — kept on the type for backward compat.
      // The live weekly schedule is rendered from the `sessions` collection
      // (passed separately in this response) plus the `courses` collection.
      schedule: [],
    }

    return NextResponse.json({ ok: true, student, courses, sessions })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Student data error:', err)
    return NextResponse.json({ ok: false, error: 'An error occurred while fetching student data.' }, { status: 500 })
  }
}
