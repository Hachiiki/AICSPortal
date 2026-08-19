'use client'

import { motion } from 'framer-motion'
import type { Student } from '@/lib/aics/types'
import { GradesHeader, GradesRow, GradesFooter } from './GradesRow'

interface GradesTableProps {
  student: Student
}

/**
 * Clean semantic grades table. Replaces the old version which had:
 * - schedule sub-lines under each subject (removed)
 * - professor emails in every row (removed)
 * - solid blue final-grade badges (now plain mono text)
 * - blue remarks badges (now subtle green indicator)
 *
 * The "View All Grades" link was removed because the Grades page is
 * not yet implemented (coming soon).
 */
export function GradesTable({ student }: GradesTableProps) {
  const totalUnits = student.subjects.reduce((sum, s) => sum + s.units, 0)

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
      className="bg-white rounded-xl border border-slate-200 shadow-sm"
    >
      {/* Section header */}
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-900">Grades &amp; Subjects</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Your enrolled subjects, units, professors, and current grades
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <GradesHeader />
          </thead>
          <tbody>
            {student.subjects.map((s) => (
              <GradesRow key={s.code} subject={s} rowKey={s.code} />
            ))}
          </tbody>
          <tfoot>
            <GradesFooter totalUnits={totalUnits} />
          </tfoot>
        </table>
      </div>
    </motion.section>
  )
}
