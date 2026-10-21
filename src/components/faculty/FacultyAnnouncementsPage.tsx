'use client'

import { useState, useEffect, useMemo } from 'react'
import { Megaphone, Send, Loader2, ChevronDown, ChevronUp, CheckCircle2, Clock, ClipboardList } from 'lucide-react'
import { toast } from 'sonner'
import type { Student, View } from '@/lib/aics/types'
import type { PortalEvent } from '@/lib/aics/events'
import type { Professor } from '@/lib/aics/professors'
import type { Task } from '@/lib/aics/tasks'
import type { FacultyMember, FacultyStudent } from '@/lib/aics/faculty'
import {
  formatNotifTime,
  NOTIFICATION_RETENTION_DAYS,
  type NotificationInbox,
  type SentHistoryPage,
  type SentNotificationGroup,
} from '@/lib/aics/notifications'
import { useFacultyRows } from '@/lib/aics/use-faculty-rows'
import { PortalShell } from '../portal/PortalShell'
import { DashboardSkeleton } from '../portal/Skeleton'

interface FacultyAnnouncementsPageProps {
  student: Student
  onNavigate: (view: View) => void
  onLogout: () => void
  events?: PortalEvent[]
  professors?: Professor[]
  tasks?: Task[]
  facultyData?: { faculty: FacultyMember; subjects: any[]; students: FacultyStudent[] } | null
  facultyLoading?: boolean
  inbox?: NotificationInbox
  sentData?: SentHistoryPage | null
  sentLoading?: boolean
  sentError?: string | null
  onFetchSent?: (page?: number) => void
}

// ---- Sent-history helpers ------------------------------------------------
// One summary entry per TARGETED class block (what the compose form
// calls a "section"). A block's display name is its dominant student
// section (BS2AA — same derivation the roster uses), with subject
// codes standing in when names would collide or nothing resolves.

function recipientSummary(group: SentNotificationGroup): string {
  // Tiny sends (individual students): name the recipients directly.
  if (group.total <= 2) {
    const names = group.recipients.map((r) => r.fullName || r.username).join(' and ')
    return `Sent to ${names}`
  }
  const entries = group.sections.map((s) => ({
    name: s.sectionNames[0] || s.subjectCode,
    code: s.subjectCode,
    count: s.count,
  }))
  // Two blocks that both read "BS2AA" say nothing — fall back to
  // their (always distinct) subject codes when names collide.
  const distinctNames = new Set(entries.map((e) => e.name))
  const useCodes = distinctNames.size < entries.length
  const label = (e: { name: string; code: string }) => (useCodes ? e.code : e.name)
  if (entries.length === 1) {
    return `Sent to ${label(entries[0])} · ${group.total} student${group.total === 1 ? '' : 's'}`
  }
  // Multiple sections: names with per-section counts, capped for width.
  const shown = entries.slice(0, 3).map((e) => `${label(e)} (${e.count})`)
  const extra = entries.length > 3 ? ` +${entries.length - 3} more` : ''
  return `Sent to ${shown.join(' · ')}${extra}`
}

