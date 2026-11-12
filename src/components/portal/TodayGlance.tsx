'use client'

import type { ReactNode } from 'react'
import { CalendarClock, ChevronRight, ClipboardList, Megaphone, type LucideIcon } from 'lucide-react'
import type { Announcement } from '@/lib/aics/announcements'
import { canSubmit, computeStatus, type Task } from '@/lib/aics/tasks'
import type { View } from '@/lib/aics/types'
import { usePortalRoute } from '@/lib/aics/use-portal-route'
import { dateToDayIndex, formatRangeTime, getCourse, getSessionsForDay, type Course, type Session } from '@/lib/schedule'

interface TodayGlanceProps {
  courses: Course[]
  sessions: Session[]
  tasks?: Task[]
  announcements?: Announcement[]
  announcementReadIds?: string[]
  onNavigate: (view: View) => void
}

function GlanceRow({ icon: Icon, label, title, detail, status, urgent, action, onClick }: {
  icon: LucideIcon
  label: string
  title: string
  detail?: ReactNode
  status?: string
  urgent?: boolean
  action: string
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-[12px] px-[14px] py-[12px] text-left first:rounded-t-2xl last:rounded-b-2xl hover:bg-blue-50 focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-link sm:block sm:rounded-xl sm:border sm:border-line sm:bg-surface sm:p-4 sm:shadow-sm">
      <span className="grid size-[36px] shrink-0 place-items-center rounded-lg bg-blue-50 text-link-strong sm:hidden">
        <Icon className="size-[18px]" aria-hidden="true" />
      </span>
      <span className="student-glance-content block min-w-0">
        <span className="student-glance-label col-start-2 row-start-1 flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 text-xs font-semibold">
          <span className="text-muted-fg [overflow-wrap:anywhere] sm:uppercase sm:tracking-wide">{label}</span>
          {status && <span className={urgent ? 'rounded bg-red-50 px-1.5 py-0.5 text-red-700' : 'text-link-strong'}>{status}</span>}
        </span>
        <span className="student-glance-details row-start-2 block min-w-0">
          <span className="mt-0.5 block text-sm font-semibold text-ink [overflow-wrap:anywhere] sm:mt-2">{title}</span>
          {detail && <span className="mt-0.5 block text-xs leading-normal text-muted-fg [overflow-wrap:anywhere]">{detail}</span>}
          <span className="sr-only mt-3 text-xs font-medium text-link-strong sm:not-sr-only sm:block">{action}</span>
        </span>
      </span>
      <ChevronRight className="col-start-3 row-start-1 size-[16px] self-center text-muted-fg sm:hidden" aria-hidden="true" />
    </button>
  )
}

function focusDashboardSection(id: string) {
  const section = document.getElementById(id)
  section?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
  section?.focus({ preventScroll: true })
}

export function TodayGlance({ courses, sessions, tasks, announcements, announcementReadIds, onNavigate }: TodayGlanceProps) {
  const { route, navigate } = usePortalRoute()
  const now = new Date()
  const day = dateToDayIndex(now)
  const minutes = now.getHours() * 60 + now.getMinutes()
  const nextClass = day < 0 ? undefined : getSessionsForDay(day, sessions)
    .filter(session => session.end * 60 > minutes)
    .sort((a, b) => a.start - b.start)[0]
  const minutesToClass = nextClass ? Math.ceil(nextClass.start * 60 - minutes) : 0
  const classStatus = minutesToClass > 0 && minutesToClass < 60 ? `In ${minutesToClass} min` : undefined

  const openTasks = tasks?.filter(canSubmit).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
  const nextTask = openTasks?.[0]
  const overdue = nextTask && computeStatus(nextTask).variant === 'MISSING_OPEN'
  const overdueCount = openTasks?.filter(task => computeStatus(task).variant === 'MISSING_OPEN').length ?? 0
  let taskDetail: string | undefined
  if (nextTask) {
    const due = new Date(nextTask.dueDate)
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateLabel = due.toDateString() === now.toDateString() ? 'due today'
      : due.toDateString() === tomorrow.toDateString() ? 'due tomorrow'
      : `due ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    taskDetail = overdue ? nextTask.title : `${nextTask.title} · ${dateLabel}`
  }

  const readIds = new Set(announcementReadIds)
  const unread = announcements?.filter(announcement => !readIds.has(announcement._id))

  return (
    <section aria-label="Today at a glance">
      <h2 className="mb-[10px] text-lg font-bold tracking-tight text-ink sm:hidden">Today</h2>
      <div className="student-glance-list min-w-0 divide-y divide-line rounded-2xl border border-line bg-surface sm:grid sm:grid-cols-3 sm:gap-4 sm:divide-none sm:rounded-none sm:border-0 sm:bg-transparent">
        <GlanceRow icon={CalendarClock} label={nextClass && minutesToClass <= 0 ? 'Current class' : 'Next class'}
          title={nextClass ? getCourse(nextClass.code, courses).title : 'No more classes today'}
          detail={nextClass && <span className="flex flex-wrap gap-x-2"><span>{formatRangeTime(nextClass.start, nextClass.end)}</span>{nextClass.room && <span>{nextClass.room}</span>}</span>}
          status={nextClass ? classStatus : undefined} action="View class schedule" onClick={() => focusDashboardSection('student-schedule')} />
        <GlanceRow icon={ClipboardList} label="Tasks"
          title={!openTasks ? 'Loading tasks' : nextTask ? `${openTasks.length} open for submission` : 'Nothing to submit'}
          detail={taskDetail} status={overdueCount ? `${overdueCount} overdue` : undefined} urgent={overdueCount > 0} action="Review tasks" onClick={() => {
            if (route.view === 'login') onNavigate('academics')
            else navigate({ view: 'academics', branch: route.branch, username: route.username, role: route.role, tab: 'tasks' })
          }} />
        <GlanceRow icon={Megaphone} label="Campus announcements"
          title={!unread ? 'Loading announcements' : unread.length ? `${unread.length} unread` : 'You’re all caught up'}
          detail={unread?.[0]?.title} action="Read updates" onClick={() => focusDashboardSection('student-announcements')} />
      </div>
    </section>
  )
}
