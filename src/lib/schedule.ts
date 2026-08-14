// ============================================================
//  Schedule — types, color tokens, grid constants, and helpers
//  for the weekly calendar and the "Today's Classes" sidebar.
//
//  All schedule DATA now comes from MongoDB (courses + sessions
//  collections, fetched via /api/student). This module only
//  provides: types, color styles, grid geometry, and pure
//  date/time formatting helpers. There are NO hardcoded course
//  or session arrays here anymore.
// ============================================================

export type CourseColor = 'blue' | 'green' | 'amber' | 'violet' | 'red'

export interface Course {
  code: string
  title: string
  /** Compact title for calendar cards where space is limited. */
  shortTitle: string
  color: CourseColor
}

/** day: 0 = Monday … 5 = Saturday. start/end are decimal hours (e.g. 13.5 = 1:30 PM). */
export interface Session {
  code: string
  day: 0 | 1 | 2 | 3 | 4 | 5
  start: number
  end: number
  room: string
}

// ------------------------------------------------------------
//  Color styles — FULL literal Tailwind class strings so the
//  Tailwind v4 JIT keeps them in the build (no dynamic
//  interpolation of class names).
// ------------------------------------------------------------
export const COLOR_STYLES: Record<
  CourseColor,
  { dot: string; bg: string; border: string; code: string }
> = {
  blue: { dot: 'bg-blue-600', bg: 'bg-blue-50', border: 'border-blue-500', code: 'text-blue-700' },
  green: { dot: 'bg-green-600', bg: 'bg-green-50', border: 'border-green-600', code: 'text-green-700' },
  amber: { dot: 'bg-amber-500', bg: 'bg-amber-50', border: 'border-amber-500', code: 'text-amber-700' },
  violet: { dot: 'bg-violet-600', bg: 'bg-violet-50', border: 'border-violet-500', code: 'text-violet-700' },
  red: { dot: 'bg-red-500', bg: 'bg-red-50', border: 'border-red-400', code: 'text-red-700' },
}

// ------------------------------------------------------------
//  Grid constants
// ------------------------------------------------------------
export const START_HOUR = 8 // first row = 8:00 AM
export const HOURS = 8 // rows: 8 AM, 9 AM, 10 AM, 11 AM, 12 PM, 1 PM, 2 PM, 3 PM
export const HOUR_HEIGHT = 64 // px per hour row — tall enough for readable event cards

export const DAY_SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const
export const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

// ------------------------------------------------------------
//  Data lookup helpers — now accept the data as parameters
//  (no module-level constants). Both return empty / fallback
//  values when the data hasn't loaded yet.
// ------------------------------------------------------------

/** Look up a course by code from a provided courses array. */
export function getCourse(code: string, courses: Course[]): Course {
  return courses.find((c) => c.code === code) ?? { code, title: code, shortTitle: code, color: 'blue' }
}

/** Sessions for a given day index (0 = Mon), sorted by start time. */
export function getSessionsForDay(day: number, sessions: Session[]): Session[] {
  return sessions.filter((s) => s.day === day).sort((a, b) => a.start - b.start)
}

// ------------------------------------------------------------
//  Date / time helpers (pure functions, no data dependencies)
// ------------------------------------------------------------

/** Returns the Monday of the week containing `date` (local time). */
export function getMonday(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 = Sun, 1 = Mon … 6 = Sat
  const diff = day === 0 ? -6 : 1 - day // shift to Monday
  d.setDate(d.getDate() + diff)
  return d
}

/** Returns the 6 dates Mon–Sat for the week whose Monday is `anchor`. */
export function getWeekDays(anchor: Date): Date[] {
  const days: Date[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(anchor)
    d.setDate(anchor.getDate() + i)
    days.push(d)
  }
  return days
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "May 12 – May 17, 2025" */
export function formatWeekRange(days: Date[]): string {
  const start = days[0]
  const end = days[days.length - 1]
  const sameMonth = start.getMonth() === end.getMonth()
  const sameYear = start.getFullYear() === end.getFullYear()
  const startStr = `${MONTH_ABBR[start.getMonth()]} ${start.getDate()}`
  const endStr = sameMonth
    ? `${MONTH_ABBR[end.getMonth()]} ${end.getDate()}`
    : `${MONTH_ABBR[end.getMonth()]} ${end.getDate()}`
  const year = sameYear ? end.getFullYear() : `${start.getFullYear()} – ${end.getFullYear()}`
  return `${startStr} – ${endStr}, ${year}`
}

/** Convert a decimal hour to a 12-hour clock string.  8 → "8:00 AM", 13.5 → "1:30 PM" */
function hourTo12(h: number): string {
  const hour = Math.floor(h)
  const min = Math.round((h - hour) * 60)
  const period = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${hour12}:${min.toString().padStart(2, '0')} ${period}`
}

/** "8:00 – 9:30 AM"  (collapses the shared AM/PM suffix when both match) */
export function formatRangeTime(start: number, end: number): string {
  const s = hourTo12(start)
  const e = hourTo12(end)
  // If both share the same AM/PM suffix, drop it from the start portion.
  if (s.endsWith('AM') && e.endsWith('AM')) return `${s.replace(' AM', '')} – ${e}`
  if (s.endsWith('PM') && e.endsWith('PM')) return `${s.replace(' PM', '')} – ${e}`
  return `${s} – ${e}`
}

/** Hour label for the gutter axis.  8 → "8:00 AM", 13 → "1:00 PM" */
export function formatHourLabel(hour: number): string {
  return hourTo12(hour)
}

/** "May 12, Monday" — uses full day name including Sunday. */
export function formatSidebarDate(date: Date): string {
  const month = MONTH_ABBR[date.getMonth()]
  const day = date.getDate()
  const dow = date.getDay() // 0=Sun … 6=Sat
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return `${month} ${day}, ${dayNames[dow]}`
}

/** Day-of-week index for a real Date: 0 = Mon … 5 = Sat, -1 = Sunday (no classes). */
export function dateToDayIndex(date: Date): number {
  const dow = date.getDay() // 0=Sun … 6=Sat
  return dow === 0 ? -1 : dow - 1
}
