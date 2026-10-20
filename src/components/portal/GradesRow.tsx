'use client'

import type { Subject } from '@/lib/aics/types'
import { RemarksBadge } from './RemarksBadge'

// ============================================================
//  Shared grades table primitives — used by both the dashboard
//  GradesTable and the Academics page Grades tab.
//  Eliminates the 65-line duplication between the two.
//
//  Responsive strategy (Design Polish — table responsiveness):
//  below md, grades render as per-subject cards (GradesCards)
//  instead of a crushed 8-column table; from md up the table
//  stays a table with a min width so its overflow-x-auto
//  wrapper scrolls instead of squeezing the columns.
// ============================================================

/** Table header row for the 8-column grades layout. */
export function GradesHeader() {
  return (
    <tr className="bg-slate-50 border-b border-slate-100">
      <Th>Code</Th>
      <Th>Subject</Th>
      <Th center>Units</Th>
      <Th>Professor</Th>
      <Th center>Midterm</Th>
      <Th center>Finals</Th>
      <Th center>Final Grade</Th>
      <Th center>Remarks</Th>
    </tr>
  )
}

/** Single subject row — shared by dashboard + academics grades tab. */
export function GradesRow({ subject, rowKey }: { subject: Subject; rowKey: string }) {
  return (
    <tr key={rowKey} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60">
      <td className="px-4 py-3 whitespace-nowrap"><span className="font-mono text-xs font-bold text-blue-700">{subject.code}</span></td>
      <td className="px-4 py-3"><span className="text-sm text-slate-700">{subject.title}</span></td>
      <td className="px-4 py-3 text-center text-sm text-slate-700 whitespace-nowrap">{subject.units}</td>
      <td className="px-4 py-3"><span className="text-sm text-slate-700">{subject.professor}</span></td>
      <td className="px-4 py-3 text-center font-mono text-sm text-slate-700 whitespace-nowrap">{subject.midterm}</td>
      <td className="px-4 py-3 text-center font-mono text-sm text-slate-700 whitespace-nowrap">{subject.finals}</td>
      <td className="px-4 py-3 text-center whitespace-nowrap"><span className="font-mono text-sm font-bold text-blue-700">{subject.finalGrade}</span></td>
      <td className="px-4 py-3 text-center">
        <RemarksBadge remarks={subject.remarks} />
      </td>
    </tr>
  )
}

/** Table footer row showing total units. */
export function GradesFooter({ totalUnits }: { totalUnits: number }) {
  return (
    <tr className="bg-slate-50 border-t border-slate-100">
      <td className="px-4 py-3 text-sm font-semibold text-slate-900" colSpan={2}>Total Units Enrolled</td>
      <td className="px-4 py-3 text-center text-sm font-bold text-slate-900 whitespace-nowrap">{totalUnits}</td>
      <td colSpan={5}></td>
    </tr>
  )
}

// ------------------------------------------------------------
//  Mobile card layout — render below md wherever the grades
//  table is used. One card per subject with the grade trio as
//  labelled stats and the remarks badge; a compact footer row
//  carries the total units when provided.
// ------------------------------------------------------------

interface GradesCardsProps {
  subjects: Subject[]
  totalUnits?: number
  /** Show the term line (year level + AY) on each card — for the All Subjects history view. */
  showTerm?: boolean
}

export function GradesCards({ subjects, totalUnits, showTerm }: GradesCardsProps) {
  return (
    <div className="md:hidden">
      <ul className="divide-y divide-slate-100">
        {subjects.map((s, i) => (
          <SubjectCard key={`${s.code}-${i}`} subject={s} showTerm={showTerm} />
        ))}
      </ul>
      {typeof totalUnits === 'number' && (
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-100">
          <span className="text-sm font-semibold text-slate-900">Total Units Enrolled</span>
          <span className="text-sm font-bold text-slate-900 tabular-nums">{totalUnits}</span>
        </div>
      )}
    </div>
  )
}

function SubjectCard({ subject, showTerm }: { subject: Subject; showTerm?: boolean }) {
  return (
    <li className="px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-blue-700 flex-shrink-0">{subject.code}</span>
            <h3 className="text-sm font-semibold text-slate-900 truncate">{subject.title}</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            {subject.professor}
            {showTerm && subject.yearLevel && subject.academicYear ? ` • ${subject.yearLevel} • AY ${subject.academicYear}` : ''}
          </p>
        </div>
        <span className="text-xs text-slate-500 flex-shrink-0 whitespace-nowrap">{subject.units} units</span>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <GradeStat label="Mid" value={subject.midterm} />
        <GradeStat label="Fin" value={subject.finals} />
        <GradeStat label="FG" value={subject.finalGrade} strong />
        <RemarksBadge remarks={subject.remarks} />
      </div>
    </li>
  )
}

function GradeStat({ label, value, strong }: { label: string; value: string | number | null | undefined; strong?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-[10px] uppercase tracking-wider font-medium text-slate-500">{label}</span>
      <span className={`font-mono text-sm tabular-nums ${strong ? 'font-bold text-blue-700' : 'text-slate-700'}`}>
        {fmtGrade(value)}
      </span>
    </span>
  )
}

function fmtGrade(v: string | number | null | undefined) {
  return v == null || v === '' ? '—' : v
}

function Th({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <th scope="col" className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap ${center ? 'text-center' : 'text-left'}`}>
      {children}
    </th>
  )
}
