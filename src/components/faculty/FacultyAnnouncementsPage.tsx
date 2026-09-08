'use client'

import { useState, useEffect, useMemo } from 'react'
import { Megaphone, Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Student, View } from '@/lib/aics/types'
import type { PortalEvent } from '@/lib/aics/events'
import type { Professor } from '@/lib/aics/professors'
import type { Task } from '@/lib/aics/tasks'
import type { FacultyMember, FacultyStudent } from '@/lib/aics/faculty'
import type { Notification } from '@/lib/aics/notifications'
import { formatNotifTime, type NotificationInbox } from '@/lib/aics/notifications'
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
  sentData?: { notifications: Notification[] } | null
  sentLoading?: boolean
  sentError?: string | null
  onFetchSent?: () => void
}

export function FacultyAnnouncementsPage({
  student, onNavigate, onLogout, events, professors, tasks,
  facultyData, facultyLoading, inbox, sentData, sentLoading, sentError, onFetchSent,
}: FacultyAnnouncementsPageProps) {
  const faculty = facultyData?.faculty ?? null
  const loading = facultyLoading ?? true
  const sent = sentData?.notifications ?? []
  const sentPending = sentLoading ?? false

  // Sections come from the shared roster hook, so targeting always
  // matches the teacher's actual assignments. Nothing is checked by
  // default — the teacher picks sections or uses Select All.
  const { sections } = useFacultyRows(facultyData as any)
  const [checkedKeys, setCheckedKeys] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)

  // Lazy once-per-session fetch, same rule as teaching history.
  useEffect(() => {
    if (!loading && faculty && !sentData && !sentPending && onFetchSent) onFetchSent()
  }, [loading, faculty, sentData, sentPending, onFetchSent])

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
        onFetchSent?.()
      } else {
        toast.error(data.error || 'Failed to send notification.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setPosting(false)
    }
  }

  if (loading || sentPending) return <DashboardSkeleton />
  if (sentError) {
    return (
      <div className="min-h-dvh bg-slate-50 grid place-items-center">
        <div className="text-center">
          <p className="text-red-600 text-sm font-medium mb-2">{sentError}</p>
          <button onClick={onFetchSent} className="text-blue-600 text-sm font-medium hover:underline">
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
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Announcements</h1>
          <p className="text-sm text-slate-500 mt-1">
            Notify your sections. Messages land in each student's bell inbox, never in the main announcement deck.
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
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="e.g., Quiz moved to Friday"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Message</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="Write what your students need to know..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-y"
              />
              <p className="text-[11px] text-slate-400 mt-1 text-right">{body.length}/2000</p>
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

        {/* Sent */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Sent ({sent.length})</h2>
          {sent.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-10 text-center">
              <p className="text-sm text-slate-500">Nothing sent yet. Your messages to sections will appear here.</p>
            </div>
          ) : (
            sent.map((n) => (
              <div key={n._id} className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                  <span className="font-mono text-xs font-bold text-blue-700 flex-shrink-0">{n.subjectCode}</span>
                </div>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">{n.body}</p>
                <p className="text-[11px] text-slate-400 mt-2">{formatNotifTime(n.createdAt)}</p>
              </div>
            ))
          )}
        </div>
        </div>
      </main>
    </PortalShell>
  )
}
