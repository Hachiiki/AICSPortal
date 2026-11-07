'use client'

import { useEffect, useRef } from 'react'
import { ArrowLeft, ArrowUpRight, Bell } from 'lucide-react'
import { toast } from 'sonner'
import { formatNotifTime, type NotificationInbox } from '@/lib/aics/notifications'
import { usePortalRoute } from '@/lib/aics/use-portal-route'
import type { Student } from '@/lib/aics/types'

export function NotificationsPage({ student, inbox, onHome }: {
  student: Student
  inbox: NotificationInbox
  onHome: () => void
}) {
  const { navigate } = usePortalRoute()
  const heading = useRef<HTMLHeadingElement>(null)
  const unread = inbox.notifications.filter(item => !item.read).length

  useEffect(() => {
    window.scrollTo(0, 0)
    heading.current?.focus({ preventScroll: true })
  }, [])

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 pb-6 pt-3 sm:px-6 sm:pt-5">
      <button type="button" onClick={onHome} className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-link-strong focus-visible:ring-2 focus-visible:ring-link">
        <ArrowLeft className="size-4" aria-hidden="true" /> Back to dashboard
      </button>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <h1 ref={heading} tabIndex={-1} className="text-2xl font-bold tracking-tight text-slate-900 outline-none">Notifications</h1>
          <p className="mt-1 text-sm text-slate-600" role="status">{unread ? `${unread} unread` : 'No unread notifications'}</p>
        </div>
        {inbox.notifications.length > 0 && (
          <button type="button" disabled={!unread || inbox.marking || inbox.loading} onClick={() => inbox.onMark(undefined, true)}
            className="min-h-11 rounded-lg px-3 text-sm font-semibold text-link-strong hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-link disabled:opacity-50 disabled:hover:bg-transparent">
            {inbox.marking ? 'Updating…' : 'Mark all read'}
          </button>
        )}
      </div>

      {inbox.error && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-4 py-2">
          <p role="alert" className="text-sm text-slate-700">{inbox.error}</p>
          <button type="button" onClick={inbox.onRefresh} disabled={inbox.loading} className="min-h-11 rounded-md px-2 text-sm font-semibold text-link-strong focus-visible:ring-2 focus-visible:ring-link disabled:opacity-50">Retry</button>
        </div>
      )}
      {inbox.markError && <p role="alert" className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-slate-700">{inbox.markError}</p>}
      {inbox.notifications.length === 0 && !inbox.error && (
        <div className="rounded-xl border border-line bg-surface px-4 py-8 text-center text-sm text-slate-600" role="status">
          <Bell className="mx-auto mb-2 size-5" aria-hidden="true" />
          {inbox.loading ? 'Loading notifications…' : 'You are all caught up.'}
        </div>
      )}
      {inbox.notifications.length > 0 && (
        <ul className="space-y-3" aria-label="Notification messages">
          {inbox.notifications.map(item => (
            <li key={item._id} className="min-w-0 rounded-xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                <h2 className="min-w-0 break-words font-semibold text-slate-900">{item.title}</h2>
                {!item.read && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-link-strong">Unread</span>}
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">{item.body}</p>
              <p className="mt-2 break-words text-xs leading-relaxed text-slate-600">
                {[item.fromName, item.subjectCode, formatNotifTime(item.createdAt)].filter(Boolean).join(' · ')}
              </p>
              {item.taskId ? (
                <button type="button" onClick={() => {
                  if (!item.read) {
                    void inbox.onMark(item._id).then(marked => {
                      if (!marked) toast.error('Could not mark this notification as read.')
                    })
                  }
                  navigate({ view: 'academics', branch: student.branch, username: student.username, role: 'student', tab: 'tasks', subjectCode: item.subjectCode, taskId: item.taskId! })
                }} className="mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-semibold text-link-strong focus-visible:ring-2 focus-visible:ring-link">
                  Open task <ArrowUpRight className="size-4" aria-hidden="true" />
                </button>
              ) : !item.read && (
                <button type="button" disabled={inbox.marking || inbox.loading} onClick={() => inbox.onMark(item._id)} className="mt-1 min-h-11 rounded-md text-sm font-semibold text-link-strong focus-visible:ring-2 focus-visible:ring-link disabled:opacity-50">Mark as read</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
