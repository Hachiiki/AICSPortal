'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  CLASS_SESSIONS,
  SUBJECT_COLORS,
  WEEKDAYS,
  CALENDAR_HOURS,
  type ClassSession,
  type Weekday,
} from '@/lib/aics/schedule-data'
import { formatTime, timeToMinutes } from '@/lib/aics/format'

const HOUR_HEIGHT = 56 // px per hour row
const GRID_START_MIN = timeToMinutes(CALENDAR_HOURS[0]) // 480 (8:00)
const GRID_END_MIN = timeToMinutes(CALENDAR_HOURS[CALENDAR_HOURS.length - 1]) + 60 // last hour + 60

/**
 * Computes the Monday of the week containing `date`.
 * Week is Mon–Sat in this portal.
 */
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun, 1=Mon, ... 6=Sat
  // Shift Sunday (0) to behave as if it's the 7th day of the previous week
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDateRange(monday: Date): { label: string; dates: Date[] } {
  const dates: Date[] = []
  for (let i = 0; i < WEEKDAYS.length; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    dates.push(d)
  }
  const start = dates[0]
  const end = dates[dates.length - 1]
  const sameMonth = start.getMonth() === end.getMonth()
  const startStr = `${MONTH_ABBR[start.getMonth()]} ${start.getDate()}`
  const endStr = sameMonth
    ? `${end.getDate()}, ${end.getFullYear()}`
    : `${MONTH_ABBR[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`
  return { label: `${startStr} – ${endStr}`, dates }
}

interface ScheduleGridProps {
  /** The selected day used by the parent "Today's Classes" panel */
  selectedDay: Weekday
  onDayChange: (day: Weekday) => void
  /** Monday of the displayed week (controlled by parent so Today's Classes stays in sync) */
  weekStart: Date
  onWeekChange: (monday: Date) => void
}

/**
 * Weekly schedule as a real time-grid calendar (time on Y, days on X).
 * Class blocks are absolutely positioned by their actual start/end times.
 */
