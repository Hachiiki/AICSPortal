'use client'

import type { Student } from '@/lib/aics/types'
import { ASPECT, CARD_RADIUS, CALIBRATE } from '@/lib/aics/id-card-config'
import { StudentIdFront } from './StudentIdFront'

interface StudentIdCardProps {
  student: Student
  className?: string
}

/**
 * Student ID Card — renders the official template PNG with
 * dynamic fields overlaid on top. The card uses @container
 * (container queries) so that cqw-based font sizing scales
 * correctly at any width (sidebar panel ~300px, dialog ~448px).
 */
export function StudentIdCard({ student, className }: StudentIdCardProps) {
  return (
    <div
      className={`relative w-full overflow-hidden ${CARD_RADIUS} @container ${className ?? ''}`}
      style={{ aspectRatio: ASPECT }}
      aria-label={`Student ID card of ${student.fullName}`}
    >
      {/* Template background */}
      <img
        src="/assets/student-id/id-front-template.png"
        alt=""
        className="absolute inset-0 h-full w-full select-none"
        draggable={false}
        aria-hidden="true"
      />

      {/* Dynamic field overlays */}
      <StudentIdFront student={student} />

      {/* Calibration note */}
      {CALIBRATE && (
        <div className="absolute top-1 right-1 text-[8px] font-mono text-red-500 bg-white/80 px-1 rounded">
          CALIBRATE MODE
        </div>
      )}
    </div>
  )
}
