'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  ANNOUNCEMENT_STYLES,
  type Announcement,
  type AnnouncementCategory,
  type AnnouncementPriority,
} from '@/lib/aics/announcements'
import { Modal } from '../portal/Modal'
import { PortalShell } from '../portal/PortalShell'
import type { AdminPageProps } from './admin-props'

// ============================================================
//  Admin Announcements — post, edit, remove deck announcements
//
//  GET /api/announcements?all=1 (admin) lists every post in the
//  branch including expired ones; PATCH edits, DELETE removes the
//  post and its read markers. Faculty keep using section
//  notifications instead — they never land in this deck.
// ============================================================

const CATEGORIES: AnnouncementCategory[] = ['academic', 'deadline', 'campus', 'holiday', 'general']
type ExpiryFilter = 'all' | 'active' | 'expired'

interface AnnouncementForm {
  title: string
  body: string
  category: AnnouncementCategory
  priority: AnnouncementPriority
  expiryDate: string // yyyy-mm-dd, '' = no expiry
}

const EMPTY_FORM: AnnouncementForm = { title: '', body: '', category: 'general', priority: 'normal', expiryDate: '' }

function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function isExpired(a: Announcement): boolean {
  if (!a.expiryDate) return false
  const d = new Date(a.expiryDate)
  return !isNaN(d.getTime()) && d.getTime() < Date.now()
}

const inputClass =
  'w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

