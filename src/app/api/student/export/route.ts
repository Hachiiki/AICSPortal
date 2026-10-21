import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/connection'
import { getAuthedSession as getSession } from '@/lib/session-auth'
import { getStudentByUsername } from '@/lib/mongodb/queries'

// ============================================================
//  Data export (PDPA data-portability / access right).
//
//  GET /api/student/export — exports the signed-in account's own
//  data as a JSON download. Self-only (no username query param):
//  the session user and nobody else. Branch-scoped queries like
//  every other route; passwords / tokenVersion are never included.
//
//  Students receive: profile, subject enrollments (released grades
//  carry values; unreleased periods carry only their status, so
//  exam results never leak ahead of the release queue), tasks,
//  attendance, and notifications. Faculty/admin receive their
//  profile and teaching assignments.
// ============================================================

function profileView(doc: any) {
  // Explicit projection — never password / tokenVersion.
  return {
    username: doc.username,
    role: doc.role || 'student',
    fullName: doc.fullName,
    firstName: doc.firstName,
    lastName: doc.lastName,
    middleName: doc.middleName,
    photoUrl: doc.photoUrl || '',
    studentNumber: doc.studentNumber,
    program: doc.program,
    yearLevel: doc.yearLevel,
    section: doc.section,
    semester: doc.semester,
    academicYear: doc.academicYear,
    enrollmentStatus: doc.enrollmentStatus,
    deanLister: doc.deanLister ?? false,
    deanListerSemester: doc.deanListerSemester || '',
    gpa: doc.gpa ?? null,
    email: doc.email || '',
    phone: doc.phone || '',
    address: doc.address || '',
    emergencyContactName: doc.emergencyContactName || '',
    emergencyContactNumber: doc.emergencyContactNumber || '',
    branch: doc.branch,
    branch_name: doc.branch_name || '',
    branchAddress: doc.branchAddress || '',
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const me = await getStudentByUsername(session.username)
    if (!me) {
      return NextResponse.json({ ok: false, error: 'Account not found.' }, { status: 404 })
    }

    const exportPayload: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      exportedBy: 'AICS Portal · Settings → Privacy & Data',
      account: profileView(me),
    }

    if (session.role === 'student') {
      const [subjectsCol, tasksCol, attendanceCol, notificationsCol] = await Promise.all([
        getCollection('subjects'),
        getCollection('tasks'),
        getCollection('attendance'),
        getCollection('notifications'),
      ])

      const [enrollments, tasks, attendanceDocs, notifications] = await Promise.all([
        subjectsCol
          .find({ branch: session.branch, studentUsername: session.username })
          .project({
            code: 1, title: 1, units: 1, professor: 1, professorEmail: 1, schedule: 1, room: 1,
            academicYear: 1, semester: 1, yearLevel: 1, status: 1,
            prelim: 1, midterm: 1, finals: 1, finalGrade: 1, remarks: 1,
            gradeStatus: 1, prelimStatus: 1, midtermStatus: 1, finalsStatus: 1,
          })
          .toArray(),
        tasksCol
          .find({ branch: session.branch, studentUsername: session.username })
          .project({
            subjectCode: 1, title: 1, type: 1, description: 1, dueDate: 1, postedDate: 1,
            submitted: 1, submittedAt: 1, score: 1, maxScore: 1, feedback: 1,
            submissionsClosed: 1, term: 1,
          })
          .toArray(),
        attendanceCol
          .find({ branch: session.branch, [`records.${session.username}`]: { $exists: true } })
          .project({ sectionKey: 1, date: 1, takenAt: 1, [`records.${session.username}`]: 1 })
          .toArray(),
        notificationsCol
          .find({ branch: session.branch, studentUsername: session.username })
          .project({ title: 1, body: 1, fromName: 1, sectionKey: 1, subjectCode: 1, createdAt: 1, read: 1, readAt: 1 })
          .toArray(),
      ])

      exportPayload.subjectEnrollments = enrollments.map((x: any) => {
        const released = (period: string, status: string | undefined) =>
          status === 'released' ? (x[period] ?? '-') : '(not yet released)'
        return {
          code: x.code,
          title: x.title,
          units: x.units,
          professor: x.professor,
          schedule: x.schedule,
          room: x.room,
          academicYear: x.academicYear,
          semester: x.semester,
          status: x.status,
          // Values only for released periods — unreleased periods are
          // listed by status so the export stays truthful without
          // leaking grades ahead of the release queue.
          prelim: released('prelim', x.prelimStatus ?? x.gradeStatus),
          midterm: released('midterm', x.midtermStatus ?? x.gradeStatus),
          finals: released('finals', x.finalsStatus ?? x.gradeStatus),
          finalGrade: x.gradeStatus === 'released' ? x.finalGrade : '(not yet released)',
          remarks: x.remarks,
        }
      })

      exportPayload.tasks = tasks
      exportPayload.attendance = attendanceDocs.map((d: any) => ({
        sectionKey: d.sectionKey,
        date: d.date,
        status: d.records?.[session.username],
        takenAt: d.takenAt,
      }))
      exportPayload.notifications = notifications
    } else {
      // Faculty / admin: their own teaching assignments (subjects where
      // they are the professor), no student data of others.
      const subjectsCol = await getCollection('subjects')
      const teaching = await subjectsCol
        .find({ branch: session.branch, professor: me.fullName })
        .project({ code: 1, title: 1, units: 1, schedule: 1, room: 1, academicYear: 1, semester: 1, status: 1 })
        .toArray()
      exportPayload.teachingAssignments = teaching
    }

    const filename = `aics-portal-my-data-${session.username}.json`
    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('Data export error:', err)
    return NextResponse.json({ ok: false, error: 'An error occurred while preparing your export.' }, { status: 500 })
  }
}
