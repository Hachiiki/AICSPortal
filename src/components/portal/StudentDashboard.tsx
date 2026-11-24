'use client'

import { useMemo } from 'react'
import type { Student, View } from '@/lib/aics/types'
import type { Course, Session } from '@/lib/schedule'
import type { PortalEvent } from '@/lib/aics/events'
import type { Professor } from '@/lib/aics/professors'
import type { Task } from '@/lib/aics/tasks'
import type { NotificationInbox } from '@/lib/aics/notifications'
import type { Announcement } from '@/lib/aics/announcements'
import { PortalShell } from './PortalShell'
import { AcademicHeader, AcademicAnnouncements, AcademicTermStats } from './AcademicHeader'
import { GradesTable } from './GradesTable'
import { DashboardLayout } from './DashboardLayout'
import { TodayGlance } from './TodayGlance'
import { StudentGettingStarted } from '@/components/onboarding/StudentOnboarding'

interface StudentDashboardProps {
  student: Student
  courses: Course[]
  sessions: Session[]
  onNavigate: (view: View) => void
  onLogout: () => void
  // Search index collections — lifted in the parent so the
  // Topbar's global search works the same on every screen.
  events?: PortalEvent[]
  professors?: Professor[]
  tasks?: Task[]
  announcements?: Announcement[]
  announcementReadIds?: string[]
  inbox?: NotificationInbox
}

/**
 * Main student dashboard. Shows the current term's grades and schedule.
 * The sidebar includes an "Academics" link to the full academic record.
 */
export function StudentDashboard({ student, courses, sessions, onNavigate, onLogout, events, professors, tasks, announcements, announcementReadIds, inbox }: StudentDashboardProps) {
  // Filter to current-term subjects + compute derived values
  const { currentTermSubjects, totalUnits, cumulativeGPA } = useMemo(() => {
    const current = student.subjects.filter((s) => {
      return s.academicYear === student.academicYear && s.semester === student.semester
    })
    const units = current.reduce((sum, s) => sum + s.units, 0)
    const completed = student.subjects.filter((s) => s.status !== 'in-progress' && parseFloat(s.finalGrade) > 0)
    let tu = 0
    let ws = 0
    for (const s of completed) {
      const grade = parseFloat(s.finalGrade)
      if (!isNaN(grade)) {
        tu += s.units
        ws += grade * s.units
      }
    }
    const gpa = tu > 0 ? (ws / tu).toFixed(2) : student.gpa
    return { currentTermSubjects: current, totalUnits: units, cumulativeGPA: gpa }
  }, [student])

  // Create a student object with only current-term subjects for the dashboard
  const dashboardStudent = { ...student, subjects: currentTermSubjects, gpa: cumulativeGPA }

  return (
    <PortalShell
      student={student}
      active="dashboard"
      onNavigate={onNavigate}
      onLogout={onLogout}
      events={events}
      professors={professors}
      tasks={tasks}
      inbox={inbox}
    >
      <DashboardLayout
        welcome={<AcademicHeader student={dashboardStudent} />}
        summary={<AcademicTermStats student={dashboardStudent} totalUnits={totalUnits} />}
        today={<TodayGlance courses={courses} sessions={sessions} tasks={tasks} announcements={announcements} announcementReadIds={announcementReadIds} onNavigate={onNavigate} />}
        gettingStarted={<StudentGettingStarted />}
        announcements={<AcademicAnnouncements student={student} announcements={announcements} announcementReadIds={announcementReadIds} />}
        subjects={<GradesTable student={dashboardStudent} />}
        detailsLabel="View full academic record"
        onDetails={() => onNavigate('academics')}
        scheduleId="student-schedule"
        courses={courses}
        sessions={sessions}
      />
    </PortalShell>
  )
}
