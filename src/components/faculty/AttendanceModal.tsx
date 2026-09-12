'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { X, Check, ChevronDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

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
  // Class switcher: the roster, records, and save target all follow
  // this key, so teachers move between classes without closing.
  const [secKey, setSecKey] = useState(initialKey)
  const sec = useMemo(
    () => sections.find((s) => s.key === secKey) || sections[0] || null,
    [sections, secKey]
  )
  const students = useMemo(() => sec?.students || [], [sec])
  const [date, setDate] = useState(todayLocal)
  const [records, setRecords] = useState<Record<string, 'present' | 'absent'>>({})
  const [loadingRecord, setLoadingRecord] = useState(false)
  const [saving, setSaving] = useState(false)

  const today = todayLocal()
  const isToday = date === today

  // Load any existing session for this section + date so re-opening
  // a day (or switching classes) shows what was recorded instead of
  // blank toggles.
  const loadRecord = useCallback(async (day: string, key: string, list: AttendanceStudent[]) => {
    setLoadingRecord(true)
    try {
      const params = new URLSearchParams({ username: facultyUsername, sectionKey: key, date: day })
      const res = await fetch(`/api/attendance?${params.toString()}`)
      const data = await res.json()
      if (data.ok && data.records) {
        setRecords(data.records)
      } else {
        setRecords(Object.fromEntries(list.map((s) => [s.username, 'present'])))
      }
    } catch {
      setRecords(Object.fromEntries(list.map((s) => [s.username, 'present'])))
    } finally {
      setLoadingRecord(false)
    }
  }, [facultyUsername])

  useEffect(() => {
    if (sec) loadRecord(date, sec.key, students)
  }, [date, sec, students, loadRecord])

  const switchSection = (key: string) => {
    if (key === secKey) return
    setRecords({})
    setSecKey(key)
  }

  const setAll = (status: 'present' | 'absent') => {
    setRecords(Object.fromEntries(students.map((s) => [s.username, status])))
  }

  const present = Object.values(records).filter((s) => s === 'present').length
  const absent = students.length - present

  const handleSave = async () => {
    if (!sec) return
    setSaving(true)
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch, sectionKey: sec.key, date, records, performedBy: facultyUsername }),
      })
      const data = await res.json()
      if (data.ok) {
        toast.success(data.message || 'Attendance saved.')
        onSaved()
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
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold">Take attendance</h3>
              <p className="text-xs text-slate-500 mt-1">
                {sec ? (<><span className="font-mono font-bold text-blue-700">{sec.code}</span> {sec.title} • {termOf(sec.key)}</>) : 'No classes found.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close attendance"
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Class</label>
            <div className="relative mt-1">
              <select
                value={sec?.key || ''}
                onChange={(e) => switchSection(e.target.value)}
                aria-label="Switch class"
                className="w-full h-10 px-3 pr-8 rounded-xl border border-slate-200 bg-white text-sm font-medium shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none appearance-none"
              >
                {sections.map((s) => (
                  <option key={s.key} value={s.key}>{s.code} — {s.title}{termOf(s.key) ? ` • ${termOf(s.key)}` : ''} • {s.students.length} {s.students.length === 1 ? 'student' : 'students'}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500"
            />
            {isToday && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-700 text-white">
                Today
              </span>
            )}
            <span className="text-xs text-slate-500 ml-auto">{present} present • {absent} absent</span>
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            {formatLong(date)} • {students.length} {students.length === 1 ? 'student' : 'students'}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setAll('present')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium hover:bg-slate-50"
            >
              Mark all present
            </button>
            <button
              type="button"
              onClick={() => setAll('absent')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium hover:bg-slate-50"
            >
              Mark all absent
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loadingRecord ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {students.map((s) => {
                const isPresent = (records[s.username] || 'present') === 'present'
                return (
                  <li key={s.username} className="py-2.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0" style={{ background: '#1e293b' }}>
                      {s.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{s.fullName}</p>
                      <p className="text-xs text-slate-500 font-mono">{s.studentNumber}</p>
                    </div>
                    <div className="flex rounded-lg border border-slate-200 overflow-hidden flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setRecords((prev) => ({ ...prev, [s.username]: 'present' }))}
                        aria-pressed={isPresent}
                        className={`px-3 py-1.5 text-xs font-semibold ${isPresent ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                      >
                        Present
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecords((prev) => ({ ...prev, [s.username]: 'absent' }))}
                        aria-pressed={!isPresent}
                        className={`px-3 py-1.5 text-xs font-semibold ${!isPresent ? 'bg-red-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
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
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loadingRecord || students.length === 0 || !sec}
            className="px-4 py-2 rounded-lg bg-[#153357] text-white text-sm font-semibold hover:bg-[#0f2744] inline-flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save attendance'}
          </button>
        </div>
      </div>
    </div>
  )
}
