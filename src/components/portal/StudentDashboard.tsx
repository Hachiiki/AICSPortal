'use client'

import { useState } from 'react'
import { Construction } from 'lucide-react'
import { toast } from 'sonner'
import type { Student, View } from '@/lib/aics/types'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { AcademicHeader } from './AcademicHeader'
import { GradesTable } from './GradesTable'
import { ScheduleGrid } from './ScheduleGrid'
import { TodaysClasses } from './TodaysClasses'
import { WEEKDAYS, type Weekday } from '@/lib/aics/schedule-data'

interface StudentDashboardProps {
  student: Student
  onProfile: () => void
  onLogout: () => void
}

/** Returns the Monday of the week containing `date`. */
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Main student dashboard. Uses a sidebar + topbar shell, a light
 * academic header, a semantic grades table, a time-grid weekly
 * schedule, and a Today's Classes panel — all driven by the same
 * centralized schedule data.
 */
export function StudentDashboard({ student, onProfile, onLogout }: StudentDashboardProps) {
  const [view, setView] = useState<View>('dashboard')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Weekday>(() => {
    // Default to the real weekday if Mon–Sat, else Monday
    const today = new Date().getDay()
    const map: Record<number, Weekday> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' }
    return map[today] ?? 'Mon'
  })
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOfWeek(new Date()))

  // Compute the actual calendar date for the selected day in the selected week
  const selectedDayDate = new Date(weekStart)
  selectedDayDate.setDate(weekStart.getDate() + WEEKDAYS.indexOf(selectedDay))

  const totalUnits = student.subjects.reduce((sum, s) => sum + s.units, 0)

  const handleNavigate = (v: View) => {
    if (v === 'profile') {
      onProfile()
      return
    }
    if (v === 'dashboard') {
      setView('dashboard')
      return
    }
    // Other nav items are not full pages yet — surface a toast so the
    // navigation feels alive without breaking the existing flow.
    setView(v)
    const labels: Record<View, string> = {
      login: '',
      dashboard: '',
      profile: '',
      subjects: 'My Subjects',
      schedule: 'Schedule',
      grades: 'Grades',
      professors: 'Professors',
      enrollment: 'Enrollment',
      documents: 'Documents',
      settings: 'Settings',
      help: 'Help & Support',
    }
    toast.info(`${labels[v]} is coming soon.`)
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
        />

        <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 lg:space-y-8">
          {view === 'dashboard' ? (
            <>
              <AcademicHeader student={student} totalUnits={totalUnits} />

              <GradesTable student={student} onViewAll={() => handleNavigate('grades')} />

              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
                <ScheduleGrid
                  selectedDay={selectedDay}
                  onDayChange={setSelectedDay}
                  weekStart={weekStart}
                  onWeekChange={setWeekStart}
                />
                <TodaysClasses
                  selectedDay={selectedDay}
                  date={selectedDayDate}
                  onViewFull={() => handleNavigate('schedule')}
                />
              </div>
            </>
          ) : (
            <ComingSoon view={view} />
          )}
        </main>
      </div>
    </div>
  )
}

function ComingSoon({ view }: { view: View }) {
  const labels: Record<string, string> = {
    subjects: 'My Subjects',
    schedule: 'Schedule',
    grades: 'Grades',
    professors: 'Professors',
    enrollment: 'Enrollment',
    documents: 'Documents',
    settings: 'Settings',
    help: 'Help & Support',
  }
  const label = labels[view] ?? 'This page'
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
        <Construction className="w-7 h-7 text-slate-500" />
      </div>
      <h2 className="text-lg font-semibold text-slate-900">{label}</h2>
      <p className="mt-1 text-sm text-slate-500 max-w-sm">
        This section is part of the AICS Student Portal roadmap and will be available in a future
        release.
      </p>
    </div>
  )
}
