'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Clock, MapPin, CalendarDays } from 'lucide-react'
import {
  SUBJECT_COLORS,
  WEEKDAY_LABELS,
  type Weekday,
} from '@/lib/aics/schedule-data'
import { formatTime } from '@/lib/aics/format'
import { getClassesForDay } from './ScheduleGrid'

interface TodaysClassesProps {
  selectedDay: Weekday
  /** Optional date to display next to the day name */
  date?: Date
  onViewFull?: () => void
}

/**
 * "Today's Classes" panel. Reads from the SAME ClassSession data as
 * the weekly calendar (via getClassesForDay). Updates when the user
 * selects a different day in the calendar.
 */
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function TodaysClasses({ selectedDay, date, onViewFull }: TodaysClassesProps) {
  const classes = useMemo(() => getClassesForDay(selectedDay), [selectedDay])

  const dateLabel = date
    ? `${MONTH_ABBR[date.getMonth()]} ${date.getDate()}`
    : ''

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: 0.15 }}
      className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-w-0"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-900">Today&apos;s Classes</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {WEEKDAY_LABELS[selectedDay]}
          {dateLabel ? `, ${dateLabel}` : ''}
        </p>
      </div>

      {/* Class list */}
      <div className="flex-1 p-5 space-y-3">
        {classes.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-500">No classes scheduled for this day.</p>
          </div>
        ) : (
          classes.map((c, i) => {
            const colors = SUBJECT_COLORS[c.color]
            return (
              <motion.div
                key={`${c.subjectCode}-${c.day}-${i}`}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: 0.2 + i * 0.04 }}
                className="flex gap-3"
              >
                {/* Colored dot */}
                <div
                  className="mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: colors.dot }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    <span className="font-mono text-blue-700 mr-1.5">{c.subjectCode}</span>
                    {c.subjectTitle}
                  </p>
                  <div className="mt-1 flex flex-col gap-0.5 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {formatTime(c.start)} – {formatTime(c.end)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" />
                      {c.room}
                    </span>
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Footer button */}
      <div className="px-5 py-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onViewFull}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <CalendarDays className="w-4 h-4" />
          View Full Schedule
        </button>
      </div>
    </motion.section>
  )
}
