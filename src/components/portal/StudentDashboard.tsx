'use client'

import { useState, useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import type { Student, View } from '@/lib/aics/types'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { AcademicHeader } from './AcademicHeader'
import { GradesTable } from './GradesTable'
import { ScheduleGrid } from './ScheduleGrid'
import { TodaysClasses } from './TodaysClasses'

interface StudentDashboardProps {
  student: Student
  onProfile: () => void
  onAcademics: () => void
  onLogout: () => void
}

/**
 * Main student dashboard. Shows the current term's grades and schedule.
 * The sidebar includes an "Academics" link to the full academic record.
 */
export function StudentDashboard({ student, onProfile, onAcademics, onLogout }: StudentDashboardProps) {
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

  const handleNavigate = (v: View) => {
    if (v === 'profile') {
      onProfile()
      return
    }
    if (v === 'academics') {
      onAcademics()
      return
    }
    setView('dashboard')
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
          onProfile={onProfile}
          onLogout={onLogout}
        />

        <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 lg:space-y-8">
          <AcademicHeader student={dashboardStudent} totalUnits={totalUnits} />

          <GradesTable student={dashboardStudent} />

          {/* Link to full academic record */}
          <div className="flex justify-end">
            <button
              onClick={onAcademics}
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              View full academic record <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            <ScheduleGrid />
            <TodaysClasses />
          </div>
        </main>
      </div>
    </div>
  )
}