export function AdminAnnouncementsPage({ student, onNavigate, onLogout, events, professors, tasks, inbox }: AdminPageProps) {
  const [list, setList] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [categoryFilter, setCategoryFilter] = useState<'all' | AnnouncementCategory>('all')
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>('all')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [form, setForm] = useState<AnnouncementForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/announcements?username=${encodeURIComponent(student.username)}&all=1`)
      const data = await res.json()
      if (data.ok) setList(data.announcements || [])
      else setError(data.error || 'Failed to load announcements.')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [student.username])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const filtered = useMemo(
    () =>
      list
        .filter((a) => (categoryFilter === 'all' ? true : a.category === categoryFilter))
        .filter((a) => {
          if (expiryFilter === 'all') return true
          return expiryFilter === 'expired' ? isExpired(a) : !isExpired(a)
        }),
    [list, categoryFilter, expiryFilter]
  )

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (a: Announcement) => {
    setEditing(a)
    setForm({
      title: a.title,
      body: a.body,
      category: a.category,
      priority: a.priority,
      expiryDate: toDateInput(a.expiryDate),
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required.')
      return
    }
    if (!form.body.trim()) {
      toast.error('Body is required.')
      return
    }
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        body: form.body.trim(),
        category: form.category,
        priority: form.priority,
        expiryDate: form.expiryDate || null,
      }
      const res = editing
        ? await fetch('/api/announcements', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editing._id, ...body }),
          })
        : await fetch('/api/announcements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // POST keeps its legacy contract: branch + performedBy are
            // spoof-checked against the session; both come from self.
            body: JSON.stringify({ branch: student.branch || 'commonwealth', ...body, performedBy: student.username }),
          })
      const data = await res.json()
      if (data.ok) {
        toast.success(data.message || (editing ? 'Announcement updated.' : 'Announcement posted.'))
        setModalOpen(false)
        fetchList()
      } else {
        toast.error(data.error || 'Failed to save announcement.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (a: Announcement) => {
    if (confirmId !== a._id) {
      setConfirmId(a._id)
      return
    }
    setConfirmId(null)
    setDeletingId(a._id)
    try {
      const res = await fetch(`/api/announcements?id=${encodeURIComponent(a._id)}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.ok) {
        toast.success(data.message || 'Announcement deleted.')
        fetchList()
      } else {
        toast.error(data.error || 'Failed to delete announcement.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <PortalShell
      student={student}
      active="admin-announcements"
      onNavigate={onNavigate}
      onLogout={onLogout}
      events={events}
      professors={professors}
      tasks={tasks}
      inbox={inbox}
    >
      <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-balance text-slate-900">Announcements</h1>
            <p className="text-sm text-slate-500 mt-1">
              Deck posts for this branch, including expired ones. Faculty reach sections through notifications instead.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#153357] text-white text-sm font-semibold hover:bg-[#0f2744]"
          >
            <Plus className="w-4 h-4" /> Post announcement
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'all' | AnnouncementCategory)}
            aria-label="Filter by category"
            className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {ANNOUNCEMENT_STYLES[c].label}
              </option>
            ))}
          </select>
          <select
            value={expiryFilter}
            onChange={(e) => setExpiryFilter(e.target.value as ExpiryFilter)}
            aria-label="Filter by expiry"
            className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">Active + expired</option>
            <option value="active">Active only</option>
            <option value="expired">Expired only</option>
          </select>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading announcements...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl border border-red-200 shadow-sm px-6 py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-sm text-red-600 font-medium mb-1">{error}</p>
            <button type="button" onClick={fetchList} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#153357] text-white text-sm font-semibold hover:bg-[#0f2744]">
              <RotateCcw className="w-4 h-4" /> Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
              <Megaphone className="w-6 h-6 text-blue-500" />
            </div>
            <p className="text-sm font-medium text-slate-600">No announcements match</p>
            <p className="text-xs text-slate-500 mt-1">Adjust the filters or post a new announcement.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="bg-slate-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Posted</th>
                    <th className="bg-slate-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Announcement</th>
                    <th className="bg-slate-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Category</th>
                    <th className="bg-slate-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Expiry</th>
                    <th className="bg-slate-50 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => {
                    const style = ANNOUNCEMENT_STYLES[a.category] ?? ANNOUNCEMENT_STYLES.general
                    const confirming = confirmId === a._id
                    const deleting = deletingId === a._id
                    const expired = isExpired(a)
                    return (
                      <tr key={a._id} className={`border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 ${expired ? 'opacity-60' : ''}`}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="font-medium text-slate-800 tabular-nums">{formatDate(a.postedDate)}</p>
                          <p className="text-xs text-slate-400">{a.author}</p>
                        </td>
                        <td className="px-4 py-3 min-w-[280px]">
                          <div className="flex items-center gap-2">
                            {a.priority === 'urgent' ? (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-red-50 text-red-700 border-red-200 flex-shrink-0">Urgent</span>
                            ) : null}
                            <p className="font-medium text-slate-800">{a.title}</p>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 max-w-md">{a.body}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${style.pill}`}>
                            {style.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {expired ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-slate-100 text-slate-500 border-slate-200">
                              Expired
                            </span>
                          ) : a.expiryDate ? (
                            <span className="text-xs text-slate-600 tabular-nums">until {formatDate(a.expiryDate)}</span>
                          ) : (
                            <span className="text-xs text-slate-400">No expiry</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openEdit(a)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(a)}
                            disabled={deleting}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60 ${
                              confirming ? 'bg-red-600 text-white hover:bg-red-700' : 'text-red-600 hover:bg-red-50'
                            }`}
                          >
                            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : confirming ? <Check className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                            {deleting ? 'Deleting...' : confirming ? 'Confirm' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {modalOpen && (
        <Modal
          title={editing ? 'Edit announcement' : 'Post announcement'}
          description={editing ? 'Students see the update on their next dashboard load. Read/dismiss markers persist.' : 'Posts render in the announcement deck for every student in this branch.'}
          onClose={() => setModalOpen(false)}
          maxWidthClass="max-w-xl"
          footer={
            <>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#153357] text-white text-sm font-semibold hover:bg-[#0f2744] disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {editing ? 'Save changes' : 'Post'}
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <div>
              <label htmlFor="ann-title" className="block text-xs font-semibold text-slate-600 mb-1">
                Title
              </label>
              <input
                id="ann-title"
                type="text"
                value={form.title}
                maxLength={120}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Enrollment deadline extended"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="ann-body" className="block text-xs font-semibold text-slate-600 mb-1">
                Body
              </label>
              <textarea
                id="ann-body"
                value={form.body}
                maxLength={2000}
                rows={4}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="What students should know"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-y"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="ann-category" className="block text-xs font-semibold text-slate-600 mb-1">
                  Category
                </label>
                <select
                  id="ann-category"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as AnnouncementCategory }))}
                  className={inputClass}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {ANNOUNCEMENT_STYLES[c].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ann-priority" className="block text-xs font-semibold text-slate-600 mb-1">
                  Priority
                </label>
                <select
                  id="ann-priority"
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as AnnouncementPriority }))}
                  className={inputClass}
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="ann-expiry" className="block text-xs font-semibold text-slate-600 mb-1">
                Expiry date <span className="font-normal text-slate-400">(optional — hidden from the deck after this date)</span>
              </label>
              <input
                id="ann-expiry"
                type="date"
                value={form.expiryDate}
                onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
        </Modal>
      )}
    </PortalShell>
  )
}
