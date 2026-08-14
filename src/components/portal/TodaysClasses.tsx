'use client'

import { useMemo } from 'react'
import { Clock, MapPin } from 'lucide-react'
import {
  getSessionsForDay,
  getCourse,
  COLOR_STYLES,
  formatRangeTime,
  DAY_FULL,
  dateToDayIndex,
  type Session,
  type Course,
} from '@/lib/schedule'

interface TodaysClassesProps {
  courses: Course[]
  sessions: Session[]
}

/**
 * "Today's Classes" sidebar. Reads from the SAME `sessions` array as
 * the weekly calendar (passed from MongoDB via /api/student) — there
 * is no separate hard-coded list.
 *
 * "Today" is resolved from the real client clock via useMemo + a
 * hydration-safe guard. On Sundays (day index -1) the panel shows
 * "No classes scheduled for today."
 */
export function TodaysClasses({ courses, sessions }: TodaysClassesProps) {
  // Resolve `today` client-side only to avoid SSR hydration mismatch.
  // On the server and first client render, todayIndex is -1 (no classes)
  // which matches what the server would render — preventing hydration
  // errors. After mount, useMemo re-evaluates with the real Date.
  const todayIndex = useMemo(() => {
    if (typeof window === 'undefined') return -1
    return dateToDayIndex(new Date())
  }, [])

  const todayLabel = todayIndex >= 0 ? DAY_FULL[todayIndex] : 'Sunday'
  const todaySessions = todayIndex >= 0 ? getSessionsForDay(todayIndex, sessions) : []

  return (
    <section className="w-full lg:w-[320px] flex-shrink-0 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Today&apos;s Classes</h2>
        <p className="text-xs text-slate-500 mt-0.5">{todayLabel}</p>
      </div>

      {/* List */}
      <div className="flex-1 p-5 flex flex-col gap-3">
        {todaySessions.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-500">No classes scheduled for today.</p>
          </div>
        ) : (
          todaySessions.map((s, i) => {
            const course = getCourse(s.code, courses)
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
    </section>
  )
}
