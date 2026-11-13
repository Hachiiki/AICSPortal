'use client'

import { motion } from 'framer-motion'
import { ArrowUp, CalendarDays, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import type { Task } from '@/lib/aics/tasks'
import { canSubmit, computeStatus, VARIANT_COLORS } from '@/lib/aics/tasks'
import type { PortalEvent, EventCategory } from '@/lib/aics/events'
import {
  CATEGORY_COLORS,
  CATEGORY_PILL_STYLES,
  CATEGORY_LABELS,
  TASK_DUE_COLOR,
} from '@/lib/aics/events'
import { EmptyState } from './EmptyState'

// ============================================================
//  Calendar sub-components for EventsPage.
//  Extracted to reduce EventsPage.tsx from 502 lines / CRAP 210
//  to a manageable size.
// ============================================================

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const CATEGORY_MARKERS: Record<EventCategory, string> = {
  academic: `${CATEGORY_COLORS.academic} rounded-full`,
  deadline: `${CATEGORY_COLORS.deadline} rotate-45 rounded-[1px]`,
  campus: `${CATEGORY_COLORS.campus} rounded-[1px]`,
  holiday: 'rounded-full border-2 border-green-600',
}
const TASK_MARKER = `${TASK_DUE_COLOR} scale-y-50 rounded-full`

/** Strip time — compare dates by day only. */
export function atMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** "Aug 14" format for the upcoming rail. */
export function formatMonthDay(d: Date): string {
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${m[d.getMonth()]} ${d.getDate()}`
}

/** "August 14, 2026" — full date for the day details header. */
export function formatFullDate(d: Date): string {
  return `${MONTH_LABELS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

/**
 * Builds a 6×7 grid (42 cells) of Dates starting from the Sunday
 * before the 1st of the month. Includes trailing/leading days from
 * adjacent months (rendered dimmed).
 */
export function buildCalendarGrid(year: number, month: number): Date[] {
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

// ------------------------------------------------------------
//  CalendarGrid — the calendar card with month header, weekday
//  row, and 6×7 day grid with event/task dots.
// ------------------------------------------------------------

interface CalendarGridProps {
  viewMonth: Date
  grid: Date[]
  today: Date
  selectedDay: Date | null
  eventsByDate: Map<string, PortalEvent[]>
  tasksByDate: Map<string, Task[]>
  enabledCats: Set<EventCategory>
  showTasks: boolean
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onSelectDay: (day: Date) => void
  monthHasEvents: boolean
}

export function CalendarGrid({
  viewMonth, grid, today, selectedDay,
  eventsByDate, tasksByDate, enabledCats, showTasks,
  onPrev, onNext, onToday, onSelectDay, monthHasEvents,
}: CalendarGridProps) {
  return (
    <div id="student-calendar" data-tour="events-calendar" tabIndex={-1} className="student-card scroll-mt-3 overflow-hidden rounded-2xl border border-line bg-surface outline-none sm:rounded-xl sm:shadow-sm">
      {/* Calendar header */}
      <div className="flex flex-wrap items-center justify-between gap-[8px] px-[12px] py-[10px] sm:gap-3 sm:px-6 sm:py-4">
        <h2 className="student-section-title text-base font-semibold text-slate-900">
          {MONTH_LABELS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </h2>
        <div className="flex max-w-full flex-wrap items-center gap-[4px] sm:gap-2">
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous month"
            className="size-[44px] student-control rounded-lg border border-slate-200 bg-surface text-slate-600 hover:bg-slate-50 inline-flex items-center justify-center sm:size-8"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onToday}
            className="min-h-[44px] student-control rounded-lg border border-slate-200 px-[12px] text-sm font-medium text-link hover:bg-blue-50 sm:min-h-8 sm:px-4"
          >
            Today
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="Next month"
            className="size-[44px] student-control rounded-lg border border-slate-200 bg-surface text-slate-600 hover:bg-slate-50 inline-flex items-center justify-center sm:size-8"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="border-b border-line px-[12px] pb-[8px] student-text-detail text-xs text-muted-fg sm:px-6">Select a date.</p>

      {/* Weekday row */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {WEEKDAY_LABELS.map((d) => (
          <div
            key={d}
            className="py-[10px] text-center text-[length:min(0.6875rem,13px)] font-semibold uppercase tracking-wider text-slate-500 max-sm:text-[length:min(0.75rem,14px)] max-sm:normal-case max-sm:tracking-normal"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      {monthHasEvents || showTasks ? (
        <div data-tour="events-calendar-dates" className="grid grid-cols-7">
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
            const itemCount = dayEvents.length + dayTasks.length

            // The first two category markers accompany the total item count.
            const dots: { color: string; title: string }[] = []
            const catsPresent = new Set(dayEvents.map((e) => e.category))
            for (const cat of catsPresent) {
              dots.push({ color: CATEGORY_MARKERS[cat], title: CATEGORY_LABELS[cat] })
            }
            if (dayTasks.length > 0) dots.unshift({ color: TASK_MARKER, title: 'Tasks due' })
            const visibleDots = dots.slice(0, 2)

            return (
              <button
                key={i}
                type="button"
                onClick={() => onSelectDay(dayMid)}
                aria-label={(() => {
                  const dateLabel = dayMid.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                  return itemCount > 0
                    ? `${dateLabel}, ${itemCount} ${itemCount === 1 ? 'item' : 'items'} scheduled`
                    : `${dateLabel}, nothing scheduled`
                })()}
                aria-current={isSelected ? 'date' : undefined}
                className={`relative flex min-h-[44px] min-w-0 flex-col items-center justify-center border-b border-line px-[2px] py-[4px] text-center transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-link sm:min-h-[96px] sm:items-start sm:border-r sm:p-1.5 sm:text-left ${
                  itemCount > 0 ? 'bg-blue-50 hover:bg-blue-100' : isOtherMonth ? 'bg-slate-50/40 hover:bg-slate-100' : 'bg-surface hover:bg-slate-100'
                } ${isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
              >
                  <div className="flex max-w-full items-center justify-center sm:justify-between">
                  <span
                    className={`inline-flex items-center justify-center text-xs ${
                      isToday
                        ? 'min-h-[24px] min-w-[24px] rounded-full bg-blue-600 px-[3px] font-semibold leading-tight text-white'
                        : itemCount > 0
                        ? 'font-bold text-link-strong'
                        : isOtherMonth
                        ? 'font-medium text-slate-500'
                        : 'font-medium text-slate-700'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </div>
                {/* Dots — decorative; the button's accessible name
                    carries the day's item count. */}
                {visibleDots.length > 0 && (
                    <div className="mt-0.5 flex max-w-full items-center justify-center gap-[6px] sm:mt-1 sm:flex-wrap sm:justify-start" aria-hidden="true">
                    {visibleDots.map((dot, di) => (
                      <span
                        key={di}
                          className={`size-[8px] shrink-0 ${dot.color}`}
                        title={dot.title}
                      />
                    ))}
                  </div>
                )}
                {itemCount > 0 && <span className="mt-0.5 max-w-full text-[length:min(0.6875rem,13px)] font-semibold leading-tight tabular-nums text-link-strong [overflow-wrap:anywhere]" aria-hidden="true">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>}
              </button>
            )
          })}
        </div>
      ) : (
        <EmptyState icon={CalendarDays} message="No events this month." hint="School-wide events and activities appear here once posted." />
      )}
    </div>
  )
}

// ------------------------------------------------------------
//  DayDetailsPanel — shows events + tasks due for the selected day.
// ------------------------------------------------------------

interface DayDetailsPanelProps {
  selectedDay: Date
  events: PortalEvent[]
  tasks: Task[]
  showTasks: boolean
  onReturn: () => void
  onOpenTask: (task: Task) => void
}

export function DayDetailsPanel({ selectedDay, events, tasks, showTasks, onReturn, onOpenTask }: DayDetailsPanelProps) {
  const orderedTasks = [...tasks].sort((first, second) => Number(canSubmit(second)) - Number(canSubmit(first)))
  return (
    <motion.div
      id="student-calendar-day"
      tabIndex={-1}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="student-card scroll-mt-3 overflow-hidden rounded-xl border border-slate-200 bg-surface shadow-sm outline-none"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2 border-b border-slate-100 px-4 py-2 sm:px-6 sm:py-4">
        <div>
          <h3 className="student-section-title text-sm font-semibold text-slate-900">Events on {formatFullDate(selectedDay)}</h3>
          <p className="student-text-detail mt-0.5 text-xs text-muted-fg">{events.length} {events.length === 1 ? 'event' : 'events'} &middot; {tasks.length} {tasks.length === 1 ? 'coursework item' : 'coursework items'}</p>
        </div>
        <button type="button" onClick={onReturn} className="inline-flex min-h-11 items-center gap-1 rounded-md px-1 text-xs font-semibold text-link-strong focus-visible:outline-2 focus-visible:outline-link sm:hidden">
          <ArrowUp className="size-4" aria-hidden="true" /> Calendar
        </button>
      </div>
      <div className="divide-y divide-slate-100">
        {events.length === 0 && tasks.length === 0 && (
          <EmptyState compact icon={CalendarDays} message="No events on this day." />
        )}
        {events.map((ev) => (
          <div key={ev._id} className="px-6 py-3 flex items-start gap-3">
            <span
                  className={`mt-1 size-2 shrink-0 ${CATEGORY_MARKERS[ev.category]}`}
            />
            <div className="min-w-0 flex-1">
              <p className="student-item-title text-sm font-medium text-slate-900">{ev.title}</p>
              {ev.description && (
                <p className="student-text-detail text-xs text-slate-500 mt-0.5">{ev.description}</p>
              )}
            </div>
            <span
              className={`inline-flex items-center px-2 py-0.5 student-badge rounded-md text-xs font-medium border flex-shrink-0 ${
                CATEGORY_PILL_STYLES[ev.category]
              }`}
            >
              {CATEGORY_LABELS[ev.category]}
            </span>
          </div>
        ))}
        {/* Task due dates subheading */}
        {showTasks && tasks.length > 0 && (
          <>
            <div className="px-6 pt-3 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 max-sm:text-xs max-sm:normal-case max-sm:tracking-normal">
                Coursework
              </p>
            </div>
            {orderedTasks.map((task) => {
              const { variant, sub } = computeStatus(task)
              return (
                <button
                  key={task._id}
                  type="button"
                  onClick={() => onOpenTask(task)}
                  className="relative grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 px-4 py-3 text-left hover:bg-slate-50 focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-link sm:px-6"
                >
                  <span
                    className={`mt-1 size-2 shrink-0 ${TASK_MARKER}`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="student-item-title block text-sm font-medium text-slate-900 [overflow-wrap:anywhere]">
                      {task.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-fg">
                      {task.subjectCode}
                    </span>
                  </span>
                  <span
                      className={`col-start-2 row-start-2 justify-self-start student-badge rounded-md border px-2 py-0.5 text-xs font-medium ${
                        VARIANT_COLORS[variant]
                      }`}
                    >
                    {variant === 'MISSING_CLOSED' ? 'Missing · Closed' : variant === 'NEEDS_ATTENTION' ? 'Open for submission' : sub}
                  </span>
                  <ChevronRight className="col-start-3 row-span-2 row-start-1 size-4 self-center text-muted-fg" aria-hidden="true" />
                </button>
              )
            })}
          </>
        )}
      </div>
    </motion.div>
  )
}

// ------------------------------------------------------------
//  UpcomingRail — right sidebar listing next 8 events.
// ------------------------------------------------------------

interface UpcomingRailProps {
  upcoming: PortalEvent[]
  onJumpTo: (date: Date) => void
}

export function UpcomingRail({ upcoming, onJumpTo }: UpcomingRailProps) {
  return (
    <div className="student-card bg-surface rounded-xl border border-slate-200 shadow-sm overflow-hidden sticky top-20">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="student-section-title text-base font-semibold text-slate-900">Upcoming events</h3>
        <p className="student-text-detail text-xs text-slate-500 mt-0.5">Next 8 events from today</p>
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
                  onClick={() => onJumpTo(d)}
                  className="w-full px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
                >
                  {/* Date block */}
                  <div className="flex-shrink-0 w-12 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 max-sm:text-[length:min(0.75rem,14px)] max-sm:normal-case max-sm:tracking-normal">
                      {formatMonthDay(d).split(' ')[0]}
                    </p>
                    <p className="text-lg font-bold text-slate-900 leading-none">
                      {d.getDate()}
                    </p>
                  </div>
                  {/* Title + category */}
                  <div className="min-w-0 flex-1">
                    <p className="student-item-title text-sm font-medium text-slate-900 truncate">
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
  )
}

// ------------------------------------------------------------
//  LegendChips — category filter chips + task toggle.
// ------------------------------------------------------------

interface LegendChipsProps {
  enabledCats: Set<EventCategory>
  showTasks: boolean
  onToggleCat: (cat: EventCategory) => void
  onToggleTasks: () => void
}

export function LegendChips({ enabledCats, showTasks, onToggleCat, onToggleTasks }: LegendChipsProps) {
  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="student-calendar-legend flex min-w-0 flex-wrap gap-[6px] sm:gap-2">
          {/* Legend chips — click to toggle category */}
          {(Object.keys(CATEGORY_LABELS) as EventCategory[]).map((cat) => {
            const on = enabledCats.has(cat)
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onToggleCat(cat)}
                aria-pressed={on}
                className={`inline-flex min-h-[44px] items-center gap-[6px] student-control rounded-md border px-[8px] py-[4px] text-xs font-medium transition-colors sm:min-h-0 sm:px-2.5 ${
                  on
                    ? `${CATEGORY_PILL_STYLES[cat]}`
                    : 'bg-surface text-slate-500 border-slate-200'
                }`}
              >
                <span className={`size-[8px] shrink-0 ${CATEGORY_MARKERS[cat]} ${on ? '' : 'opacity-40'}`} aria-hidden="true" />
                {CATEGORY_LABELS[cat]}
              </button>
            )
          })}
          {showTasks && (
            <span className="hidden items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 sm:inline-flex">
              <span className={`size-2 ${TASK_MARKER}`} />
              Tasks due
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleTasks}
          role="switch"
          aria-checked={showTasks}
          aria-label="Show task due dates on the calendar"
          className="inline-flex min-h-[44px] items-center gap-[12px] rounded-md text-left student-text-detail text-xs text-slate-600"
        >
          <span
            aria-hidden="true"
            className={`relative inline-flex h-[24px] w-[44px] shrink-0 items-center rounded-full transition-colors ${showTasks ? 'bg-blue-600' : 'bg-slate-300'}`}
          >
            <span className={`inline-block size-[16px] rounded-full bg-surface transition-transform ${showTasks ? 'translate-x-[24px]' : 'translate-x-[4px]'}`} />
          </span>
          Show my task due dates
          {showTasks && <span className={`size-[8px] shrink-0 sm:hidden ${TASK_MARKER}`} aria-hidden="true" />}
        </button>
      </div>
    </>
  )
}
