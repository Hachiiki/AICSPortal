'use client'

import { useState, useEffect, useMemo, useId } from 'react'
import { X, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { SelectMenu } from '../ui/select-menu'
import { DialogPanel } from '../portal/DialogPanel'

export interface AttendanceStudent {
  username: string
  fullName: string
  studentNumber: string
}

export interface AttendanceSection {
  key: string
  code: string
  title: string
  students: AttendanceStudent[]
}

interface AttendanceModalProps {
  sections: AttendanceSection[]
  initialKey: string
  facultyUsername: string
  branch: string
  onClose: () => void
  onSaved: () => void
}

function todayLocal(): string {
  const d = new Date()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

function formatLong(day: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  const dt = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(day)
  if (isNaN(dt.getTime())) return day
  return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

// Section keys are `code|academicYear|semester` — surface the term
// so same-code classes from different years stay distinguishable.
function termOf(key: string): string {
  const parts = key.split('|')
  return parts.length >= 3 && parts[1] ? `${parts[1]} ${parts[2] || ''}`.trim() : ''
}

export function AttendanceModal({
  sections, initialKey, facultyUsername, branch, onClose, onSaved,
}: AttendanceModalProps) {
  const titleId = useId()
  // Class switcher: the roster, records, and save target all follow
  // this key, so teachers move between classes without closing.
  const [secKey, setSecKey] = useState(initialKey)
  const sec = useMemo(
    () => sections.find((s) => s.key === secKey) || sections[0] || null,
    [sections, secKey]
  )
  const students = useMemo(() => sec?.students.filter((student) => student.username) ?? [], [sec])
  const [date, setDate] = useState(todayLocal)
  const [records, setRecords] = useState<Record<string, 'present' | 'absent'>>({})
  const [loaded, setLoaded] = useState<{ selection: string; revision: string | null } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [confirmCorrection, setConfirmCorrection] = useState(false)
  const [saving, setSaving] = useState(false)
  const sectionKey = sec?.key
  const selection = JSON.stringify([sectionKey, date, reloadKey])
  const ready = loaded?.selection === selection
  const revision = ready ? loaded.revision : null

  const today = todayLocal()
  const isToday = date === today

  useEffect(() => {
    if (!sectionKey) return
    const key = sectionKey
    const controller = new AbortController()
    setLoaded(null)
    setLoadError(null)
    setConfirmCorrection(false)
    async function loadRecord() {
      try {
        const params = new URLSearchParams({ username: facultyUsername, sectionKey: key, date })
        const res = await fetch(`/api/attendance?${params}`, { signal: controller.signal })
        const data = await res.json()
        if (controller.signal.aborted) return
        if (!res.ok || !data.ok) throw new Error('Could not load attendance.')
        const saved = data.records as Record<string, 'present' | 'absent'> | null
        setRecords(Object.fromEntries(students.flatMap(({ username }) => {
          const value = saved === null ? 'present' : saved?.[username]
          return value === 'present' || value === 'absent' ? [[username, value]] : []
        })))
        setLoaded({ selection, revision: data.revision ?? null })
      } catch {
        if (!controller.signal.aborted) setLoadError('Could not load attendance. Reload the marks before saving.')
      }
    }
    void loadRecord()
    return () => controller.abort()
  }, [date, sectionKey, students, facultyUsername, selection])

  const setAll = (status: 'present' | 'absent') => {
    setRecords(Object.fromEntries(students.map((s) => [s.username, status])))
  }

  const present = Object.values(records).filter((s) => s === 'present').length
  const absent = Object.values(records).filter((s) => s === 'absent').length
  const unmarked = students.length - present - absent

  function changeSelection(change: () => void) {
    setLoaded(null)
    setLoadError(null)
    change()
  }

  const handleSave = async () => {
    if (!sec || !ready || saving) return
    if (revision && !confirmCorrection) {
      setConfirmCorrection(true)
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch, sectionKey: sec.key, date, records, performedBy: facultyUsername,
          ...(revision ? { allowOverwrite: true, expectedRevision: revision } : {}),
        }),
      })
      const data = await res.json()
      if (data.ok) {
        toast.success(data.message || 'Attendance saved.')
        onSaved()
      } else if (res.status === 409) {
        setLoaded(null)
        setConfirmCorrection(false)
        setLoadError(data.error || 'The saved marks changed. Reload attendance to continue.')
      } else {
        toast.error(data.error || 'Failed to save attendance.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-scrim/50" onClick={onClose} aria-hidden="true" />
      <DialogPanel
        onClose={onClose}
        aria-labelledby={titleId}
        className="relative bg-surface rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col"
      >
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 id={titleId} className="font-bold">Take attendance</h3>
              <p className="text-xs text-slate-500 mt-1">
                {sec ? (<><span className="font-mono font-bold text-link-strong">{sec.code}</span> {sec.title} • {termOf(sec.key)}</>) : 'No classes found.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close attendance"
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          </div>
          <div className="mt-3">
            {/* Visual label; the control itself is named via aria-label. */}
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Class</span>
            <SelectMenu
              className="mt-1"
              aria-label="Switch class"
              value={sec?.key || ''}
              onChange={(key) => {
                if (key !== secKey) changeSelection(() => setSecKey(key))
              }}
              disabled={saving || confirmCorrection}
              options={sections.map((s) => ({
                value: s.key,
                label: `${s.code} · ${s.title}${termOf(s.key) ? ` • ${termOf(s.key)}` : ''} • ${s.students.length} ${s.students.length === 1 ? 'student' : 'students'}`,
              }))}
            />
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500" htmlFor="attendance-date">Date</label>
            <input
              id="attendance-date"
              type="date"
              value={date}
              disabled={saving || confirmCorrection}
              onChange={(e) => {
                const nextDate = e.target.value
                if (nextDate && nextDate !== date) changeSelection(() => setDate(nextDate))
              }}
              className="h-9 px-3 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500"
            />
            {isToday && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-700 text-white">
                Today
              </span>
            )}
            {ready && (
              <span className="text-xs text-slate-500 ml-auto">
                {present} present • {absent} absent{unmarked > 0 && ` • ${unmarked} unmarked`}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            {formatLong(date)} • {students.length} {students.length === 1 ? 'student' : 'students'}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={!ready || saving || confirmCorrection}
              onClick={() => setAll('present')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-surface text-xs font-medium hover:bg-slate-50"
            >
              Mark all present
            </button>
            <button
              type="button"
              disabled={!ready || saving || confirmCorrection}
              onClick={() => setAll('absent')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-surface text-xs font-medium hover:bg-slate-50"
            >
              Mark all absent
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loadError ? (
            <div role="alert" className="py-6 text-sm text-slate-700">
              <p>{loadError}</p>
              <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="mt-2 min-h-11 font-semibold text-link">
                Reload attendance
              </button>
            </div>
          ) : !ready ? (
            <div role="status" aria-label="Loading attendance" className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {students.map((s) => {
                const isPresent = records[s.username] === 'present'
                const isAbsent = records[s.username] === 'absent'
                return (
                  <li key={s.username} className="py-2.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0 bg-[var(--avatar-bg)]">
                      {s.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{s.fullName}</p>
                      <p className="text-xs text-slate-500 font-mono">{s.studentNumber}</p>
                    </div>
                    <div className="flex rounded-lg border border-slate-200 overflow-hidden flex-shrink-0">
                      <button
                        type="button"
                        disabled={saving || confirmCorrection}
                        onClick={() => setRecords((prev) => ({ ...prev, [s.username]: 'present' }))}
                        aria-pressed={isPresent}
                        className={`px-3 py-1.5 text-xs font-semibold ${isPresent ? 'bg-emerald-700 text-white' : 'bg-surface text-slate-500 hover:bg-slate-50'}`}
                      >
                        Present
                      </button>
                      <button
                        type="button"
                        disabled={saving || confirmCorrection}
                        onClick={() => setRecords((prev) => ({ ...prev, [s.username]: 'absent' }))}
                        aria-pressed={isAbsent}
                        className={`px-3 py-1.5 text-xs font-semibold ${isAbsent ? 'bg-red-600 text-white' : 'bg-surface text-slate-500 hover:bg-slate-50'}`}
                      >
                        Absent
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        {confirmCorrection && (
          <p role="status" className="border-t border-slate-100 px-6 pt-3 text-sm text-slate-700">
            Replace the saved marks for this class and date? This correction will be recorded in the attendance history.
          </p>
        )}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={confirmCorrection ? () => setConfirmCorrection(false) : onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50"
          >
            {confirmCorrection ? 'Keep editing' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !ready || students.length === 0 || !sec}
            className="px-4 py-2 rounded-lg bg-[#153357] text-white text-sm font-semibold hover:bg-[#0f2744] inline-flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Check className="w-4 h-4" aria-hidden />}
            {saving ? 'Saving...' : confirmCorrection ? 'Confirm correction' : revision ? 'Save correction' : 'Save attendance'}
          </button>
        </div>
      </DialogPanel>
    </div>
  )
}
