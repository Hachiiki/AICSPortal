'use client'

import type { Student } from '@/lib/aics/types'
import { GradesHeader, GradesRow, GradesFooter, GradesCards } from './GradesRow'
import { DashboardSubjectsCard } from './DashboardLayout'

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
    <DashboardSubjectsCard title="Grades & Subjects" detail="Your enrolled subjects, units, professors, and current grades">

      {/* Grades — per-subject cards on mobile, scrollable table from md up */}
      <GradesCards subjects={student.subjects} totalUnits={totalUnits} />
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
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
    </DashboardSubjectsCard>
  )
}
