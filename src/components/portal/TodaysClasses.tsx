'use client'

import { Clock, MapPin, CalendarDays } from 'lucide-react'
import {
  getSessionsForDay,
  getCourse,
  COLOR_STYLES,
  formatRangeTime,
  DAY_FULL,
  MOCK_TODAY_INDEX,
} from '@/lib/schedule'

interface TodaysClassesProps {
  onViewFull?: () => void
}

// ============================================================
//  MOCK "TODAY" — demo mode
// ============================================================
//  This portal is a front-end demo with no real backend yet.
//  Instead of using `new Date()` (which might land on a Sunday
//  or holiday with zero classes), we pin "today" to Monday so
//  the sidebar always shows meaningful demo content.
//
//  TODO: When a real backend / auth layer is wired up, replace
//  MOCK_TODAY_INDEX with the authenticated student's actual
//  current day: `dateToDayIndex(new Date())`.
// ============================================================
const TODAY_INDEX = MOCK_TODAY_INDEX
const TODAY_LABEL = DAY_FULL[TODAY_INDEX]

/**
 * "Today's Classes" sidebar. Reads from the SAME `getSessionsForDay`
 * as the weekly calendar — there is no separate hard-coded list.
 */
export function TodaysClasses({ onViewFull }: TodaysClassesProps) {
  const sessions = getSessionsForDay(TODAY_INDEX)

  return (
    <section className="w-full lg:w-[320px] flex-shrink-0 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Today&apos;s Classes</h2>
        <p className="text-xs text-slate-500 mt-0.5">{TODAY_LABEL}</p>
      </div>

      {/* List */}
      <div className="flex-1 p-5 flex flex-col gap-3">
        {sessions.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-500">No classes scheduled for today.</p>
          </div>
        ) : (
          sessions.map((s, i) => {
            const course = getCourse(s.code)
            const styles = COLOR_STYLES[course.color]
            return (
              <div
                key={`${s.code}-${s.day}-${i}`}
                className="rounded-lg border border-slate-200 p-3 flex gap-2.5"
              >
                <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${styles.dot}`} />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-semibold text-slate-900">{s.code}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{course.title}</p>
                  <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    {formatRangeTime(s.start, s.end)}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {s.room}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onViewFull}
          className="w-full rounded-lg border border-slate-200 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <CalendarDays className="w-4 h-4" />
          View Full Schedule
        </button>
      </div>
    </section>
  )
}
