'use client'

import { Award, GraduationCap, CalendarDays, CheckCircle2 } from 'lucide-react'
import type { Student } from '@/lib/aics/types'
import { PALETTE } from '@/lib/aics/palette'
import { PortalNavbar } from './PortalNavbar'
import { WeeklyScheduleGrid } from './WeeklyScheduleGrid'

interface StudentDashboardProps {
  student: Student
  onProfile: () => void
  onLogout: () => void
}

/**
 * The main student dashboard. Shows a welcome banner with key stats
 * (GPA, units, subjects, Dean's Lister status), a grades & subjects
 * table, and the weekly schedule grid.
 */
export function StudentDashboard({ student, onProfile, onLogout }: StudentDashboardProps) {
  const totalUnits = student.subjects.reduce((sum, s) => sum + s.units, 0)

  return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>
      <PortalNavbar student={student} onProfile={onProfile} onLogout={onLogout} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome banner */}
        <div
          className="rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${PALETTE.navy} 0%, ${PALETTE.ocean} 100%)` }}
        >
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
            style={{ background: PALETTE.sky, transform: 'translate(30%, -40%)' }}
          />
          <div
            className="absolute bottom-0 right-12 w-32 h-32 rounded-full opacity-10"
            style={{ background: PALETTE.azure, transform: 'translate(50%, 40%)' }}
          />

          <div className="relative">
            <p className="text-xs tracking-[0.2em] uppercase text-white/60 mb-2">
              {student.semester} &bull; AY {student.academicYear}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold">Welcome back, {student.firstName}!</h1>
            <p className="text-sm text-white/70 mt-2">
              {student.program} &bull; {student.yearLevel}, {student.section}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-wider text-white/60">GPA</p>
                <p className="text-xl font-bold">{student.gpa}</p>
              </div>
              <div className="bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-wider text-white/60">Units Enrolled</p>
                <p className="text-xl font-bold">{totalUnits}</p>
              </div>
              <div className="bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-wider text-white/60">Subjects</p>
                <p className="text-xl font-bold">{student.subjects.length}</p>
              </div>
              {student.deanLister && (
                <div
                  className="rounded-xl px-4 py-3 flex items-center gap-2"
                  style={{ background: `${PALETTE.sky}33` }}
                >
                  <Award className="w-5 h-5" style={{ color: PALETTE.sky }} />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Status</p>
                    <p className="text-sm font-bold">Dean&apos;s Lister</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Grades & Subjects Table */}
        <section
          className="bg-white rounded-2xl shadow-sm overflow-hidden"
          style={{ border: `1px solid ${PALETTE.mist}55` }}
        >
          <div
            className="p-6 border-b flex items-center gap-3"
            style={{ borderColor: `${PALETTE.mist}55` }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: `${PALETTE.sky}26` }}
            >
              <GraduationCap className="w-5 h-5" style={{ color: PALETTE.ocean }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: PALETTE.navy }}>
                Grades &amp; Subjects
              </h2>
              <p className="text-xs" style={{ color: '#6b7280' }}>
                Your enrolled subjects, units, professors, and current grades
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: `${PALETTE.mist}33` }}>
                  <th
                    className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider"
                    style={{ color: PALETTE.navy }}
                  >
                    Code
                  </th>
                  <th
                    className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider"
                    style={{ color: PALETTE.navy }}
                  >
                    Subject
                  </th>
                  <th
                    className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider"
                    style={{ color: PALETTE.navy }}
                  >
                    Units
                  </th>
                  <th
                    className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider"
                    style={{ color: PALETTE.navy }}
                  >
                    Professor
                  </th>
                  <th
                    className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider"
                    style={{ color: PALETTE.navy }}
                  >
                    Midterm
                  </th>
                  <th
                    className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider"
                    style={{ color: PALETTE.navy }}
                  >
                    Finals
                  </th>
                  <th
                    className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider"
                    style={{ color: PALETTE.navy }}
                  >
                    Final Grade
                  </th>
                  <th
                    className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider"
                    style={{ color: PALETTE.navy }}
                  >
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody>
                {student.subjects.map((s, i) => (
                  <tr
                    key={s.code}
                    className="transition-colors hover:bg-gray-50"
                    style={{
                      borderBottom:
                        i < student.subjects.length - 1 ? `1px solid ${PALETTE.mist}33` : 'none',
                    }}
                  >
                    <td className="px-4 py-3">
                      <span
                        className="font-mono font-semibold text-xs"
                        style={{ color: PALETTE.ocean }}
                      >
                        {s.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm" style={{ color: PALETTE.navy }}>
                        {s.title}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                        {s.schedule} &bull; {s.room}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center" style={{ color: PALETTE.navy }}>
                      {s.units}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm" style={{ color: PALETTE.navy }}>
                        {s.professor}
                      </p>
                      <p className="text-xs" style={{ color: '#6b7280' }}>
                        {s.professorEmail}
                      </p>
                    </td>
                    <td
                      className="px-4 py-3 text-center font-mono text-sm"
                      style={{ color: PALETTE.navy }}
                    >
                      {s.midterm}
                    </td>
                    <td
                      className="px-4 py-3 text-center font-mono text-sm"
                      style={{ color: PALETTE.navy }}
                    >
                      {s.finals}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="inline-block px-2.5 py-1 rounded-md font-mono font-bold text-sm text-white"
                        style={{ background: PALETTE.ocean }}
                      >
                        {s.finalGrade}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md"
                        style={{ background: `${PALETTE.sky}26`, color: PALETTE.ocean }}
                      >
                        <CheckCircle2 className="w-3 h-3" /> {s.remarks}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: `${PALETTE.mist}33` }}>
                  <td
                    className="px-4 py-3 font-semibold text-sm"
                    colSpan={2}
                    style={{ color: PALETTE.navy }}
                  >
                    Total Units Enrolled
                  </td>
                  <td
                    className="px-4 py-3 text-center font-bold text-sm"
                    style={{ color: PALETTE.navy }}
                  >
                    {totalUnits}
                  </td>
                  <td colSpan={5}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* Weekly Schedule */}
        <section
          className="bg-white rounded-2xl shadow-sm"
          style={{ border: `1px solid ${PALETTE.mist}55` }}
        >
          <div
            className="p-6 border-b flex items-center gap-3"
            style={{ borderColor: `${PALETTE.mist}55` }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: `${PALETTE.sky}26` }}
            >
              <CalendarDays className="w-5 h-5" style={{ color: PALETTE.ocean }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: PALETTE.navy }}>
                Weekly Schedule
              </h2>
              <p className="text-xs" style={{ color: '#6b7280' }}>
                Your class schedule from Monday to Saturday
              </p>
            </div>
          </div>
          <div className="p-6">
            <WeeklyScheduleGrid schedule={student.schedule} />
          </div>
        </section>
      </main>
    </div>
  )
}