export function ScheduleGrid({ selectedDay, onDayChange, weekStart, onWeekChange }: ScheduleGridProps) {

  const { label: weekLabel, dates: weekDates } = useMemo(
    () => formatDateRange(weekStart),
    [weekStart]
  )

  const goPrevWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    onWeekChange(d)
  }
  const goNextWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    onWeekChange(d)
  }
  const goToday = () => {
    onWeekChange(getMondayOfWeek(new Date()))
  }

  const totalHeight = (GRID_END_MIN - GRID_START_MIN) * (HOUR_HEIGHT / 60)

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
      className="bg-white rounded-xl border border-slate-200 shadow-sm min-w-0"
    >
      {/* Header + week controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Weekly Schedule</h2>
          <p className="text-xs text-slate-500 mt-0.5">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goPrevWeek}
            aria-label="Previous week"
            className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={goNextWeek}
            aria-label="Next week"
            className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="ml-1 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Today
          </button>
        </div>
      </div>

      {/* Calendar grid — horizontally scrollable on small screens */}
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          {/* Day header row */}
          <div className="grid border-b border-slate-100" style={{ gridTemplateColumns: `64px repeat(${WEEKDAYS.length}, 1fr)` }}>
            <div className="px-2 py-2" />
            {WEEKDAYS.map((day, i) => {
              const isActive = day === selectedDay
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => onDayChange(day)}
                  className="px-2 py-2 text-center border-l border-slate-100 hover:bg-slate-50 focus-visible:outline-none focus-visible:bg-slate-50"
                  style={isActive ? { background: '#eff6ff' } : undefined}
                >
                  <p
                    className={`text-[11px] font-semibold uppercase tracking-wider ${
                      isActive ? 'text-blue-700' : 'text-slate-500'
                    }`}
                  >
                    {day}
                  </p>
                  <p
                    className={`text-sm font-semibold ${
                      isActive ? 'text-blue-800' : 'text-slate-700'
                    }`}
                  >
                    {weekDates[i].getDate()}
                  </p>
                </button>
              )
            })}
          </div>

          {/* Time grid body */}
          <div
            className="grid relative"
            style={{
              gridTemplateColumns: `64px repeat(${WEEKDAYS.length}, 1fr)`,
              height: `${totalHeight}px`,
            }}
          >
            {/* Hour rows (labels + horizontal grid lines) */}
            {CALENDAR_HOURS.map((hour, idx) => {
              const isLast = idx === CALENDAR_HOURS.length - 1
              return (
                <div
                  key={hour}
                  className="contents"
                  aria-hidden="true"
                >
                  <div
                    className="relative px-2 text-right"
                    style={{ height: `${HOUR_HEIGHT}px`, borderTop: idx === 0 ? 'none' : '1px solid #f1f5f9' }}
                  >
                    <span className="absolute top-[-7px] right-2 text-[10px] font-medium font-mono text-slate-400 bg-white px-1">
                      {formatTime(hour)}
                    </span>
                  </div>
                  {WEEKDAYS.map((day) => (
                    <div
                      key={day + hour}
                      className="border-l border-slate-100"
                      style={{
                        height: `${HOUR_HEIGHT}px`,
                        borderTop: idx === 0 ? 'none' : '1px solid #f1f5f9',
                        background: day === selectedDay ? '#f8fafc' : 'transparent',
                      }}
                    />
                  ))}
                  {/* Don't render the very last row's bottom border via the loop */}
                  {isLast && null}
                </div>
              )
            })}

            {/* Class blocks — absolutely positioned over the grid */}
            {CLASS_SESSIONS.map((session, i) => {
              const colIndex = WEEKDAYS.indexOf(session.day)
              if (colIndex === -1) return null
              const startMin = timeToMinutes(session.start)
              const endMin = timeToMinutes(session.end)
              // Clamp to grid bounds
              const clampedStart = Math.max(startMin, GRID_START_MIN)
              const clampedEnd = Math.min(endMin, GRID_END_MIN)
              if (clampedEnd <= clampedStart) return null

              const top = (clampedStart - GRID_START_MIN) * (HOUR_HEIGHT / 60)
              const height = (clampedEnd - clampedStart) * (HOUR_HEIGHT / 60)
              const leftPct = (colIndex / WEEKDAYS.length) * 100
              const widthPct = (1 / WEEKDAYS.length) * 100
              const colors = SUBJECT_COLORS[session.color]

              return (
                <motion.div
                  key={`${session.subjectCode}-${session.day}-${i}`}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25, ease: 'easeOut', delay: 0.15 + i * 0.02 }}
                  className="absolute rounded-md px-2 py-1.5 overflow-hidden pointer-events-auto"
                  style={{
                    top: `${top + 2}px`,
                    height: `${height - 4}px`,
                    left: `calc(64px + ${leftPct}% * (100% - 64px) / 100)`,
                    width: `calc(${widthPct}% * (100% - 64px) / 100 - 4px)`,
                    background: colors.bg,
                    borderLeft: `3px solid ${colors.text}`,
                  }}
                >
                  <p className="text-[11px] font-bold leading-tight" style={{ color: colors.text }}>
                    {session.subjectCode}
                  </p>
                  {height >= 40 && (
                    <p className="text-[10px] leading-tight mt-0.5" style={{ color: colors.text, opacity: 0.85 }}>
                      {session.shortTitle}
                    </p>
                  )}
                  {height >= 64 && (
                    <>
                      <p className="text-[9px] leading-tight mt-1 font-mono" style={{ color: colors.text, opacity: 0.75 }}>
                        {formatTime(session.start)} – {formatTime(session.end)}
                      </p>
                      <p className="text-[9px] leading-tight" style={{ color: colors.text, opacity: 0.75 }}>
                        {session.room}
                      </p>
                    </>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </motion.section>
  )
}

/**
 * Hook for parent components to get the classes for a given day.
 * Exported so Today's Classes panel can read from the same data source.
 */
export function getClassesForDay(day: Weekday): ClassSession[] {
  return CLASS_SESSIONS.filter((s) => s.day === day).sort(
    (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)
  )
}
