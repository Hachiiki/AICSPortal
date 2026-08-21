'use client'

import { useState, useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import type { Student, View } from '@/lib/aics/types'
import type { Course, Session } from '@/lib/schedule'
import type { PortalEvent } from '@/lib/aics/events'
import type { Professor } from '@/lib/aics/professors'
import type { Task } from '@/lib/aics/tasks'
import type { Announcement } from '@/lib/aics/announcements'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { AcademicHeader } from './AcademicHeader'
import { GradesTable } from './GradesTable'
import { ScheduleGrid } from './ScheduleGrid'
import { TodaysClasses } from './TodaysClasses'
import { AnnouncementsWidget } from './AnnouncementsWidget'

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
}

/**
 * Main student dashboard. Shows the current term's grades and schedule.
 * The sidebar includes an "Academics" link to the full academic record.
 */
export function StudentDashboard({ student, courses, sessions, onNavigate, onLogout, events, professors, tasks, announcements }: StudentDashboardProps) {
  const [view, setView] = useState<View>('dashboard')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

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

  // Sidebar navigation — just delegate to onNavigate. The parent
  // handles all routing. No per-view branching needed here.
  const handleNavigate = (v: View) => {
    if (v === 'dashboard') {
      setView('dashboard')
      return
    }
    onNavigate(v)
  }

  // Create a student object with only current-term subjects for the dashboard
  const dashboardStudent = { ...student, subjects: currentTermSubjects, gpa: cumulativeGPA }

  return (
    <div className="min-h-dvh bg-slate-50 font-sans">
      <Sidebar
        active={view}
        onNavigate={handleNavigate}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      <div className="lg:pl-60">
        <Topbar
          student={student}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onProfile={() => onNavigate('profile')}
          onLogout={onLogout}
          onNavigate={onNavigate}
          events={events}
          professors={professors}
          tasks={tasks}
        />

        <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 lg:space-y-8">
          <AcademicHeader student={dashboardStudent} totalUnits={totalUnits} />

          {announcements && announcements.length > 0 && (
            <AnnouncementsWidget announcements={announcements} />
          )}


          <GradesTable student={dashboardStudent} />

          {/* Link to full academic record */}
          <div className="flex justify-end">
            <button
              onClick={() => onNavigate('academics')}
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              View full academic record <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            <ScheduleGrid courses={courses} sessions={sessions} />
            <TodaysClasses courses={courses} sessions={sessions} />
          </div>
        </main>
      </div>
    </div>
  )
}
