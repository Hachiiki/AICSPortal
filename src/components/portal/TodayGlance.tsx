'use client'

import { useMemo } from 'react'
import { Clock, Megaphone } from 'lucide-react'
import type { Task } from '@/lib/aics/tasks'
import type { Announcement } from '@/lib/aics/announcements'
import {
  getSessionsForDay,
  getCourse,
  dateToDayIndex,
  type Session,
  type Course,
} from '@/lib/schedule'
import type { View } from '@/lib/aics/types'

interface TodayGlanceProps {
  courses: Course[]
  sessions: Session[]
  tasks?: Task[]
  announcements?: Announcement[]
  announcementReadIds?: string[]
  onNavigate: (view: View) => void
}

/**
 * "Today at a glance" — the three-tile strip on the student dashboard
 * (Superdesign draft dashboard-v1-today, integrated).
 *
 * Tiles: next class (live countdown from the real clock), pending
 * tasks (with the nearest due date), and unread announcements.
 * All data comes from props the dashboard already receives — there
 * is no extra fetch.
 *
 * `today` is resolved client-side with the same hydration-safe guard
 * as TodaysClasses: server render and first client render agree
 * (placeholder state), then the real clock takes over.
 */
export function TodayGlance({ courses, sessions, tasks, announcements, announcementReadIds, onNavigate }: TodayGlanceProps) {
  const nowMinutes = useMemo(() => {
    if (typeof window === 'undefined') return null
    return new Date().getHours() * 60 + new Date().getMinutes()
  }, [])

  // ---- Next class: first session today whose end time is still ahead
  const nextClass = useMemo(() => {
    if (nowMinutes === null) return null
    const day = dateToDayIndex(new Date())
    if (day < 0) return null
    const today = getSessionsForDay(day, sessions)
      .filter((s) => s.end > nowMinutes)
      .sort((a, b) => a.start - b.start)
    if (today.length === 0) return null
    const s = today[0]
    const course = getCourse(s.code, courses)
    const minsToStart = s.start - nowMinutes
    let until: string
    if (minsToStart > 0) {
      const h = Math.floor(minsToStart / 60)
      const m = minsToStart % 60
      until = h > 0 ? `in ${h}h ${m}m` : `in ${m}m`
    } else {
      until = 'now'
    }
    return { code: s.code, title: course.title, room: s.room, start: s.start, end: s.end, until }
  }, [nowMinutes, sessions, courses])

  // ---- Pending tasks + nearest due date
  const pending = useMemo(() => {
    if (!tasks) return null
    const open = tasks.filter((t) => !t.submitted && !t.submissionsClosed)
    if (open.length === 0) return { count: 0, nextDue: null as string | null }
    const next = open
      .slice()
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]
    const due = new Date(next.dueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const days = Math.round((due.getTime() - today.getTime()) / 86400000)
    let label: string
    if (days < 0) label = 'overdue'
    else if (days === 0) label = 'due today'
    else if (days === 1) label = 'due tomorrow'
    else label = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return { count: open.length, nextDue: `${next.title} — ${label}` }
  }, [tasks])

  // ---- Unread announcements
  const unread = useMemo(() => {
    if (!announcements) return null
    const ids = new Set(announcementReadIds ?? [])
    return announcements.filter((a) => !ids.has(a._id)).length
  }, [announcements, announcementReadIds])

  return (
    <section aria-label="Today at a glance" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Next class */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Next class</p>
          {nextClass && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 flex-shrink-0">
              <Clock className="w-3.5 h-3.5" /> {nextClass.until}
            </span>
          )}
        </div>
        {nextClass ? (
          <>
            <p className="mt-2 text-sm font-semibold text-slate-900 truncate">{nextClass.title}</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate font-mono">{nextClass.code} • {nextClass.room}</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No more classes today</p>
        )}
      </div>

      {/* Tasks */}
      <button
        type="button"
        onClick={() => onNavigate('academics')}
        className="group text-left bg-white rounded-xl border border-slate-200 shadow-sm p-4 min-w-0 hover:border-blue-200 focus-visible:border-blue-600 outline-none"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tasks</p>
          {pending && pending.count > 0 && (
            <span className="size-6 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold grid place-items-center flex-shrink-0">
              {pending.count}
            </span>
          )}
        </div>
        {pending === null ? (
          <p className="mt-2 text-sm text-slate-500">Tasks loading…</p>
        ) : pending.count === 0 ? (
          <p className="mt-2 text-sm font-semibold text-slate-900">All caught up</p>
        ) : (
          <>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {pending.count} pending
            </p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{pending.nextDue}</p>
          </>
        )}
        <p className="mt-3 text-xs font-medium text-blue-700 group-hover:underline">Review tasks</p>
      </button>

      {/* Announcements */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Announcements</p>
          {unread !== null && unread > 0 && (
            <span className="size-6 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold grid place-items-center flex-shrink-0">
              {unread}
            </span>
          )}
        </div>
        {unread === null ? (
          <p className="mt-2 text-sm text-slate-500">Announcements loading…</p>
        ) : unread === 0 ? (
          <p className="mt-2 text-sm font-semibold text-slate-900">You&apos;re all caught up</p>
        ) : (
          <>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {unread} new for you
            </p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              Latest: {announcements?.find((a) => !(announcementReadIds ?? []).includes(a._id))?.title ?? 'See the deck above'}
            </p>
          </>
        )}
        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <Megaphone className="w-3.5 h-3.5" /> In the deck above
        </div>
      </div>
    </section>
  )
}
