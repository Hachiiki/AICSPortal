'use client'

import type { Student } from '@/lib/aics/types'
import { getInitials } from '@/lib/aics/format'

interface DigitalIDCardLargeProps {
  student: Student
}

/**
 * Enlarged version of the digital ID card shown in a dialog when the
 * user clicks "View Digital ID". Same design as the compact card but
 * scaled up with larger typography for readability.
 */
export function DigitalIDCardLarge({ student }: DigitalIDCardLargeProps) {
  return (
    <div
      className="rounded-2xl p-8 text-white shadow-md w-full max-w-md mx-auto bg-gradient-to-br from-[#1E3A8A] via-[#1D4ED8] to-[#3B82F6]"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <img src="/aics-logo.svg" alt="AICS" className="w-12 h-12" />
          <p className="text-[11px] uppercase tracking-wider text-white/80 font-semibold leading-tight">
            Asian Institute of<br />Computer Studies
          </p>
        </div>
        <span className="bg-sky-300 text-blue-900 text-[11px] font-bold rounded-full px-3 py-1 uppercase tracking-wider">
          Student ID
        </span>
      </div>

      {/* Body */}
      <div className="flex gap-5 mb-6">
        <div className="w-20 h-24 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-2xl font-bold flex-shrink-0">
          {getInitials(student.fullName)}
        </div>
        <div className="flex-1 min-w-0 space-y-2.5">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/60">Name</p>
            <p className="text-base font-bold text-white break-words leading-tight">
              {student.fullName}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/60">Student No.</p>
            <p className="text-sm font-mono font-semibold text-white">{student.studentNumber}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/60">Program</p>
            <p className="text-sm font-semibold text-white">
              {student.programShort} &ndash; {student.yearLevel}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mb-4 text-[11px]">
        <div>
          <p className="uppercase tracking-wider text-white/60">Branch</p>
          <p className="font-semibold text-white">{student.branch}</p>
        </div>
        <div className="text-right">
          <p className="uppercase tracking-wider text-white/60">Valid</p>
          <p className="font-semibold text-white">AY {student.academicYear}</p>
        </div>
      </div>

      {/* Barcode */}
      <div
        className="h-10 w-full rounded"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, #ffffff 0px, #ffffff 2px, transparent 2px, transparent 4px, #ffffff 4px, #ffffff 5px, transparent 5px, transparent 8px, #ffffff 8px, #ffffff 10px, transparent 10px, transparent 12px)',
        }}
        aria-hidden="true"
      />
      <p className="text-[10px] text-white/70 mt-1.5 text-center font-mono">
        {student.studentNumber}
      </p>
    </div>
  )
}
