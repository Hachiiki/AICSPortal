'use client'

import type { IconType } from '@/lib/aics/types'
import { PALETTE } from '@/lib/aics/palette'

interface InfoRowProps {
  icon: IconType
  label: string
  value: string
}

/**
 * A single labeled info row used in the Personal Information grid on
 * the student profile page. Shows an icon badge, a small uppercase
 * label, and the value below it.
 */
export function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${PALETTE.sky}1A` }}
      >
        <Icon className="w-4 h-4" style={{ color: PALETTE.ocean }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: '#6b7280' }}>
          {label}
        </p>
        <p className="text-sm font-medium mt-0.5 break-words" style={{ color: PALETTE.navy }}>
          {value}
        </p>
      </div>
    </div>
  )
}
