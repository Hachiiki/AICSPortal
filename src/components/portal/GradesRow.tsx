'use client'

import type { Subject } from '@/lib/aics/types'
import { RemarksBadge } from './RemarksBadge'

// ============================================================
//  Shared grades table primitives — used by both the dashboard
//  GradesTable and the Academics page Grades tab.
//  Eliminates the 65-line duplication between the two.
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
      <td className="px-4 py-3"><span className="font-mono text-xs font-bold text-blue-700">{subject.code}</span></td>
      <td className="px-4 py-3"><span className="text-sm text-slate-700">{subject.title}</span></td>
      <td className="px-4 py-3 text-center text-sm text-slate-700">{subject.units}</td>
      <td className="px-4 py-3"><span className="text-sm text-slate-700">{subject.professor}</span></td>
      <td className="px-4 py-3 text-center font-mono text-sm text-slate-700">{subject.midterm}</td>
      <td className="px-4 py-3 text-center font-mono text-sm text-slate-700">{subject.finals}</td>
      <td className="px-4 py-3 text-center"><span className="font-mono text-sm font-bold text-blue-700">{subject.finalGrade}</span></td>
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
      <td className="px-4 py-3 text-center text-sm font-bold text-slate-900">{totalUnits}</td>
      <td colSpan={5}></td>
    </tr>
  )
}

function Th({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <th className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 ${center ? 'text-center' : 'text-left'}`}>
      {children}
    </th>
  )
}
