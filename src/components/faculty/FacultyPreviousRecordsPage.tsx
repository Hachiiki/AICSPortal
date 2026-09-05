'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Archive, Search, MapPin, Clock, Eye, ChevronDown, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import type { Student, View } from '@/lib/aics/types'
import type { PortalEvent } from '@/lib/aics/events'
import type { Professor } from '@/lib/aics/professors'
import type { Task } from '@/lib/aics/tasks'
import type { FacultyMember, FacultyStudent } from '@/lib/aics/faculty'
import { PortalShell } from '../portal/PortalShell'
import { DashboardSkeleton } from '../portal/Skeleton'

interface Props {
  student: Student
  onNavigate: (view: View) => void
  onLogout: () => void
  events?: PortalEvent[]
  professors?: Professor[]
  tasks?: Task[]
  facultyData?: { faculty: FacultyMember; subjects: any[]; students: FacultyStudent[] } | null
  facultyLoading?: boolean
}

// Mock previous records history — mirrors prototype V23
const previousRecords = [
  {
    ay: '2025-2026',
    sem: '1st Sem',
    status: 'Graded' as const,
    sections: [
      { code: 'CS 101', title: 'Introduction to Computing', room: 'Room 301 — Comp Lab A', schedule: 'MWF 08:00-09:30', yearLevel: 'BSIS 1-A', enrolled: 24, avg: '84.2', assignment: 'current' as const, note: '' },
      { code: 'CS 102', title: 'Data Structures', room: 'Room 302 — Lecture', schedule: 'TTH 10:00-11:30', yearLevel: 'BSIS 2-A', enrolled: 22, avg: '81.7', assignment: 'current' as const, note: '' },
      { code: 'CS 105', title: 'Networking Fundamentals', room: 'Room 303 — Lab B', schedule: 'TTH 13:00-14:30', yearLevel: 'BSIS 2-A', enrolled: 23, avg: '79.4', assignment: 'former' as const, note: 'You taught AY 2025-2026 • Now Prof. Santos is assigned (switched AY 2026-2027)' },
    ],
  },
  {
    ay: '2024-2025',
    sem: '2nd Sem',
    status: 'Graded' as const,
    sections: [
      { code: 'CS 101', title: 'Introduction to Computing', room: 'Room 301 — Comp Lab A', schedule: 'MWF 08:00-09:30', yearLevel: 'BSIS 1-A', enrolled: 25, avg: '83.5', assignment: 'current' as const, note: '' },
      { code: 'CS 106', title: 'Object-Oriented Programming', room: 'Room 303 — Lab A', schedule: 'TTH 10:00-11:30', yearLevel: 'BSIS 2-A', enrolled: 20, avg: '82.1', assignment: 'former' as const, note: 'You taught AY 2024-2025 • Now Prof. Cruz is assigned — section reassigned (CS 201 remains yours)' },
    ],
  },
  {
    ay: '2024-2025',
    sem: '1st Sem',
    status: 'Archived' as const,
    sections: [
      { code: 'CS 100', title: 'Computer Fundamentals', room: 'Room 301', schedule: 'MWF 10:00-11:30', yearLevel: 'BSIS 1-A', enrolled: 28, avg: '85.0', assignment: 'current' as const, note: '' },
      { code: 'CS 105', title: 'Networking Fundamentals', room: 'Room 303', schedule: 'TTH 13:00-14:30', yearLevel: 'BSIS 2-A', enrolled: 24, avg: '78.9', assignment: 'former' as const, note: 'Former — you were replaced AY 2025-2026' },
    ],
  },
]

// Released teaching history from GET /api/faculty/history.
// Only fully released rows qualify. The current term never appears.
interface HistorySection {
  code: string
  title: string
  room: string
  schedule: string
  yearLevel: string
  enrolled: number
  avg: string
  assignment: 'current' | 'former'
  note: string
}

interface HistoryTerm {
  ay: string
  sem: string
  status: string
  sections: HistorySection[]
}

