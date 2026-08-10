'use client'

import { motion } from 'framer-motion'
import type { Student } from '@/lib/aics/types'

interface AcademicHeaderProps {
  student: Student
  totalUnits: number
}

/**
 * Light, restrained academic header. Replaces the old dark gradient hero.
 * Stats are shown as typography blocks separated by thin vertical dividers,
 * NOT as cards or tiles.
 */
export function AcademicHeader({ student, totalUnits }: AcademicHeaderProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <p className="text-xs font-medium uppercase tracking-[0.15em] text-slate-500">
        {student.semester} &bull; AY {student.academicYear}
      </p>
      <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-blue-950">
        Welcome back, {student.firstName}!
      </h1>
      <p className="mt-1.5 text-sm text-slate-600">
        {student.program} &bull; {student.yearLevel} &bull; {student.section}
      </p>

      {/* Stats row — typography blocks with vertical separators, not cards */}
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
