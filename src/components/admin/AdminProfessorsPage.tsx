'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Professor } from '@/lib/aics/professors'
import { Modal } from '../portal/Modal'
import { PortalShell } from '../portal/PortalShell'
import { EmptyState } from '../portal/EmptyState'
import type { AdminPageProps } from './admin-props'

// ============================================================
//  Admin Professors — CRUD manager for the faculty directory
//
//  POST/PATCH/DELETE /api/professors (admin, own branch only).
//  The professor `name` is the join key to subject.professor, so
//  the edit modal warns before renames; deletions only remove the
//  directory card, subject rows keep their strings.
// ============================================================

interface ProfessorForm {
  name: string
  email: string
  officeHours: string
  room: string
}

const EMPTY_FORM: ProfessorForm = { name: '', email: '', officeHours: '', room: '' }

const inputClass =
  'w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

export function AdminProfessorsPage({ student, onNavigate, onLogout, events, professors, tasks, inbox }: AdminPageProps) {
  const [list, setList] = useState<Professor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Professor | null>(null)
  const [form, setForm] = useState<ProfessorForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/professors?username=${encodeURIComponent(student.username)}`)
      const data = await res.json()
      if (data.ok) setList(data.professors || [])
      else setError(data.error || 'Failed to load professors.')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [student.username])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((p) =>
      [p.name, p.email, p.officeHours, p.room].some((v) => v.toLowerCase().includes(q))
    )
  }, [list, query])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (p: Professor) => {
    setEditing(p)
    setForm({ name: p.name, email: p.email, officeHours: p.officeHours, room: p.room })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error('Enter a valid email address.')
      return
    }
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        email: form.email.trim(),
        officeHours: form.officeHours.trim(),
        room: form.room.trim(),
      }
      const res = editing
        ? await fetch('/api/professors', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editing._id, ...body }),
          })
        : await fetch('/api/professors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
      const data = await res.json()
      if (data.ok) {
        toast.success(data.message || (editing ? 'Professor updated.' : 'Professor added.'))
        setModalOpen(false)
        fetchList()
      } else {
        toast.error(data.error || 'Failed to save professor.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (p: Professor) => {
    if (confirmId !== p._id) {
      setConfirmId(p._id)
      return
    }
    setConfirmId(null)
    setDeletingId(p._id)
    try {
      const res = await fetch(`/api/professors?id=${encodeURIComponent(p._id)}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.ok) {
        toast.success(data.message || 'Professor removed.')
        fetchList()
      } else {
        toast.error(data.error || 'Failed to remove professor.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const renaming = editing !== null && form.name.trim() !== editing.name

  return (
    <PortalShell
      student={student}
      active="admin-professors"
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
            <h1 className="text-2xl font-bold tracking-tight text-balance text-slate-900">Professors</h1>
            <p className="text-sm text-slate-500 mt-1">
              Faculty directory for this branch. Names link professors to their subject assignments.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#153357] text-white text-sm font-semibold hover:bg-[#0f2744]"
          >
            <Plus className="w-4 h-4" /> Add professor
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, room..."
            aria-label="Search professors"
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-surface text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {loading ? (
          <div className="bg-surface rounded-xl border border-slate-200 shadow-sm px-6 py-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading professors...</p>
          </div>
        ) : error ? (
          <div className="bg-surface rounded-xl border border-red-200 shadow-sm px-6 py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-sm text-red-600 font-medium mb-1">{error}</p>
            <button type="button" onClick={fetchList} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#153357] text-white text-sm font-semibold hover:bg-[#0f2744]">
              <RotateCcw className="w-4 h-4" /> Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-surface rounded-xl border border-slate-200 shadow-sm">
            <EmptyState
              icon={GraduationCap}
              message={query ? 'No professors match your search' : 'No professors listed yet'}
              hint={query ? 'Try a different search term.' : 'Add the first directory entry.'}
            />
          </div>
        ) : (
          <div className="bg-surface rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[680px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th scope="col" className="bg-slate-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Professor</th>
                    <th scope="col" className="bg-slate-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Email</th>
                    <th scope="col" className="bg-slate-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Office hours</th>
                    <th scope="col" className="bg-slate-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Room</th>
                    <th scope="col" className="bg-slate-50 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const confirming = confirmId === p._id
                    const deleting = deletingId === p._id
                    return (
                      <tr key={p._id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{p.name}</td>
                        <td className="px-4 py-3 text-slate-600">{p.email}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{p.officeHours}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{p.room}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(p)}
                            disabled={deleting}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60 ${
                              confirming ? 'bg-red-600 text-white hover:bg-red-700 dark:hover:bg-red-500' : 'text-red-700 hover:bg-red-50'
                            }`}
                          >
                            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : confirming ? <Check className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                            {deleting ? 'Removing...' : confirming ? 'Confirm' : 'Delete'}
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
          title={editing ? 'Edit professor' : 'Add professor'}
          description="Directory cards show on the student Professors page for this branch."
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-surface text-sm font-medium text-slate-700 hover:bg-slate-50"
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
                {editing ? 'Save changes' : 'Add professor'}
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <div>
              <label htmlFor="prof-name" className="block text-xs font-semibold text-slate-600 mb-1">
                Name
              </label>
              <input
                id="prof-name"
                type="text"
                value={form.name}
                maxLength={120}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Prof. Anna Lim"
                className={inputClass}
              />
              {renaming ? (
                <p className="mt-1.5 text-[11px] text-amber-700 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
                  Renaming severs the link to existing subject assignments — subjects keep the old name and will no longer match this entry.
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="prof-email" className="block text-xs font-semibold text-slate-600 mb-1">
                Email
              </label>
              <input
                id="prof-email"
                type="email"
                value={form.email}
                maxLength={120}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="a.lim@aics.edu.ph"
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="prof-hours" className="block text-xs font-semibold text-slate-600 mb-1">
                  Office hours
                </label>
                <input
                  id="prof-hours"
                  type="text"
                  value={form.officeHours}
                  maxLength={120}
                  onChange={(e) => setForm((f) => ({ ...f, officeHours: e.target.value }))}
                  placeholder="Mon & Wed • 3:00-5:00 PM"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="prof-room" className="block text-xs font-semibold text-slate-600 mb-1">
                  Room
                </label>
                <input
                  id="prof-room"
                  type="text"
                  value={form.room}
                  maxLength={120}
                  onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))}
                  placeholder="Faculty Office / Room 210"
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </Modal>
      )}
    </PortalShell>
  )
}
