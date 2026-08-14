'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, ChevronLeft, ChevronDown } from 'lucide-react'
import type { Student } from '@/lib/aics/types'
import type { Task } from '@/lib/aics/tasks'
import { computeStatus, VARIANT_COLORS } from '@/lib/aics/tasks'
import type { PortalEvent, EventCategory } from '@/lib/aics/events'
import {
  CATEGORY_COLORS,
  CATEGORY_PILL_STYLES,
  CATEGORY_LABELS,
  TASK_DUE_COLOR,
} from '@/lib/aics/events'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { EventsSkeleton } from './Skeleton'

interface EventsPageProps {
  student: Student
  onBack: () => void
  onProfile: () => void
  onLogout: () => void
}

// ============================================================
//  Calendar helpers (pure, no external deps)
// ============================================================

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** Returns a Date for the first day of the month containing `date`. */
function firstOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

/**
 * Builds a 6×7 grid (42 cells) of Dates starting from the Sunday
 * before the 1st of the month. Includes trailing/leading days from
 * adjacent months (rendered dimmed).
 */
function buildCalendarGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const startDay = first.getDay() // 0 = Sun
  const start = new Date(first)
  start.setDate(1 - startDay)
  const cells: Date[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    cells.push(d)
  }
  return cells
}

/** Strip time — compare dates by day only. */
function atMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** "Aug 14" format for the upcoming rail. */
function formatMonthDay(d: Date): string {
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${m[d.getMonth()]} ${d.getDate()}`
}

/** "August 14, 2026" — full date for the day details header. */
function formatFullDate(d: Date): string {
  return `${MONTH_LABELS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

// ============================================================
//  Main page
// ============================================================

export function EventsPage({ student, onBack, onProfile, onLogout }: EventsPageProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [events, setEvents] = useState<PortalEvent[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Calendar view state
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    // Default to today's month. Safe on client only; SSR renders
    // the skeleton (loading=true) so no hydration mismatch.
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  // Toggle: show task due dates as amber dots (default ON)
  const [showTasks, setShowTasks] = useState(true)

  // Category filter — toggled by clicking legend chips
  const [enabledCats, setEnabledCats] = useState<Set<EventCategory>>(
    new Set(['academic', 'deadline', 'campus', 'holiday'])
  )

  // ----------------------------------------------------------
  //  Fetch events + tasks once on mount
  // ----------------------------------------------------------
  useEffect(() => {
    let cancelled = false
    async function fetchAll() {
      try {
        const [evRes, tkRes] = await Promise.all([
          fetch(`/api/events?username=${encodeURIComponent(student.username)}`),
          fetch(`/api/tasks?username=${encodeURIComponent(student.username)}`),
        ])
        const [evData, tkData] = await Promise.all([evRes.json(), tkRes.json()])
        if (cancelled) return
        if (evData.ok) setEvents(evData.events)
        else setError(evData.error || 'Failed to load events')
        if (tkData.ok) setTasks(tkData.tasks)
        // Tasks failure is non-fatal — the overlay just shows nothing.
      } catch {
        if (!cancelled) setError('Network error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchAll()
    return () => { cancelled = true }
  }, [student.username])

  const handleNavigate = (v: any) => {
    if (v === 'dashboard') onBack()
  }

  // ----------------------------------------------------------
  //  Build a date → events map for quick lookup
  //  (handles multi-day events by expanding the range)
  // ----------------------------------------------------------
  const eventsByDate = useMemo(() => {
    const map = new Map<string, PortalEvent[]>()
    for (const ev of events) {
      const start = atMidnight(new Date(ev.date))
      const end = ev.endDate ? atMidnight(new Date(ev.endDate)) : start
      const cur = new Date(start)
      while (cur <= end) {
        const key = cur.toISOString().slice(0, 10)
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(ev)
        cur.setDate(cur.getDate() + 1)
      }
    }
    return map
  }, [events])

  // ----------------------------------------------------------
  //  Build a date → tasks map (current-term tasks only)
  //
  //  Task due dates are merged client-side from the student's
  //  Tasks data; they are NOT stored as Event documents.
  // ----------------------------------------------------------
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of tasks) {
      const key = atMidnight(new Date(t.dueDate)).toISOString().slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return map
  }, [tasks])

  // ----------------------------------------------------------
  //  Calendar grid for the current viewMonth
  // ----------------------------------------------------------
  const grid = useMemo(
    () => buildCalendarGrid(viewMonth.getFullYear(), viewMonth.getMonth()),
    [viewMonth]
  )

  const today = useMemo(() => atMidnight(new Date()), [])

  // Events visible in the current month (for the "no events" check)
  const monthHasEvents = useMemo(() => {
    const y = viewMonth.getFullYear()
    const m = viewMonth.getMonth()
    for (const ev of events) {
      const d = new Date(ev.date)
      if (d.getFullYear() === y && d.getMonth() === m) return true
      if (ev.endDate) {
        const e = new Date(ev.endDate)
        // Event spans into this month?
        if (e.getFullYear() === y && e.getMonth() === m) return true
      }
    }
    return false
  }, [events, viewMonth])

  // ----------------------------------------------------------
  //  Upcoming events (next 8 from today asc) — for the right rail
  // ----------------------------------------------------------
  const upcoming = useMemo(() => {
    return events
      .filter((ev) => atMidnight(new Date(ev.date)) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 8)
  }, [events, today])

  // ----------------------------------------------------------
  //  Selected day details
  // ----------------------------------------------------------
  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return []
    const key = atMidnight(selectedDay).toISOString().slice(0, 10)
    const list = eventsByDate.get(key) || []
    return list.filter((ev) => enabledCats.has(ev.category))
  }, [selectedDay, eventsByDate, enabledCats])

  const selectedDayTasks = useMemo(() => {
    if (!selectedDay || !showTasks) return []
    const key = atMidnight(selectedDay).toISOString().slice(0, 10)
    return tasksByDate.get(key) || []
  }, [selectedDay, tasksByDate, showTasks])

  // ----------------------------------------------------------
  //  Calendar navigation
  // ----------------------------------------------------------
  const goPrev = useCallback(() => {
    setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }, [])
  const goNext = useCallback(() => {
    setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }, [])
  const goToday = useCallback(() => {
    const d = new Date()
    setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1))
    setSelectedDay(atMidnight(d))
  }, [])

  // Jump to a specific date (from the upcoming rail)
  const jumpTo = useCallback((date: Date) => {
    const d = atMidnight(date)
    setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1))
    setSelectedDay(d)
  }, [])

  // Toggle a category on/off
  const toggleCat = useCallback((cat: EventCategory) => {
    setEnabledCats((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }, [])

  // ----------------------------------------------------------
  //  Render
  // ----------------------------------------------------------
  if (loading) return <EventsSkeleton />
  if (error) return <div className="text-red-600 text-sm">{error}</div>

  return (
    <div className="min-h-dvh bg-slate-50 font-sans">
      <Sidebar
        active="events"
        onNavigate={handleNavigate}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      <div className="lg:pl-60">
        <Topbar
          student={student}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onProfile={onProfile}
          onLogout={onLogout}
        />
        <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 min-w-0 space-y-6">
          {/* Page header */}
          <div>
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 mb-3"
            >
              <ChevronRight className="w-4 h-4 rotate-180" /> Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Events</h1>
            <p className="text-sm text-slate-500 mt-1">
              School events and deadlines &bull; AY {student.academicYear}
            </p>
          </div>

          {/* Desktop 2-column: calendar (2/3) + rail (1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ============================ CALENDAR COLUMN ============================ */}
            <div className="lg:col-span-2 space-y-4">
              {/* Task overlay toggle */}
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {/* Legend chips — click to toggle category */}
                  {(Object.keys(CATEGORY_LABELS) as EventCategory[]).map((cat) => {
                    const on = enabledCats.has(cat)
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCat(cat)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                          on
                            ? `${CATEGORY_PILL_STYLES[cat]}`
                            : 'bg-white text-slate-400 border-slate-200'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${on ? CATEGORY_COLORS[cat] : 'bg-slate-300'}`} />
                        {CATEGORY_LABELS[cat]}
                      </button>
                    )
                  })}
                  {showTasks && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200">
                      <span className={`w-2 h-2 rounded-full ${TASK_DUE_COLOR}`} />
                      Tasks due
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowTasks((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    showTasks ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                  aria-label="Toggle task due dates"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showTasks ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-slate-500 -mt-2">
                Show my task due dates
              </p>

              {/* Calendar card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Calendar header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-900">
                    {MONTH_LABELS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={goPrev}
                      aria-label="Previous month"
                      className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 inline-flex items-center justify-center"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={goToday}
                      className="h-8 rounded-lg border border-slate-200 px-4 text-sm font-medium text-blue-600 hover:bg-blue-50"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      aria-label="Next month"
                      className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 inline-flex items-center justify-center"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Weekday row */}
                <div className="grid grid-cols-7 border-b border-slate-100">
                  {WEEKDAY_LABELS.map((d) => (
                    <div
                      key={d}
                      className="py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {/* Day grid */}
                {monthHasEvents || showTasks ? (
                  <div className="grid grid-cols-7">
                    {grid.map((day, i) => {
                      const dayMid = atMidnight(day)
                      const isOtherMonth = day.getMonth() !== viewMonth.getMonth()
                      const isToday = dayMid.getTime() === today.getTime()
                      const isSelected = selectedDay
                        ? dayMid.getTime() === atMidnight(selectedDay).getTime()
                        : false
                      const key = dayMid.toISOString().slice(0, 10)
                      const dayEvents = (eventsByDate.get(key) || []).filter((ev) =>
                        enabledCats.has(ev.category)
                      )
                      const dayTasks = showTasks ? (tasksByDate.get(key) || []) : []

                      // Build up to 3 dots (categories present + amber task dot)
                      const dots: { color: string; title: string }[] = []
                      const catsPresent = new Set(dayEvents.map((e) => e.category))
                      for (const cat of catsPresent) {
                        dots.push({ color: CATEGORY_COLORS[cat], title: CATEGORY_LABELS[cat] })
                      }
                      if (dayTasks.length > 0) {
                        dots.push({ color: TASK_DUE_COLOR, title: 'Tasks due' })
                      }
                      const overflow = Math.max(0, dots.length - 3)
                      const visibleDots = dots.slice(0, 3)

                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedDay(dayMid)}
                          className={`relative min-h-[88px] sm:min-h-[96px] p-1.5 border-b border-r border-slate-100 text-left transition-colors ${
                            isOtherMonth ? 'bg-slate-50/40' : 'bg-white'
                          } hover:bg-blue-50/40 ${isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`inline-flex items-center justify-center text-xs font-medium ${
                                isToday
                                  ? 'w-6 h-6 rounded-full bg-blue-600 text-white'
                                  : isOtherMonth
                                  ? 'text-slate-300'
                                  : 'text-slate-700'
                              }`}
                            >
                              {day.getDate()}
                            </span>
                          </div>
                          {/* Dots */}
                          {visibleDots.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {visibleDots.map((dot, di) => (
                                <span
                                  key={di}
                                  className={`w-1.5 h-1.5 rounded-full ${dot.color}`}
                                  title={dot.title}
                                />
                              ))}
                              {overflow > 0 && (
                                <span className="text-[9px] text-slate-400 font-medium">
                                  +{overflow}
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="py-16 text-center">
                    <p className="text-sm text-slate-500">No events this month.</p>
                  </div>
                )}
              </div>

              {/* Day details panel */}
              {selectedDay && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Events on {formatFullDate(selectedDay)}
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {selectedDayEvents.length === 0 && selectedDayTasks.length === 0 && (
                      <div className="px-6 py-8 text-center">
                        <p className="text-sm text-slate-500">No events on this day.</p>
                      </div>
                    )}
                    {selectedDayEvents.map((ev) => (
                      <div key={ev._id} className="px-6 py-3 flex items-start gap-3">
                        <span
                          className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${CATEGORY_COLORS[ev.category]}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900">{ev.title}</p>
                          {ev.description && (
                            <p className="text-xs text-slate-500 mt-0.5">{ev.description}</p>
                          )}
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border flex-shrink-0 ${
                            CATEGORY_PILL_STYLES[ev.category]
                          }`}
                        >
                          {CATEGORY_LABELS[ev.category]}
                        </span>
                      </div>
                    ))}
                    {/* Task due dates subheading */}
                    {showTasks && selectedDayTasks.length > 0 && (
                      <>
                        <div className="px-6 pt-3 pb-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">
                            Tasks due
                          </p>
                        </div>
                        {selectedDayTasks.map((task) => {
                          const { variant, sub } = computeStatus(task)
                          return (
                            <div
                              key={task._id}
                              className="px-6 py-3 flex items-center gap-3"
                            >
                              <span
                                className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${TASK_DUE_COLOR}`}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-slate-900">
                                  {task.title}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {task.subjectCode} &bull; Task due
                                </p>
                              </div>
                              {/* Inline status pill for overdue / closed-missing tasks */}
                              {(variant === 'MISSING_OPEN' || variant === 'MISSING_CLOSED' || variant === 'GRADED' || variant === 'PENDING') && (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border flex-shrink-0 ${
                                    VARIANT_COLORS[variant]
                                  }`}
                                >
                                  {sub}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            {/* ============================ RIGHT RAIL ============================ */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden sticky top-20">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-base font-semibold text-slate-900">Upcoming events</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Next 8 events from today</p>
                </div>
                <div className="max-h-[600px] overflow-auto">
                  {upcoming.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-sm text-slate-500">No upcoming events.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {upcoming.map((ev) => {
                        const d = new Date(ev.date)
                        return (
                          <button
                            key={ev._id}
                            type="button"
                            onClick={() => jumpTo(d)}
                            className="w-full px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
                          >
                            {/* Date block */}
                            <div className="flex-shrink-0 w-12 text-center">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                {formatMonthDay(d).split(' ')[0]}
                              </p>
                              <p className="text-lg font-bold text-slate-900 leading-none">
                                {d.getDate()}
                              </p>
                            </div>
                            {/* Title + category */}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {ev.title}
                              </p>
                              <span
                                className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                                  CATEGORY_PILL_STYLES[ev.category]
                                }`}
                              >
                                {CATEGORY_LABELS[ev.category]}
                              </span>
                            </div>
                            <ChevronDown className="w-4 h-4 text-slate-300 -rotate-90 flex-shrink-0" />
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
