'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { CATEGORY_LABELS, CATEGORY_PILL_STYLES, type EventCategory, type PortalEvent } from '@/lib/aics/events'
import { Modal } from '../portal/Modal'
import { PortalShell } from '../portal/PortalShell'
import { EmptyState } from '../portal/EmptyState'
import type { AdminPageProps } from './admin-props'

// ============================================================
//  Admin Events — CRUD manager for the school calendar
//
//  POST/PATCH/DELETE /api/events (admin, own branch only).
//  Students keep their read-only calendar; every change here
//  propagates to it on their next fetch.
// ============================================================

const CATEGORIES: EventCategory[] = ['academic', 'deadline', 'campus', 'holiday']
type Timeframe = 'upcoming' | 'past' | 'all'

interface EventForm {
  title: string
  description: string
  category: EventCategory
  date: string // yyyy-mm-dd for <input type="date">
  endDate: string // '' = single-day
}

const EMPTY_FORM: EventForm = { title: '', description: '', category: 'academic', date: '', endDate: '' }

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function toDateInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const inputClass =
  'w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

export function AdminEventsPage({ student, onNavigate, onLogout, events, professors, tasks, inbox }: AdminPageProps) {
  const [list, setList] = useState<PortalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [categoryFilter, setCategoryFilter] = useState<'all' | EventCategory>('all')
  const [timeframe, setTimeframe] = useState<Timeframe>('all')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PortalEvent | null>(null)
  const [form, setForm] = useState<EventForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/events?username=${encodeURIComponent(student.username)}`)
      const data = await res.json()
      if (data.ok) setList(data.events || [])
      else setError(data.error || 'Failed to load events.')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [student.username])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const filtered = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return list
      .filter((e) => (categoryFilter === 'all' ? true : e.category === categoryFilter))
      .filter((e) => {
        if (timeframe === 'all') return true
        const d = new Date(e.endDate ?? e.date)
        return timeframe === 'upcoming' ? d >= now : d < now
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [list, categoryFilter, timeframe])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (e: PortalEvent) => {
    setEditing(e)
    setForm({
      title: e.title,
      description: e.description ?? '',
      category: e.category,
      date: toDateInput(e.date),
      endDate: toDateInput(e.endDate),
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required.')
      return
    }
    if (!form.date) {
      toast.error('Start date is required.')
      return
    }
    if (form.endDate && form.endDate < form.date) {
      toast.error('End date cannot be before the start date.')
      return
    }
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        date: form.date,
        endDate: form.endDate || null,
      }
      const res = editing
        ? await fetch('/api/events', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editing._id, ...body }),
          })
        : await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
      const data = await res.json()
      if (data.ok) {
        toast.success(data.message || (editing ? 'Event updated.' : 'Event created.'))
        setModalOpen(false)
        fetchEvents()
      } else {
        toast.error(data.error || 'Failed to save event.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (e: PortalEvent) => {
    if (confirmId !== e._id) {
      setConfirmId(e._id)
      return
    }
    setConfirmId(null)
    setDeletingId(e._id)
    try {
      const res = await fetch(`/api/events?id=${encodeURIComponent(e._id)}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.ok) {
        toast.success(data.message || 'Event deleted.')
        fetchEvents()
      } else {
        toast.error(data.error || 'Failed to delete event.')
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
      active="admin-events"
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
            <h1 className="text-2xl font-bold tracking-tight text-balance text-slate-900">Events</h1>
            <p className="text-sm text-slate-500 mt-1">
              School calendar for this branch. Changes appear on every student calendar immediately.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#153357] text-white text-sm font-semibold hover:bg-[#0f2744]"
          >
            <Plus className="w-4 h-4" /> Add event
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'all' | EventCategory)}
            aria-label="Filter by category"
            className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as Timeframe)}
            aria-label="Filter by timeframe"
            className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All dates</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
          </select>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading events...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl border border-red-200 shadow-sm px-6 py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-sm text-red-600 font-medium mb-1">{error}</p>
            <button type="button" onClick={fetchEvents} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#153357] text-white text-sm font-semibold hover:bg-[#0f2744]">
              <RotateCcw className="w-4 h-4" /> Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <EmptyState icon={CalendarDays} message="No events match" hint="Adjust the filters or add a new event." />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="bg-slate-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Date</th>
                    <th className="bg-slate-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Event</th>
                    <th className="bg-slate-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Category</th>
                    <th className="bg-slate-50 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => {
                    const confirming = confirmId === e._id
                    const deleting = deletingId === e._id
                    return (
                      <tr key={e._id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="font-medium text-slate-800 tabular-nums">{formatDate(e.date)}</p>
                          {e.endDate ? <p className="text-xs text-slate-500 tabular-nums">to {formatDate(e.endDate)}</p> : null}
                        </td>
                        <td className="px-4 py-3 min-w-[240px]">
                          <p className="font-medium text-slate-800">{e.title}</p>
                          {e.description ? (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 max-w-md">{e.description}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${CATEGORY_PILL_STYLES[e.category]}`}>
                            {CATEGORY_LABELS[e.category]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openEdit(e)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(e)}
                            disabled={deleting}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60 ${
                              confirming ? 'bg-red-600 text-white hover:bg-red-700' : 'text-red-700 hover:bg-red-50'
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
          title={editing ? 'Edit event' : 'Add event'}
          description={editing ? 'Update the calendar entry. Students see changes on their next calendar load.' : 'New entries appear on every student calendar in this branch.'}
          onClose={() => setModalOpen(false)}
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
                {editing ? 'Save changes' : 'Create event'}
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <div>
              <label htmlFor="event-title" className="block text-xs font-semibold text-slate-600 mb-1">
                Title
              </label>
              <input
                id="event-title"
                type="text"
                value={form.title}
                maxLength={120}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Midterm Examination Week"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="event-category" className="block text-xs font-semibold text-slate-600 mb-1">
                Category
              </label>
              <select
                id="event-category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as EventCategory }))}
                className={inputClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="event-date" className="block text-xs font-semibold text-slate-600 mb-1">
                  Start date
                </label>
                <input
                  id="event-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="event-end-date" className="block text-xs font-semibold text-slate-600 mb-1">
                  End date <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <input
                  id="event-end-date"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label htmlFor="event-description" className="block text-xs font-semibold text-slate-600 mb-1">
                Description <span className="font-normal text-slate-500">(optional)</span>
              </label>
              <textarea
                id="event-description"
                value={form.description}
                maxLength={2000}
                rows={3}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Details students will see when they tap the event"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-y"
              />
            </div>
          </div>
        </Modal>
      )}
    </PortalShell>
  )
}
