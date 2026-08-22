'use client'

import { motion } from 'framer-motion'
import type { Student } from '@/lib/aics/types'
import type { Announcement } from '@/lib/aics/announcements'
import { AnnouncementsDeck } from './AnnouncementsDeck'

interface AcademicHeaderProps {
  student: Student
  totalUnits: number
  announcements?: Announcement[]
}

/**
 * Two-column hero. Left: semester eyebrow, welcome heading,
 * program line, stats row. Right: announcements card deck.
 *
 * Below lg breakpoint, the deck stacks full-width under the stats.
 */
export function AcademicHeader({ student, totalUnits, announcements }: AcademicHeaderProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col lg:flex-row gap-6 lg:gap-8 lg:items-start"
    >
      {/* Left column: hero text + stats */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-slate-500">
          {student.semester} &bull; AY {student.academicYear}
        </p>
        <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-blue-950">
          Welcome back, {student.firstName}!
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          {student.program} &bull; {student.yearLevel} &bull; {student.section}
        </p>

        {/* Stats row */}
        <div className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-4">
          <Stat label="GPA" value={student.gpa} />
          <Divider />
          <Stat label="Units Enrolled" value={String(totalUnits)} />
          <Divider />
          <Stat label="Subjects" value={String(student.subjects.length)} />
          <Divider />
          <Stat
            label="Standing"
            value={student.deanLister ? "Dean's Lister" : 'Regular'}
            accent={student.deanLister}
          />
        </div>
      </div>

      {/* Right column: announcements deck (hidden if no announcements) */}
      {announcements && announcements.length > 0 && (
        <AnnouncementsDeck announcements={announcements} />
      )}
    </motion.section>
  )
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p
        className="mt-0.5 text-xl font-bold"
        style={{ color: accent ? '#1d4ed8' : '#0f172a' }}
      >
        {value}
      </p>
    </div>
  )
}

function Divider() {
  return <div className="hidden sm:block w-px h-8 bg-slate-200" aria-hidden="true" />
}
