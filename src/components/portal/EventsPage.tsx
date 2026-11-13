'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { ChevronLeft, SlidersHorizontal } from 'lucide-react'
import type { Student, View } from '@/lib/aics/types'
import type { Task } from '@/lib/aics/tasks'
import type { NotificationInbox } from '@/lib/aics/notifications'
import type { PortalEvent, EventCategory } from '@/lib/aics/events'
import type { Professor } from '@/lib/aics/professors'
import { usePhoneViewport } from '@/lib/aics/use-phone-viewport'
import { usePortalRoute } from '@/lib/aics/use-portal-route'
import { PortalShell } from './PortalShell'
import { EventsSkeleton } from './Skeleton'
import {
  CalendarGrid,
  DayDetailsPanel,
  UpcomingRail,
  LegendChips,
  atMidnight,
  buildCalendarGrid,
} from './EventsPageParts'

interface EventsPageProps {
  student: Student
  onNavigate: (view: View) => void
  onLogout: () => void
  // Events + tasks data is lifted to the parent (StudentDataWrapper)
  // so it persists across route switches. This page no longer fetches
  // its own data — it receives events and tasks as props.
  events: PortalEvent[]
  eventsLoading: boolean
  eventsError: string | null
  tasks: Task[]
  // UI preferences (toggle + category filter) are also lifted to the
  // parent so they survive route switches.
  showTasks: boolean
  setShowTasks: React.Dispatch<React.SetStateAction<boolean>>
  enabledCats: Set<EventCategory>
  setEnabledCats: React.Dispatch<React.SetStateAction<Set<EventCategory>>>
  // Search index collections — lifted in the parent so the
  // Topbar's global search works the same on every screen.
  professors?: Professor[]
  inbox?: NotificationInbox
}

// ============================================================
//  EventsPage — school calendar with task-due overlay.
//  Sub-components (CalendarGrid, DayDetailsPanel, UpcomingRail,
//  LegendChips) are in EventsPageParts.tsx.
// ============================================================

