'use client'

import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import type { Task } from '@/lib/aics/tasks'
import { computeStatus, VARIANT_COLORS } from '@/lib/aics/tasks'
import type { PortalEvent, EventCategory } from '@/lib/aics/events'
import {
  CATEGORY_COLORS,
  CATEGORY_PILL_STYLES,
  CATEGORY_LABELS,
  TASK_DUE_COLOR,
} from '@/lib/aics/events'

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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Calendar header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">
          {MONTH_LABELS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous month"
            className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 inline-flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onToday}
            className="h-8 rounded-lg border border-slate-200 px-4 text-sm font-medium text-blue-600 hover:bg-blue-50"
          >
            Today
          </button>
          <button
            type="button"
            onClick={onNext}
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
                onClick={() => onSelectDay(dayMid)}
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
}

export function DayDetailsPanel({ selectedDay, events, tasks, showTasks }: DayDetailsPanelProps) {
  return (
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
        {events.length === 0 && tasks.length === 0 && (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-slate-500">No events on this day.</p>
          </div>
        )}
        {events.map((ev) => (
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
        {showTasks && tasks.length > 0 && (
          <>
            <div className="px-6 pt-3 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">
                Tasks due
              </p>
            </div>
            {tasks.map((task) => {
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
                  onClick={() => onJumpTo(d)}
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
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {/* Legend chips — click to toggle category */}
          {(Object.keys(CATEGORY_LABELS) as EventCategory[]).map((cat) => {
            const on = enabledCats.has(cat)
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onToggleCat(cat)}
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
          onClick={onToggleTasks}
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
    </>
  )
}
