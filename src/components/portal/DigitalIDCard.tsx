'use client'

import type { Student } from '@/lib/aics/types'
import { PALETTE } from '@/lib/aics/palette'
import { getInitials } from '@/lib/aics/format'

interface DigitalIDCardProps {
  student: Student
}

/**
 * A stylized preview of the student's physical ID card.
 * Shows the school header, student photo area (initials),
 * key details, branch, validity, and a faux barcode strip.
 */
export function DigitalIDCard({ student }: DigitalIDCardProps) {
  return (
    <div
      className="rounded-2xl overflow-hidden shadow-lg"
      style={{ background: `linear-gradient(135deg, ${PALETTE.navy} 0%, ${PALETTE.ocean} 100%)` }}
    >
      {/* Top: school header */}
      <div className="p-3 flex items-center gap-2 border-b border-white/10">
        <img src="/aics-logo.svg" alt="AICS" className="w-8 h-8" />
        <div className="leading-tight">
          <p className="text-[7px] uppercase tracking-wider text-white/60">Asian Institute of</p>
          <p className="text-[11px] font-bold text-white">Computer Studies</p>
        </div>
        <div className="ml-auto">
          <span
            className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: PALETTE.sky, color: PALETTE.navy }}
          >
            Student ID
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 flex gap-3">
        <div
          className="w-16 h-20 rounded-lg flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}
        >
          {getInitials(student.fullName)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[8px] uppercase tracking-wider text-white/50">Name</p>
          <p className="text-sm font-bold text-white truncate">{student.fullName}</p>
          <p className="text-[8px] uppercase tracking-wider text-white/50 mt-1.5">Student No.</p>
          <p className="text-[11px] text-white/90">{student.studentNumber}</p>
          <p className="text-[8px] uppercase tracking-wider text-white/50 mt-1.5">Program</p>
          <p className="text-[10px] text-white/80">
            {student.programShort} &bull; {student.yearLevel}
          </p>
        </div>
      </div>

      {/* Branch + validity */}
      <div className="px-3 pb-2 flex items-center justify-between">
        <div>
          <p className="text-[7px] uppercase tracking-wider text-white/50">Branch</p>
          <p className="text-[10px] text-white/80">{student.branch}</p>
        </div>
        <div className="text-right">
          <p className="text-[7px] uppercase tracking-wider text-white/50">Valid</p>
          <p className="text-[10px] text-white/80">AY {student.academicYear}</p>
        </div>
      </div>

      {/* Barcode-style strip */}
      <div className="px-3 pb-3">
        <div className="flex gap-px h-7 items-end bg-white/5 rounded p-1">
          {Array.from({ length: 48 }).map((_, i) => (
            <div
              key={i}
              className="bg-white/80"
              style={{ width: '2px', height: `${30 + ((i * 37) % 70)}%` }}
            />
          ))}
        </div>
        <p className="text-[7px] text-white/40 mt-1 text-center font-mono">{student.studentNumber}</p>
      </div>
    </div>
  )
}
