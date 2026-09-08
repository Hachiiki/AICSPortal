'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export interface AttendanceStudent {
  username: string
  fullName: string
  studentNumber: string
}

interface AttendanceModalProps {
  sectionKey: string
  code: string
  title: string
  students: AttendanceStudent[]
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

export function AttendanceModal({
  sectionKey, code, title, students, facultyUsername, branch, onClose, onSaved,
}: AttendanceModalProps) {
  const [date, setDate] = useState(todayLocal)
  const [records, setRecords] = useState<Record<string, 'present' | 'absent'>>({})
  const [loadingRecord, setLoadingRecord] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load any existing session for this section + date so re-opening
  // a day shows what was recorded instead of blank toggles.
  const loadRecord = useCallback(async (day: string) => {
    setLoadingRecord(true)
    try {
      const params = new URLSearchParams({ username: facultyUsername, sectionKey, date: day })
      const res = await fetch(`/api/attendance?${params.toString()}`)
      const data = await res.json()
      if (data.ok && data.records) {
        setRecords(data.records)
      } else {
        setRecords(Object.fromEntries(students.map((s) => [s.username, 'present'])))
      }
    } catch {
      setRecords(Object.fromEntries(students.map((s) => [s.username, 'present'])))
    } finally {
      setLoadingRecord(false)
    }
  }, [facultyUsername, sectionKey, students])

  useEffect(() => {
    loadRecord(date)
  }, [date, loadRecord])

  const setAll = (status: 'present' | 'absent') => {
    setRecords(Object.fromEntries(students.map((s) => [s.username, status])))
  }

  const present = Object.values(records).filter((s) => s === 'present').length
  const absent = students.length - present

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch, sectionKey, date, records, performedBy: facultyUsername }),
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
                <span className="font-mono font-bold text-blue-700">{code}</span> {title}
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
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500"
            />
            <span className="text-xs text-slate-500 ml-auto">{present} present • {absent} absent</span>
          </div>
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
            disabled={saving || loadingRecord || students.length === 0}
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
