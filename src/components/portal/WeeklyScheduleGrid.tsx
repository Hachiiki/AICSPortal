'use client'

import { Clock, MapPin } from 'lucide-react'
import type { ScheduleEntry } from '@/lib/aics/types'
import { PALETTE } from '@/lib/aics/palette'
import { DAYS, DAY_LABELS } from '@/lib/aics/mock-data'
import { formatTime, timeToMinutes } from '@/lib/aics/format'

interface WeeklyScheduleGridProps {
  schedule: ScheduleEntry[]
}

/**
 * Renders the student's weekly class schedule as a 6-column grid
 * (Mon–Sat). Each day column lists its classes sorted by start time,
 * color-coded by subject. Empty days show a "No classes" placeholder.
 */
export function WeeklyScheduleGrid({ schedule }: WeeklyScheduleGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {DAYS.map((day) => {
        const dayClasses = schedule
          .filter((s) => s.day === day)
          .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start))
        return (
          <div
            key={day}
            className="rounded-xl overflow-hidden"
            style={{ border: `1px solid ${PALETTE.mist}55` }}
          >
            <div className="px-3 py-2 text-center" style={{ background: PALETTE.navy }}>
              <p className="text-xs font-bold text-white tracking-wider uppercase">{day}</p>
              <p className="text-[9px] text-white/50">{DAY_LABELS[day]}</p>
            </div>
            <div className="p-2 space-y-2 min-h-[140px]" style={{ background: '#f9fafb' }}>
              {dayClasses.length === 0 ? (
                <p className="text-[10px] text-center py-6" style={{ color: '#9ca3af' }}>
                  No classes
                </p>
              ) : (
                dayClasses.map((c, i) => (
                  <div
                    key={i}
                    className="rounded-lg p-2.5 text-white text-xs"
                    style={{ background: c.color, borderLeft: '3px solid rgba(255,255,255,0.5)' }}
                  >
                    <p className="font-bold">{c.subject}</p>
                    <p className="text-[10px] opacity-90 mt-0.5">{c.title}</p>
                    <div className="flex items-center gap-1 mt-1.5 opacity-85">
                      <Clock className="w-2.5 h-2.5" />
                      <p className="text-[9px]">
                        {formatTime(c.start)} - {formatTime(c.end)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 opacity-85">
                      <MapPin className="w-2.5 h-2.5" />
                      <p className="text-[9px]">{c.room}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
