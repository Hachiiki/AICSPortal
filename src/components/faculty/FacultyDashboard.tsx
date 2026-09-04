'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Users, LayoutGrid } from 'lucide-react'
import type { Student, View } from '@/lib/aics/types'
import type { Course, Session } from '@/lib/schedule'
import type { PortalEvent } from '@/lib/aics/events'
import type { Professor } from '@/lib/aics/professors'
import type { Task } from '@/lib/aics/tasks'
import type { Announcement } from '@/lib/aics/announcements'
import type { FacultyMember, FacultyStudent } from '@/lib/aics/faculty'
import { PortalShell } from '../portal/PortalShell'
import { AnnouncementsDeck } from '../portal/AnnouncementsDeck'
import { DashboardSkeleton } from '../portal/Skeleton'

// ============================================================
//  FacultyDashboard
// ============================================================
//  Main faculty landing page. The faculty member's basic info
//  is carried in the `student` prop (faculty are stored in the
//  `students` collection, so /api/student returns them in the
//  same Student shape — Topbar / Profile / Settings can all be
//  reused unchanged).
//
//  The faculty-specific bits (subjects they teach + the roster
//  of students enrolled in those subjects) are fetched in-band
//  from /api/faculty and stored in local state. While that fetch
//  is in flight we render the shared DashboardSkeleton so the
//  chrome stays visible.
//
//  Layout mirrors the student dashboard:
//    - PortalShell with faculty nav
//    - Topbar (with global search)
//    - Hero (eyebrow + welcome + program subtitle + stats)
//    - "My Subjects" table card
//    - Announcements deck (swipeable)
// ============================================================

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
  // Faculty-specific data lifted to parent so it persists across route switches
  facultyData?: { faculty: FacultyMember; subjects: any[]; students: FacultyStudent[] } | null
  facultyLoading?: boolean
}

interface FacultyApiSubject {
  code: string
  title: string
  units: number
  studentUsername: string
  professor: string
  professorEmail: string
  schedule: string
  room: string
  midterm: string
  finals: string
  finalGrade: string
  remarks: string
  academicYear?: string
  semester?: string
  yearLevel?: string
  status?: string
}

/** One row in the "My Subjects" table — collapsed across students. */
interface FacultySubjectRow {
  code: string
  title: string
  units: number
  schedule: string
  room: string
  enrolled: number
}

export function FacultyDashboard({
  student,
  courses,
  sessions,
  onNavigate,
  onLogout,
  events,
  professors,
  tasks,
  announcements,
  facultyData,
  facultyLoading,
}: FacultyDashboardProps) {
  // Faculty data comes from the parent (lifted state), not an internal fetch.
  // This prevents re-fetching when navigating between dashboard and my-students.
  const faculty = facultyData?.faculty ?? null
  const taughtSubjects: FacultyApiSubject[] = facultyData?.subjects ?? []
  const enrolledStudents: FacultyStudent[] = facultyData?.students ?? []
  const loading = facultyLoading ?? true

  // ----------------------------------------------------------
  //  Group subjects by code so each row is a unique subject
  //  with the count of enrolled students. We intentionally
  //  don't filter by academicYear/semester here — the seed
  //  currently only has current-term rows, and faculty want
  //  to see everything they're teaching this term.
  // ----------------------------------------------------------
  const subjectRows = useMemo<FacultySubjectRow[]>(() => {
    const map = new Map<string, FacultySubjectRow>()
    for (const s of taughtSubjects) {
      const existing = map.get(s.code)
      if (existing) {
        existing.enrolled += 1
        continue
      }
      map.set(s.code, {
        code: s.code,
        title: s.title,
        units: s.units,
        schedule: s.schedule,
        room: s.room,
        enrolled: 1,
      })
    }
    return Array.from(map.values())
  }, [taughtSubjects])

  // Unique sections taught (e.g. "CS-2A", "CS-2B"). We derive
  // these from the enrolled students' `section` field.
  const sectionCount = useMemo(
    () =>
      new Set(
        enrolledStudents.map((s) => s.section).filter((x) => x && x.length > 0)
      ).size,
    [enrolledStudents]
  )

  // Show the skeleton while the faculty-specific data is loading.
  // The student data (used by Topbar) is already resolved by the
  // parent wrapper before this component is mounted.
  if (loading || !faculty) {
    return <DashboardSkeleton />
  }

  return (
    <PortalShell
      student={student}
      active="dashboard"
      onNavigate={onNavigate}
      onLogout={onLogout}
      events={events}
      professors={professors}
      tasks={tasks}
    >
        <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 lg:space-y-8">
          {/* Hero — adapted from AcademicHeader */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="flex flex-col lg:flex-row gap-6 lg:gap-8 lg:items-start"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-slate-500">
                {faculty.semester} &bull; AY {faculty.academicYear}
              </p>
              <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-blue-950">
                Welcome back, {faculty.firstName}!
              </h1>
              <p className="mt-1.5 text-sm text-slate-600">
                {student.program}
              </p>

              {/* Stats row */}
              <div className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-4">
                <Stat
                  label="Subjects"
                  value={String(subjectRows.length)}
                  icon={BookOpen}
                />
                <Divider />
                <Stat
                  label="Students"
                  value={String(enrolledStudents.length)}
                  icon={Users}
                />
                <Divider />
                <Stat
                  label="Sections"
                  value={String(sectionCount)}
                  icon={LayoutGrid}
                />
              </div>
            </div>

            {/* Announcements deck — reuses the student component unchanged */}
            {announcements && announcements.length > 0 && (
              <AnnouncementsDeck announcements={announcements} />
            )}
          </motion.section>

          {/* My Subjects table */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
            className="bg-white rounded-xl border border-slate-200 shadow-sm"
          >
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">
                My Subjects
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Subjects you are teaching this term &bull; enrolled students per section
              </p>
            </div>

            {subjectRows.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-slate-500">
                  No subjects assigned yet. Contact the Registrar if this is unexpected.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <Th>Code</Th>
                      <Th>Subject</Th>
                      <Th center>Units</Th>
                      <Th>Schedule</Th>
                      <Th>Room</Th>
                      <Th center>Students</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectRows.map((row) => (
                      <tr
                        key={row.code}
                        className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60"
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-bold text-blue-700">
                            {row.code}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-700">{row.title}</span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-slate-700">
                          {row.units}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-700">{row.schedule}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-700">{row.room}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                            {row.enrolled}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.section>
        </main>
    </PortalShell>
  )
}

// ------------------------------------------------------------
//  Hero stat — label above value, with an optional leading icon.
// ------------------------------------------------------------

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <div className="mt-0.5 flex items-center gap-1.5">
        {Icon && <Icon className="w-4 h-4 text-blue-700" />}
        <p className="text-xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  )
}

function Divider() {
  return <div className="hidden sm:block w-px h-8 bg-slate-200" aria-hidden="true" />
}

function Th({
  children,
  center,
}: {
  children: React.ReactNode
  center?: boolean
}) {
  return (
    <th
      className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 ${
        center ? 'text-center' : 'text-left'
      }`}
    >
      {children}
    </th>
  )
}