export function FacultyAnnouncementsPage({
  student, onNavigate, onLogout, events, professors, tasks,
  facultyData, facultyLoading, inbox, sentData, sentLoading, sentError, onFetchSent,
}: FacultyAnnouncementsPageProps) {
  const faculty = facultyData?.faculty ?? null
  const loading = facultyLoading ?? true
  const sent = sentData ?? null
  const sentPending = sentLoading ?? false

  // Sections come from the shared roster hook, so targeting always
  // matches the teacher's actual assignments. Nothing is checked by
  // default — the teacher picks sections or uses Select All.
  const { sections } = useFacultyRows(facultyData as any)
  const [checkedKeys, setCheckedKeys] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  // Which history cards are expanded to show individual recipients.
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])

  // Lazy once-per-session fetch, same rule as teaching history.
  useEffect(() => {
    if (!loading && faculty && !sent && !sentPending && onFetchSent) onFetchSent()
  }, [loading, faculty, sent, sentPending, onFetchSent])

  const targetedStudents = useMemo(() => {
    const usernames = new Set<string>()
    for (const s of sections) {
      if (checkedKeys.includes(s.key)) {
        for (const stu of s.students) usernames.add(stu.username)
      }
    }
    return usernames.size
  }, [sections, checkedKeys])

  const toggleKey = (key: string) => {
    setCheckedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const toggleExpanded = (key: string) => {
    setExpandedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const allChecked = sections.length > 0 && checkedKeys.length === sections.length
  const toggleAll = () => {
    setCheckedKeys(allChecked ? [] : sections.map((s) => s.key))
  }

  const canPost = title.trim().length > 0 && body.trim().length > 0 && checkedKeys.length > 0 && !posting

  const handlePost = async () => {
    if (title.trim().length === 0 || body.trim().length === 0) {
      toast.error('Give the message a title and a body first.')
      return
    }
    if (checkedKeys.length === 0) {
      toast.error('Pick at least one section to notify.')
      return
    }
    setPosting(true)
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch: student.branch,
          title: title.trim(),
          body: body.trim(),
          sectionKeys: checkedKeys,
          performedBy: student.username,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        toast.success(data.message || 'Notification sent.')
        setTitle('')
        setBody('')
        // Jump back to page 1 — newest first means the fresh send (and
        // its delivery summary) is immediately visible.
        onFetchSent?.(1)
      } else {
        toast.error(data.error || 'Failed to send notification.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setPosting(false)
    }
  }

  if (loading || (sentPending && !sent)) return <DashboardSkeleton />
  if (sentError && !sent) {
    return (
      <div className="min-h-dvh bg-slate-50 grid place-items-center">
        <div className="text-center">
          <p className="text-red-600 text-sm font-medium mb-2">{sentError}</p>
          <button onClick={() => onFetchSent?.(1)} className="text-blue-600 text-sm font-medium hover:underline">
            Try again
          </button>
        </div>
      </div>
    )
  }
  if (!faculty) {
    return (
      <div className="min-h-dvh bg-slate-50 grid place-items-center">
        <p className="text-sm text-red-600">Faculty data not found.</p>
      </div>
    )
  }

  return (
    <PortalShell
      student={student}
      active="announcements"
      onNavigate={onNavigate}
      onLogout={onLogout}
      events={events}
      professors={professors}
      tasks={tasks}
      facultyData={facultyData}
      inbox={inbox}
    >
      <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-balance text-slate-900">Announcements</h1>
          <p className="text-sm text-slate-500 mt-1">
            Notify your sections. Messages land in each student&apos;s bell inbox, never in the main announcement deck.
          </p>
        </div>

        {/* Form left, sent history right on wide screens */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        <div className="lg:col-span-3">
        {/* Compose */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Notify sections</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label htmlFor="announce-title" className="block text-xs font-medium text-slate-700 mb-1.5">Title</label>
              <input
                id="announce-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="e.g., Quiz moved to Friday"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label htmlFor="announce-body" className="block text-xs font-medium text-slate-700 mb-1.5">Message</label>
              <textarea
                id="announce-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="Write what your students need to know..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-y"
              />
              <p className="text-[11px] text-slate-500 mt-1 text-right" aria-live="polite">{body.length}/2000</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="block text-xs font-medium text-slate-700">
                  Sections ({checkedKeys.length} selected • {targetedStudents} students)
                </span>
                {sections.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="text-xs font-semibold text-blue-700 hover:underline"
                  >
                    {allChecked ? 'Clear all' : 'Select all'}
                  </button>
                )}
              </div>
              {sections.length === 0 ? (
                <p className="text-sm text-slate-500">No assigned sections found.</p>
              ) : (
                <div className="space-y-2">
                  {sections.map((s) => {
                    const checked = checkedKeys.includes(s.key)
                    return (
                      <label
                        key={s.key}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                          checked ? 'bg-blue-50/60 border-blue-200' : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleKey(s.key)}
                          className="w-4 h-4 rounded accent-blue-700 flex-shrink-0"
                        />
                        <span className="font-mono text-xs font-bold text-blue-700">{s.subjectCode}</span>
                        <span className="text-sm text-slate-700 truncate flex-1">{s.subjectTitle}</span>
                        <span className="text-xs text-slate-500 flex-shrink-0">
                          {s.room} • {s.students.length} students
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handlePost}
                disabled={!canPost}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {posting ? 'Sending...' : `Notify ${targetedStudents} student${targetedStudents === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </div>
        </div>

        {/* Sent history — grouped per send, 5 per page, last 30 days */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Sent history</h2>
            <span className="text-[11px] text-slate-500">Newest first · keeps the last {NOTIFICATION_RETENTION_DAYS} days</span>
          </div>
          {!sent || sent.groups.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-10 text-center">
              <p className="text-sm text-slate-500">
                Nothing sent yet. Messages you send to sections will appear here, grouped by send.
              </p>
            </div>
          ) : (
            <>
              <div className={`space-y-3 transition-opacity ${sentPending ? 'opacity-50 pointer-events-none' : ''}`}>
                {sent.groups.map((g) => {
                  const expanded = expandedKeys.includes(g.key)
                  const subjectCodes = Array.from(new Set(g.sections.map((s) => s.subjectCode)))
                  const allRead = g.readCount >= g.total
                  return (
                    <div key={g.key} className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900 min-w-0">{g.title}</p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {g.taskId && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200">
                              <ClipboardList className="w-3 h-3" /> Task
                            </span>
                          )}
                          {subjectCodes.slice(0, 2).map((code) => (
                            <span key={code} className="font-mono text-xs font-bold text-blue-700">{code}</span>
                          ))}
                          {subjectCodes.length > 2 && (
                            <span className="text-[10px] text-slate-500">+{subjectCodes.length - 2} more</span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 mt-1 leading-relaxed line-clamp-2">{g.body}</p>
                      {/* Recipient group summary — sections + counts,
                          never a wall of individual students */}
                      <p className="text-xs font-medium text-slate-700 mt-2">{recipientSummary(g)}</p>
                      <div className="flex items-center justify-between gap-3 mt-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] text-slate-500 flex-shrink-0">{formatNotifTime(g.createdAt)}</span>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border flex-shrink-0 ${
                              allRead
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            {allRead ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {allRead ? 'All read' : `${g.readCount}/${g.total} read`}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleExpanded(g.key)}
                          aria-expanded={expanded}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline flex-shrink-0"
                        >
                          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {expanded ? 'Hide recipients' : `View ${g.total} recipient${g.total === 1 ? '' : 's'}`}
                        </button>
                      </div>
                      {expanded && (
                        <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/60 max-h-64 overflow-y-auto">
                          {g.sections.map((sec) => (
                            <div key={sec.sectionKey} className="px-3 py-2 border-b border-slate-100 last:border-b-0">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                                {sec.subjectCode}
                                {sec.sectionNames.length > 0 && ` · ${sec.sectionNames.join(', ')}`} · {sec.count}{' '}
                                {sec.count === 1 ? 'student' : 'students'}
                              </p>
                              <ul className="space-y-1">
                                {g.recipients
                                  .filter((r) => r.subjectCode === sec.subjectCode)
                                  .map((r) => (
                                    <li key={`${sec.sectionKey}-${r.username}`} className="flex items-center gap-2 text-xs">
                                      <span className="w-5 h-5 rounded-full bg-slate-800 text-white text-[8px] font-semibold flex items-center justify-center flex-shrink-0">
                                        {(r.fullName || r.username).split(' ').map((n) => n[0]).slice(0, 2).join('')}
                                      </span>
                                      <span className="text-slate-700 truncate">{r.fullName || r.username}</span>
                                      {r.section && (
                                        <span className="text-[10px] text-slate-500 flex-shrink-0">{r.section}</span>
                                      )}
                                      {r.read ? (
                                        <span className="ml-auto flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
                                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden />
                                          <span className="sr-only">Read</span>
                                        </span>
                                      ) : (
                                        <span className="ml-auto flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-medium text-slate-500">
                                          <Clock className="w-3.5 h-3.5" aria-hidden />
                                          <span className="sr-only">Unread</span>
                                        </span>
                                      )}
                                    </li>
                                  ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Pager — server-side pagination, app's existing control style */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-500 tabular-nums">
                  Showing {(sent.page - 1) * sent.pageSize + 1}–{Math.min(sent.page * sent.pageSize, sent.total)} of{' '}
                  {sent.total}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onFetchSent?.(sent.page - 1)}
                    disabled={sent.page <= 1 || sentPending}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-slate-500 tabular-nums px-1">
                    {sent.page} / {sent.totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => onFetchSent?.(sent.page + 1)}
                    disabled={sent.page >= sent.totalPages || sentPending}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
          {sentError && sent && (
            <p className="text-xs text-red-600 text-center">{sentError}. The list above may be stale.</p>
          )}
        </div>
        </div>
      </main>
    </PortalShell>
  )
}
