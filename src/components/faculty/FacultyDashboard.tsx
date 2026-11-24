'use client'

import { useMemo } from 'react'
import { CalendarClock, MapPin } from 'lucide-react'
import type { Student, View } from '@/lib/aics/types'
import type { Course, Session } from '@/lib/schedule'
import type { PortalEvent } from '@/lib/aics/events'
import type { Professor } from '@/lib/aics/professors'
import type { Task } from '@/lib/aics/tasks'
import type { NotificationInbox } from '@/lib/aics/notifications'
import type { Announcement } from '@/lib/aics/announcements'
import type { FacultyMember, FacultyStudent } from '@/lib/aics/faculty'
import { PortalShell } from '../portal/PortalShell'
import { AcademicAnnouncements, DashboardSummary, DashboardWelcome } from '../portal/AcademicHeader'
import { DashboardLayout, DashboardSubjectsCard } from '../portal/DashboardLayout'
import { TodayGlance } from '../portal/TodayGlance'
import { DashboardSkeleton } from '../portal/Skeleton'

interface FacultyDashboardProps {
  student: Student
  courses: Course[]
  sessions: Session[]
  onNavigate: (view: View) => void
  onLogout: () => void
  events?: PortalEvent[]
  professors?: Professor[]
  tasks?: Task[]
  announcements?: Announcement[]
  announcementReadIds?: string[]
  facultyData?: { faculty: FacultyMember; subjects: FacultySubject[]; students: FacultyStudent[] } | null
  inbox?: NotificationInbox
  facultyLoading?: boolean
}

interface FacultySubject {
  code: string
  title: string
  units: number
  schedule: string
  room: string
  academicYear?: string
  semester?: string
}

type TeachingSubject = Pick<FacultySubject, 'code' | 'title' | 'units' | 'schedule' | 'room'> & { enrolled: number }

export function FacultyDashboard({
  student, courses, sessions, onNavigate, onLogout, events, professors, tasks,
  announcements, announcementReadIds, facultyData, facultyLoading = true, inbox,
}: FacultyDashboardProps) {
  const faculty = facultyData?.faculty
  const { subjects, myCourses, mySessions } = useMemo(() => {
    const termSubjects = new Map<string, TeachingSubject>()
    for (const subject of facultyData?.subjects ?? []) {
      if ((subject.academicYear || '') !== (faculty?.academicYear || '') || (subject.semester || '') !== (faculty?.semester || '')) continue
      const existing = termSubjects.get(subject.code)
      if (existing) {
        existing.enrolled += 1
      } else {
        const { code, title, units, schedule, room } = subject
        termSubjects.set(code, { code, title, units, schedule, room, enrolled: 1 })
      }
    }
    return {
      subjects: Array.from(termSubjects.values()),
      myCourses: courses.filter(course => termSubjects.has(course.code)),
      mySessions: sessions.filter(session => termSubjects.has(session.code)),
    }
  }, [facultyData, faculty, courses, sessions])

  if (facultyLoading || !faculty) return <DashboardSkeleton />

  const enrolledStudents = facultyData?.students ?? []
  const sectionCount = new Set(enrolledStudents.map(member => member.section).filter(Boolean)).size
  const totalUnits = subjects.reduce((total, subject) => total + subject.units, 0)

  return (
    <PortalShell student={student} active="dashboard" onNavigate={onNavigate} onLogout={onLogout}
      events={events} professors={professors} tasks={tasks} facultyData={facultyData} inbox={inbox}>
      <DashboardLayout
        welcome={<DashboardWelcome firstName={faculty.firstName} semester={faculty.semester} academicYear={faculty.academicYear}>
          {student.program && <><span className="sm:hidden">{student.programShort || student.program}</span><span className="hidden sm:inline">{student.program}</span></>}
        </DashboardWelcome>}
        summary={<DashboardSummary title="Teaching summary" semester={faculty.semester} academicYear={faculty.academicYear}
          stats={[
            { label: 'Students', value: String(enrolledStudents.length) },
            { label: 'Units', value: String(totalUnits) },
            { label: 'Subjects', value: String(subjects.length) },
            { label: 'Sections', value: String(sectionCount) },
          ]}
        />}
        today={<TodayGlance faculty courses={myCourses} sessions={mySessions} announcements={announcements} announcementReadIds={announcementReadIds} onNavigate={onNavigate} />}
        announcements={<AcademicAnnouncements student={student} announcements={announcements} announcementReadIds={announcementReadIds} />}
        subjects={<TeachingSubjects subjects={subjects} />}
        detailsLabel="View my classes"
        onDetails={() => onNavigate('my-students')}
        scheduleId="faculty-schedule"
        courses={myCourses}
        sessions={mySessions}
      />
    </PortalShell>
  )
}

function TeachingSubjects({ subjects }: { subjects: TeachingSubject[] }) {
  return (
    <DashboardSubjectsCard title="My Subjects" detail="Subjects you teach this term">
      {subjects.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-slate-500">
          No subjects assigned yet. Contact the Registrar if this is unexpected.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-slate-100 md:hidden">
            {subjects.map(subject => (
              <li key={subject.code} className="px-4 py-3.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="student-course-code font-mono text-xs font-bold text-link-strong [overflow-wrap:anywhere]">{subject.code}</span>
                  <span className="text-xs text-slate-500">{subject.units} {subject.units === 1 ? 'unit' : 'units'}</span>
                </div>
                <h3 className="student-item-title mt-1 text-sm font-semibold text-slate-900 [overflow-wrap:anywhere]">{subject.title}</h3>
                <div className="student-text-detail mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                  {subject.schedule && <span className="inline-flex items-start gap-1.5"><CalendarClock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />{subject.schedule}</span>}
                  {subject.room && <span className="inline-flex items-start gap-1.5"><MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />{subject.room}</span>}
                </div>
                <p className="mt-2.5 text-xs font-medium text-slate-600">{subject.enrolled} {subject.enrolled === 1 ? 'student' : 'students'}</p>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Code', 'Subject', 'Units', 'Schedule', 'Room', 'Students'].map(label => (
                    <th key={label} scope="col" className="whitespace-nowrap px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subjects.map(subject => (
                  <tr key={subject.code} className="border-b border-slate-100 text-slate-700 last:border-b-0 hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-bold text-link-strong">{subject.code}</td>
                    <td className="px-4 py-3">{subject.title}</td>
                    <td className="px-4 py-3 tabular-nums">{subject.units}</td>
                    <td className="whitespace-nowrap px-4 py-3">{subject.schedule}</td>
                    <td className="whitespace-nowrap px-4 py-3">{subject.room}</td>
                    <td className="px-4 py-3"><span className="inline-flex min-w-7 justify-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-link-strong">{subject.enrolled}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </DashboardSubjectsCard>
  )
}