export function FacultyPreviousRecordsPage({ student, onNavigate, onLogout, events, professors, tasks, facultyData, facultyLoading }: Props) {
  const [search, setSearch] = useState('')
  const [year, setYear] = useState('all')
  const [assignment, setAssignment] = useState('all')
  const [terms, setTerms] = useState<HistoryTerm[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [selectedSection, setSelectedSection] = useState<(HistorySection & { ay: string; sem: string }) | null>(null)

  const faculty = facultyData?.faculty ?? null
  const loading = facultyLoading ?? true

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const res = await fetch(`/api/faculty/history?username=${encodeURIComponent(student.username)}`)
      const data = await res.json()
      if (data.ok) setTerms(data.terms || [])
      else setHistoryError(data.error || 'Failed to load teaching history.')
    } catch {
      setHistoryError('Network error. Please try again.')
    } finally {
      setHistoryLoading(false)
    }
  }, [student.username])

  useEffect(() => {
    if (!loading && faculty) fetchHistory()
  }, [loading, faculty, fetchHistory])

  const yearOptions = useMemo(() => Array.from(new Set(terms.map((t) => t.ay))).sort().reverse(), [terms])

  const summary = useMemo(() => {
    const sections = terms.flatMap((t) => t.sections)
    return {
      years: terms.length,
      sections: sections.length,
      students: sections.reduce((a, s) => a + s.enrolled, 0),
    }
  }, [terms])

  const handleExportCsv = () => {
    const rows: string[] = []
    rows.push(['Academic Year', 'Semester', 'Subject Code', 'Subject Title', 'Room', 'Schedule', 'Enrolled', 'Average', 'Assignment'].join(','))
    for (const term of filtered) {
      for (const s of term.sections) {
        const visible = assignment === 'all' ? true : s.assignment === assignment
        if (!visible) continue
        rows.push([
          term.ay, term.sem, s.code,
          `"${s.title.replace(/"/g, '""')}"`,
          `"${s.room.replace(/"/g, '""')}"`,
          `"${s.schedule.replace(/"/g, '""')}"`,
          String(s.enrolled), s.avg, s.assignment,
        ].join(','))
      }
    }
    if (rows.length === 1) {
      toast.info('No history to export for the current filters.')
      return
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `teaching-history-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`Exported ${rows.length - 1} rows.`)
  }

  const filtered = useMemo(() => {
    let data = terms
    if (year !== 'all') data = data.filter((t) => t.ay === year)
    if (search) {
      const q = search.toLowerCase()
      data = data
        .map((term) => ({
          ...term,
          sections: term.sections.filter((s) => s.code.toLowerCase().includes(q) || s.title.toLowerCase().includes(q) || term.ay.toLowerCase().includes(q)),
        }))
        .filter((t) => t.sections.length > 0 || t.ay.toLowerCase().includes(q) || t.sem.toLowerCase().includes(q))
    }
    return data
  }, [terms, search, year])

  if (loading || historyLoading) return <DashboardSkeleton />
  if (historyError) {
    return (
      <div className="min-h-dvh bg-slate-50 grid place-items-center">
        <div className="text-center">
          <p className="text-red-600 text-sm font-medium mb-2">{historyError}</p>
          <button onClick={fetchHistory} className="text-blue-600 text-sm font-medium hover:underline">
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
      active="previous-records"
      onNavigate={onNavigate}
      onLogout={onLogout}
      events={events}
      professors={professors}
      tasks={tasks}
    >
        <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Previous Records</h1>
              <p className="text-sm text-slate-500 mt-1">By Academic Year • easy to navigate • shows sections you formerly handled (professor switches)</p>
            </div>
            <button onClick={handleExportCsv} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium hover:bg-slate-50 inline-flex items-center gap-2">
              <Archive className="w-4 h-4" /> Export history (CSV)
            </button>
          </div>

          {/* Summary */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-full bg-white border border-slate-200">{summary.years} academic year{summary.years === 1 ? '' : 's'}</span>
            <span className="px-3 py-1.5 rounded-full bg-white border border-slate-200">{summary.sections} section{summary.sections === 1 ? '' : 's'} historically</span>
            <span className="px-3 py-1.5 rounded-full bg-white border border-slate-200">{summary.students} student{summary.students === 1 ? '' : 's'} taught</span>
            <span className="px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800">Former sections are read-only</span>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[220px]">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Search</label>
              <div className="relative mt-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Subject, section, AY..." className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Academic Year</label>
              <div className="relative mt-1">
                <select value={year} onChange={(e) => setYear(e.target.value)} className="h-10 px-3 pr-8 rounded-xl border border-slate-200 bg-white text-sm font-medium shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none appearance-none">
                  <option value="all">All years</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>AY {y}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Assignment</label>
              <div className="relative mt-1">
                <select value={assignment} onChange={(e) => setAssignment(e.target.value)} className="h-10 px-3 pr-8 rounded-xl border border-slate-200 bg-white text-sm font-medium shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none appearance-none">
                  <option value="all">All</option>
                  <option value="current">Currently teaching</option>
                  <option value="former">Formerly taught (switched)</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Categorized history */}
          <div className="space-y-6">
            {filtered.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <Archive className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">No released history yet</p>
                <p className="text-xs text-slate-400 mt-1">Released terms from prior academic years will appear here.</p>
              </div>
            )}
            {filtered.map((term) => {
              const sections = assignment === 'all' ? term.sections : term.sections.filter((s) => s.assignment === assignment)
              if (sections.length === 0) return null
              const statusColor = term.status === 'Graded' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : term.status === 'Archived' ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              return (
                <div key={`${term.ay}-${term.sem}`} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-900">
                        {term.ay} • {term.sem}
                      </span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border ${statusColor}`}>{term.status}</span>
                      <span className="text-xs text-slate-500">{sections.length} sections</span>
                    </div>
                    <span className="text-xs text-slate-500">{sections.reduce((a, s) => a + s.enrolled, 0)} students total</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {sections.map((s) => (
                      <div key={s.code} className={`px-6 py-4 flex flex-wrap items-start justify-between gap-4 hover:bg-slate-50/50 ${s.assignment === 'former' ? 'bg-amber-50/20' : ''}`}>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{s.code}</span>
                            <span className="text-sm font-semibold text-slate-900">{s.title}</span>
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{s.yearLevel}</span>
                            {s.assignment === 'current' ? (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Currently teaching</span>
                            ) : (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Former — not currently assigned</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap text-[11px] text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {s.room}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {s.schedule}
                            </span>
                            <span>Enrolled: {s.enrolled} • Avg: {s.avg}</span>
                          </div>
                          {s.note && <p className="text-xs text-amber-700 mt-1.5 bg-amber-50 border border-amber-100 rounded px-2 py-1 inline-flex items-center gap-1.5">{s.note}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-slate-500 hidden sm:inline">Read-only</span>
                          <button
                            type="button"
                            onClick={() => setSelectedSection({ ...s, ay: term.ay, sem: term.sem })}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium hover:bg-slate-50 inline-flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                          {s.assignment === 'former' && <span className="text-[11px] text-slate-400">Reassigned</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
            <Archive className="w-4 h-4" /> Former sections remain read-only. If you were replaced, the current professor is shown. History is branch-scoped and audit-logged.
          </div>
        </main>

      {/* Read-only section drawer */}
      <AnimatePresence>
        {selectedSection && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
              onClick={() => setSelectedSection(null)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ x: 520 }}
              animate={{ x: 0 }}
              exit={{ x: 520 }}
              transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
              className="fixed right-0 top-0 h-full w-full max-w-[420px] bg-white shadow-2xl z-50 flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label="Section record"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-14 px-6 border-b border-slate-200 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{selectedSection.code} — {selectedSection.title}</h3>
                  <p className="text-xs text-slate-500">{selectedSection.ay} {selectedSection.sem} • read-only</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSection(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Enrolled</p>
                    <p className="font-bold text-lg mt-1 text-slate-900">{selectedSection.enrolled}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Class average</p>
                    <p className="font-bold text-lg mt-1 text-slate-900">{selectedSection.avg}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Room</p>
                    <p className="font-medium mt-1 text-slate-900">{selectedSection.room}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Schedule</p>
                    <p className="font-medium mt-1 text-slate-900">{selectedSection.schedule}</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Assignment</p>
                  <p className="font-medium mt-1 text-slate-900">
                    {selectedSection.assignment === 'current' ? 'Currently teaching' : 'Formerly taught'}
                  </p>
                  {selectedSection.note && <p className="text-amber-700 mt-1">{selectedSection.note}</p>}
                </div>
              </div>
              <div className="p-4 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedSection(null)}
                  className="w-full h-10 rounded-lg border border-slate-200 font-medium text-sm hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </PortalShell>
  )
}
