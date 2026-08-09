'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  START_HOUR,
  HOURS,
  HOUR_HEIGHT,
  DAY_SHORT,
  getMonday,
  getWeekDays,
  getSessionsForDay,
  getCourse,
  COLOR_STYLES,
  formatWeekRange,
  formatRangeTime,
  formatHourLabel,
  type Session,
} from '@/lib/schedule'

// Read `new Date()` client-side only via useSyncExternalStore to avoid
// SSR hydration mismatch (server renders null, client renders real date).
// The snapshot must be cached so React doesn't loop — we refresh it
// once per minute which is plenty for a weekly calendar.
const emptySubscribe = () => () => {}
let cachedClientToday: Date | null = null
let cachedClientTodayTime = 0
function getClientToday() {
  const now = Date.now()
  if (!cachedClientToday || now - cachedClientTodayTime > 60000) {
    cachedClientToday = new Date()
    cachedClientTodayTime = now
  }
  return cachedClientToday
}
function getServerToday() {
  return null
}

const GRID_TEMPLATE = 'grid grid-cols-[72px_repeat(6,minmax(0,1fr))]'

interface EventCardProps {
  session: Session
  /** Index of this session within overlapping sessions at the same time slot (0-based). */
  overlapIndex: number
  /** Total number of sessions overlapping at the same time slot. */
  overlapTotal: number
}

function EventCard({ session, overlapIndex, overlapTotal }: EventCardProps) {
  const course = getCourse(session.code)
  const styles = COLOR_STYLES[course.color]

  const top = (session.start - START_HOUR) * HOUR_HEIGHT + 2
  const height = (session.end - session.start) * HOUR_HEIGHT - 4

  // Side-by-side layout when two sessions overlap the same day/time slot.
  const widthPct = 100 / overlapTotal
  const leftPct = overlapIndex * widthPct

  return (
    <div
      className={`absolute rounded-md border-l-[3px] px-2 py-1.5 overflow-hidden ${styles.bg} ${styles.border}`}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        left: overlapTotal > 1 ? `calc(${leftPct}% + 4px)` : '4px',
        right: overlapTotal > 1 ? `calc(${100 - leftPct - widthPct}% + 4px)` : '4px',
      }}
    >
      <p className={`font-mono text-[11px] font-semibold leading-tight ${styles.code}`}>
        {session.code}
      </p>
      {height >= 36 && (
        <p className="text-[11px] text-slate-700 truncate leading-tight mt-0.5">{course.title}</p>
      )}
      {height >= 56 && (
        <>
          <p className="font-mono text-[10px] text-slate-500 leading-tight mt-1">
            {formatRangeTime(session.start, session.end)}
          </p>
          <p className="text-[10px] text-slate-500 leading-tight">{session.room}</p>
        </>
      )}
    </div>
  )
}

interface ScheduleGridProps {
  /** Called when the user picks a day column (0 = Mon … 5 = Sat). */
  onDaySelect?: (dayIndex: number) => void
}

export function ScheduleGrid({ onDaySelect }: ScheduleGridProps) {
  // Resolve `today` client-side only to avoid SSR hydration mismatch.
  const today = useSyncExternalStore(emptySubscribe, getClientToday, getServerToday)
  // Lazy-init anchor to current week's Monday on the client; null on server.
  const [anchor, setAnchor] = useState<Date | null>(() =>
    typeof window !== 'undefined' ? getMonday(new Date()) : null
  )

  const days = useMemo(() => (anchor ? getWeekDays(anchor) : []), [anchor])
  const todayIndex = useMemo(() => {
    if (!today || !anchor) return -1
    return dateToDayIndexSafe(today)
  }, [today, anchor])

  const goPrev = () => {
    if (!anchor) return
    const d = new Date(anchor)
    d.setDate(d.getDate() - 7)
    setAnchor(d)
  }
  const goNext = () => {
    if (!anchor) return
    const d = new Date(anchor)
    d.setDate(d.getDate() + 7)
    setAnchor(d)
  }
  const goToday = () => setAnchor(getMonday(new Date()))

  // Pre-compute sessions + overlap groups per day.
  const dayData = useMemo(() => {
    return DAY_SHORT.map((_, dayIdx) => {
      const sessions = getSessionsForDay(dayIdx)
      // Detect overlaps: group sessions that overlap in time.
      const overlapInfo = sessions.map((s, i) => {
        let total = 1
        let index = 0
        for (let j = 0; j < sessions.length; j++) {
          const other = sessions[j]
          if (s.start < other.end && other.start < s.end) {
            if (j < i) index++
            total++
          }
        }
        return { session: s, overlapIndex: index, overlapTotal: total }
      })
      return overlapInfo
    })
  }, [])

  return (
    <section className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Weekly Schedule</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Your class schedule from Monday to Saturday
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={!anchor}
            aria-label="Previous week"
            className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium tabular-nums text-slate-700 min-w-[150px] text-center">
            {anchor ? formatWeekRange(days) : '—'}
          </span>
          <button
            type="button"
            onClick={goNext}
            disabled={!anchor}
            aria-label="Next week"
            className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={goToday}
            disabled={!anchor}
            className="h-8 rounded-lg border border-slate-200 px-4 text-sm font-medium text-blue-600 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
          >
            Today
          </button>
        </div>
      </div>

      {/* Grid — horizontally scrollable on small screens */}
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          {/* Header row: TIME + day labels */}
          <div className={GRID_TEMPLATE}>
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 text-center py-2.5 border-b border-slate-200">
              Time
            </div>
            {DAY_SHORT.map((day, i) => (
              <button
                key={day}
                type="button"
                onClick={() => onDaySelect?.(i)}
                className="text-[11px] font-medium uppercase tracking-wider text-center py-2.5 border-b border-l border-slate-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:bg-slate-50"
              >
                <span className={i === todayIndex ? 'text-blue-600' : 'text-slate-500'}>
                  {day} {anchor ? days[i].getDate() : ''}
                </span>
              </button>
            ))}
          </div>

          {/* Body: hour rows + day columns with absolutely positioned events */}
          <div
            className={GRID_TEMPLATE}
            style={{ height: `${HOURS * HOUR_HEIGHT}px` }}
          >
            {/* Hour gutter column */}
            <div className="relative">
              {Array.from({ length: HOURS }).map((_, i) => (
                <div
                  key={i}
                  className="font-mono text-[11px] text-slate-500 pr-3 text-right border-b border-slate-100"
                  style={{ height: `${HOUR_HEIGHT}px`, lineHeight: `${HOUR_HEIGHT}px` }}
                >
                  {formatHourLabel(START_HOUR + i)}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {DAY_SHORT.map((_, dayIdx) => (
              <div
                key={dayIdx}
                className="relative border-l border-b border-slate-100"
                onClick={() => onDaySelect?.(dayIdx)}
              >
                {/* Hour row lines */}
                {Array.from({ length: HOURS }).map((_, i) => (
                  <div
                    key={i}
                    className="border-b border-slate-100"
                    style={{ height: `${HOUR_HEIGHT}px` }}
                  />
                ))}
                {/* Events for this day */}
                {dayData[dayIdx].map((info, i) => (
                  <EventCard
                    key={`${info.session.code}-${info.session.day}-${i}`}
                    session={info.session}
                    overlapIndex={info.overlapIndex}
                    overlapTotal={info.overlapTotal}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/** Safe version that returns -1 for Sunday. */
function dateToDayIndexSafe(date: Date): number {
  const dow = date.getDay()
  return dow === 0 ? -1 : dow - 1
}