export function EventsPage({ student, onNavigate, onLogout, events, eventsLoading, eventsError, tasks, showTasks, setShowTasks, enabledCats, setEnabledCats, professors, inbox }: EventsPageProps) {
  // Calendar view state
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const phone = usePhoneViewport()
  const { navigate } = usePortalRoute()

  useEffect(() => {
    if (!phone || !selectedDay) return
    const agenda = document.getElementById('student-calendar-day')
    agenda?.scrollIntoView({ block: 'start', behavior: 'auto' })
    agenda?.focus({ preventScroll: true })
  }, [phone, selectedDay])

  // showTasks + enabledCats are now lifted to the parent (StudentDataWrapper)
  // so they persist across route switches.

  // Sidebar navigation — just delegate to onNavigate.
  const handleNavigate = (v: View) => {
    onNavigate(v)
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

  // Task due dates are merged client-side from the student's
  // Tasks data; they are NOT stored as Event documents.
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of tasks) {
      const key = atMidnight(new Date(t.dueDate)).toISOString().slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return map
  }, [tasks])

  const grid = useMemo(
    () => buildCalendarGrid(viewMonth.getFullYear(), viewMonth.getMonth()),
    [viewMonth]
  )

  const today = useMemo(() => atMidnight(new Date()), [])

  const monthHasEvents = useMemo(() => {
    const y = viewMonth.getFullYear()
    const m = viewMonth.getMonth()
    for (const ev of events) {
      const d = new Date(ev.date)
      if (d.getFullYear() === y && d.getMonth() === m) return true
      if (ev.endDate) {
        const e = new Date(ev.endDate)
        if (e.getFullYear() === y && e.getMonth() === m) return true
      }
    }
    return false
  }, [events, viewMonth])

  const upcoming = useMemo(() => {
    return events
      .filter((ev) => atMidnight(new Date(ev.date)) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 8)
  }, [events, today])

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

  const jumpTo = useCallback((date: Date) => {
    const d = atMidnight(date)
    setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1))
    setSelectedDay(d)
  }, [])

  const toggleCat = useCallback((cat: EventCategory) => {
    setEnabledCats((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }, [setEnabledCats])

  if (eventsLoading) return <EventsSkeleton />
  if (eventsError) return <div className="text-red-600 text-sm">{eventsError}</div>

  return (
    <PortalShell
      student={student}
      active="events"
      onNavigate={handleNavigate}
      onLogout={onLogout}
      events={events}
      professors={professors}
      tasks={tasks}
      inbox={inbox}
    >
        <main data-tour="events-page" className="min-w-0 space-y-[16px] px-[16px] py-[20px] sm:space-y-6 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {/* Page header */}
          <div>
            <button
              onClick={() => onNavigate('dashboard')}
              className="mb-3 hidden items-center gap-2 text-sm font-semibold text-link hover:text-link-strong sm:inline-flex"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Dashboard
            </button>
            <div className="flex flex-wrap items-center justify-between gap-[8px]">
              <h1 className="text-2xl font-bold tracking-tight text-balance text-slate-900">Events</h1>
              <button type="button" aria-label="Calendar filters" aria-expanded={filtersOpen} aria-controls="student-calendar-filters"
                className="student-calendar-filter-toggle hidden min-h-[44px] items-center gap-[6px] rounded-lg border border-line bg-surface px-[10px] text-xs font-semibold text-link-strong focus-visible:ring-2 focus-visible:ring-link"
                onClick={() => setFiltersOpen(open => !open)}>
                <SlidersHorizontal className="size-[16px]" aria-hidden="true" /> Filters
              </button>
            </div>
            <p className="student-academic-term mt-1 text-sm text-slate-500">
              <span className="student-events-description">School events and deadlines &bull; </span>AY {student.academicYear}
            </p>
          </div>

          {/* Desktop 2-column: calendar (2/3) + rail (1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ============================ CALENDAR COLUMN ============================ */}
            <div className="lg:col-span-2 space-y-4">
              <div id="student-calendar-filters" className={`space-y-4 ${filtersOpen ? '' : 'student-calendar-filters-collapsed'}`}>
                <LegendChips
                  enabledCats={enabledCats}
                  showTasks={showTasks}
                  onToggleCat={toggleCat}
                  onToggleTasks={() => setShowTasks((v) => !v)}
                />
              </div>

              <CalendarGrid
                viewMonth={viewMonth}
                grid={grid}
                today={today}
                selectedDay={selectedDay}
                eventsByDate={eventsByDate}
                tasksByDate={tasksByDate}
                enabledCats={enabledCats}
                showTasks={showTasks}
                onPrev={goPrev}
                onNext={goNext}
                onToday={goToday}
                onSelectDay={setSelectedDay}
                monthHasEvents={monthHasEvents}
              />

              {selectedDay && (
                <DayDetailsPanel
                  selectedDay={selectedDay}
                  events={selectedDayEvents}
                  tasks={selectedDayTasks}
                  showTasks={showTasks}
                  onReturn={() => {
                    const calendar = document.getElementById('student-calendar')
                    calendar?.scrollIntoView({ block: 'start', behavior: 'auto' })
                    const target = calendar?.querySelector<HTMLElement>('[aria-current="date"]') ?? calendar
                    target?.focus({ preventScroll: true })
                  }}
                  onOpenTask={task => navigate({ view: 'academics', role: 'student', branch: student.branch, username: student.username, tab: 'tasks', subjectCode: task.subjectCode, taskId: task._id })}
                />
              )}
            </div>

            {/* ============================ RIGHT RAIL ============================ */}
            <div className="lg:col-span-1">
              <UpcomingRail upcoming={upcoming} onJumpTo={jumpTo} />
            </div>
          </div>
        </main>
    </PortalShell>
  )
}
