'use client'

import { useState } from 'react'
import { Megaphone, Send, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import type { Student, View } from '@/lib/aics/types'
import type { PortalEvent } from '@/lib/aics/events'
import type { Professor } from '@/lib/aics/professors'
import type { Task } from '@/lib/aics/tasks'
import type { Announcement, AnnouncementCategory } from '@/lib/aics/announcements'
import { ANNOUNCEMENT_STYLES } from '@/lib/aics/announcements'
import { PortalShell } from '../portal/PortalShell'

interface FacultyAnnouncementsPageProps {
  student: Student
  onNavigate: (view: View) => void
  onLogout: () => void
  events?: PortalEvent[]
  professors?: Professor[]
  tasks?: Task[]
  announcements?: Announcement[]
}

const CATEGORIES = Object.keys(ANNOUNCEMENT_STYLES) as AnnouncementCategory[]

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function FacultyAnnouncementsPage({
  student, onNavigate, onLogout, events, professors, tasks, announcements,
}: FacultyAnnouncementsPageProps) {
  // Seeded from the wrapper's lifted announcements. Refreshed locally
  // after posting. Never refetched on mount, so tab revisits are instant.
  const [items, setItems] = useState<Announcement[]>(announcements ?? [])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<AnnouncementCategory>('general')
  const [urgent, setUrgent] = useState(false)
  const [expiry, setExpiry] = useState('')
  const [posting, setPosting] = useState(false)

  const refresh = async () => {
    try {
      const res = await fetch(`/api/announcements?username=${encodeURIComponent(student.username)}`)
      const data = await res.json()
      if (data.ok) setItems(data.announcements || [])
    } catch {}
  }

  const canPost = title.trim().length > 0 && body.trim().length > 0 && !posting

  const handlePost = async () => {
    if (!canPost) {
      toast.error('Give the announcement a title and a body first.')
      return
    }
    setPosting(true)
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch: student.branch,
          title: title.trim(),
          body: body.trim(),
          category,
          priority: urgent ? 'urgent' : 'normal',
          expiryDate: expiry || null,
          performedBy: student.username,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        toast.success('Announcement posted.')
        setTitle('')
        setBody('')
        setCategory('general')
        setUrgent(false)
        setExpiry('')
        refresh()
      } else {
        toast.error(data.error || 'Failed to post announcement.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setPosting(false)
    }
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
    >
      <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Announcements</h1>
          <p className="text-sm text-slate-500 mt-1">
            Post updates for your students. Published posts appear in the student and faculty decks.
          </p>
        </div>

        {/* Create form */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">New announcement</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="e.g., Midterm exam moved to Friday"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="Write the details students need..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-y"
              />
              <p className="text-[11px] text-slate-400 mt-1 text-right">{body.length}/2000</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{ANNOUNCEMENT_STYLES[c].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Priority</label>
                <button
                  type="button"
                  onClick={() => setUrgent((v) => !v)}
                  aria-pressed={urgent}
                  className={`w-full h-10 px-3 rounded-lg border text-sm font-semibold inline-flex items-center justify-center gap-2 ${
                    urgent ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" /> {urgent ? 'Urgent' : 'Normal'}
                </button>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Expires (optional)</label>
                <input
                  type="date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handlePost}
                disabled={!canPost}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {posting ? 'Posting...' : 'Post announcement'}
              </button>
            </div>
          </div>
        </div>

        {/* Published list */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Published ({items.length})</h2>
          {items.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-10 text-center">
              <p className="text-sm text-slate-500">No announcements yet. Post the first one above.</p>
            </div>
          ) : (
            items.map((a) => {
              const style = ANNOUNCEMENT_STYLES[a.category] || ANNOUNCEMENT_STYLES.general
              return (
                <div key={a._id} className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border flex-shrink-0 ${style.pill}`}>
                      {style.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">{a.body}</p>
                  <p className="text-[11px] text-slate-400 mt-2">
                    {formatDate(a.postedDate)} by {a.author}
                    {a.priority === 'urgent' ? ' • Urgent' : ''}
                  </p>
                </div>
              )
            })
          )}
        </div>
      </main>
    </PortalShell>
  )
}
