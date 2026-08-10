'use client'

import { useState } from 'react'
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
  onLogout: () => void
}

/**
 * Main student dashboard. Uses a sidebar + topbar shell, a light
 * academic header, a semantic grades table, a time-grid weekly
 * schedule, and a Today's Classes panel — all driven by the same
 * centralized schedule data in `src/lib/schedule.ts`.
 *
 * Only Dashboard and Profile are functional. All other sidebar nav
 * items are rendered as grayed-out "coming soon" and are non-clickable.
 */
export function StudentDashboard({ student, onProfile, onLogout }: StudentDashboardProps) {
  const [view, setView] = useState<View>('dashboard')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const totalUnits = student.subjects.reduce((sum, s) => sum + s.units, 0)

  // Only 'dashboard' and 'profile' are reachable — the sidebar renders
  // all other nav items as disabled "coming soon".
  const handleNavigate = (v: View) => {
    if (v === 'profile') {
      onProfile()
      return
    }
    setView('dashboard')
  }

  return (
    <div className="min-h-dvh bg-slate-50 font-sans">
      <Sidebar
        active={view}
        onNavigate={handleNavigate}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      {/* Main column — offset by sidebar width on desktop */}
      <div className="lg:pl-60">
        <Topbar
          student={student}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onProfile={onProfile}
          onLogout={onLogout}
        />

        <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 lg:space-y-8">
          <AcademicHeader student={student} totalUnits={totalUnits} />

          <GradesTable student={student} />

          <div className="flex flex-col lg:flex-row gap-4">
            <ScheduleGrid />
            <TodaysClasses />
          </div>
        </main>
      </div>
    </div>
  )
}
