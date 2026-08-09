'use client'

import { ChevronRight, LogOut } from 'lucide-react'
import type { Student } from '@/lib/aics/types'
import { PALETTE } from '@/lib/aics/palette'
import { getInitials } from '@/lib/aics/format'

interface PortalNavbarProps {
  student: Student
  onProfile: () => void
  onLogout: () => void
}

/**
 * Sticky top navigation bar shown on all authenticated portal views
 * (dashboard, profile, etc.). Shows the AICS logo + school name on the
 * left, and the student's avatar pill + logout button on the right.
 */
export function PortalNavbar({ student, onProfile, onLogout }: PortalNavbarProps) {
  return (
    <header
      className="sticky top-0 z-40 w-full no-print"
      style={{ background: PALETTE.white, borderBottom: `1px solid ${PALETTE.mist}55` }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/aics-logo.svg" alt="AICS" className="w-9 h-9" />
          <div className="leading-tight">
            <p className="text-[10px] tracking-[0.2em] uppercase" style={{ color: PALETTE.azure }}>
              Student Portal
            </p>
            <p className="text-sm font-semibold" style={{ color: PALETTE.navy }}>
              Asian Institute of Computer Studies
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onProfile}
            className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg transition-colors hover:bg-gray-50"
            style={{ border: `1px solid ${PALETTE.mist}` }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
              style={{ background: `linear-gradient(135deg, ${PALETTE.ocean}, ${PALETTE.azure})` }}
            >
              {getInitials(student.fullName)}
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <p className="text-xs font-semibold" style={{ color: PALETTE.navy }}>
                {student.firstName}
              </p>
              <p className="text-[10px]" style={{ color: '#6b7280' }}>
                {student.studentNumber}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 hidden sm:block" style={{ color: PALETTE.azure }} />
          </button>
          <button
            onClick={onLogout}
            className="p-2 rounded-lg transition-colors hover:bg-gray-50"
            style={{ color: PALETTE.ocean }}
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
