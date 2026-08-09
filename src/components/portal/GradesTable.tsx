'use client'

import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import type { Student } from '@/lib/aics/types'

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
            <tr className="bg-slate-50 border-b border-slate-100">
              <Th align="left">Code</Th>
              <Th align="left">Subject</Th>
              <Th align="center">Units</Th>
              <Th align="left">Professor</Th>
              <Th align="center">Midterm</Th>
              <Th align="center">Finals</Th>
              <Th align="center">Final Grade</Th>
              <Th align="center">Remarks</Th>
            </tr>
          </thead>
          <tbody>
            {student.subjects.map((s) => (
              <tr
                key={s.code}
                className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 transition-colors"
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-bold text-blue-700">{s.code}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-slate-700">{s.title}</span>
                </td>
                <td className="px-4 py-3 text-center text-sm text-slate-700">{s.units}</td>
                <td className="px-4 py-3">
                  <span className="text-sm text-slate-700">{s.professor}</span>
                </td>
                <td className="px-4 py-3 text-center font-mono text-sm text-slate-700">
                  {s.midterm}
                </td>
                <td className="px-4 py-3 text-center font-mono text-sm text-slate-700">
                  {s.finals}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="font-mono text-sm font-bold text-blue-700">{s.finalGrade}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-50 text-green-700 text-xs font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    {s.remarks}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t border-slate-100">
              <td className="px-4 py-3 text-sm font-semibold text-slate-900" colSpan={2}>
                Total Units Enrolled
              </td>
              <td className="px-4 py-3 text-center text-sm font-bold text-slate-900">
                {totalUnits}
              </td>
              <td colSpan={5}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </motion.section>
  )
}

function Th({ children, align }: { children: React.ReactNode; align: 'left' | 'center' }) {
  return (
    <th
      className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 ${
        align === 'center' ? 'text-center' : 'text-left'
      }`}
    >
      {children}
    </th>
  )
}
