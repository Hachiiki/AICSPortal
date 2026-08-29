'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronRight,
  Save,
  Check,
  Loader2,
  Filter,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Student, View } from '@/lib/aics/types'
import type { Course, Session } from '@/lib/schedule'
import type { PortalEvent } from '@/lib/aics/events'
import type { Professor } from '@/lib/aics/professors'
import type { Task } from '@/lib/aics/tasks'
import type { Announcement } from '@/lib/aics/announcements'
import type { FacultyMember, FacultyStudent } from '@/lib/aics/faculty'
import { FacultySidebar } from './FacultySidebar'
import { Topbar } from '../portal/Topbar'
import { RemarksBadge } from '../portal/RemarksBadge'
import { DashboardSkeleton } from '../portal/Skeleton'

interface FacultyGradeEncodingPageProps {
  student: Student
  courses: Course[]
  sessions: Session[]
  onNavigate: (view: View) => void
  onLogout: () => void
  events?: PortalEvent[]
  professors?: Professor[]
  tasks?: Task[]
  announcements?: Announcement[]
  facultyData?: { faculty: FacultyMember; subjects: any[]; students: FacultyStudent[] } | null
  facultyLoading?: boolean
}

interface FacultyApiSubject {
  code: string
  title: string
  units: number
  studentUsername: string
  professor: string
  professorEmail: string
  schedule: string
  room: string
  midterm: string
  finals: string
  finalGrade: string
  remarks: string
  academicYear: string
  semester: string
  yearLevel: string
  status: string
}

// A row in the grade table: one student per subject — matches prototype V23 (Prelim + Midterm + Finals + Final + Remarks + Status)
interface GradeRow {
  _key: string
  studentUsername: string
  studentName: string
  studentNumber: string
  section: string
  subjectCode: string
  subjectTitle: string
  prelim: string
  midterm: string
  finals: string
  finalGrade: string
  remarks: string
  status: string
  dirty: boolean // has unsaved changes
}

export function FacultyGradeEncodingPage({
  student, courses, sessions, onNavigate, onLogout,
  events, professors, tasks, announcements,
  facultyData, facultyLoading,
}: FacultyGradeEncodingPageProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [rows, setRows] = useState<GradeRow[]>([])

  const faculty = facultyData?.faculty ?? null
  const subjects: FacultyApiSubject[] = facultyData?.subjects ?? []
  const allStudents: FacultyStudent[] = facultyData?.students ?? []
  const loading = facultyLoading ?? true

  // Build grade rows from subjects + students — includes prelim (prototype V23)
  const gradeRows = useMemo<GradeRow[]>(() => {
    if (subjects.length === 0) return []
    return subjects.map((s) => {
      const stu = allStudents.find((st) => st.username === s.studentUsername)
      return {
        _key: `${s.studentUsername}-${s.code}`,
        studentUsername: s.studentUsername,
        studentName: stu?.fullName ?? s.studentUsername,
        studentNumber: stu?.studentNumber ?? '',
        section: stu?.section ?? '',
        subjectCode: s.code,
        subjectTitle: s.title,
        prelim: (s as any).prelim || '',
        midterm: s.midterm || '',
        finals: s.finals || '',
        finalGrade: s.finalGrade || '',
        remarks: s.remarks || '',
        status: s.status || '',
        dirty: false,
      }
    })
  }, [subjects, allStudents])

  // Sync external data to local editable state when facultyData changes
  // (e.g. on initial load, or when parent re-fetches after save)
  useEffect(() => {
    if (!loading && gradeRows.length > 0) {
      setRows(gradeRows)
    }
  }, [gradeRows, loading])

  // Unique subject codes for the filter
  const subjectCodes = useMemo(() => {
    const codes = new Map<string, string>()
    for (const s of subjects) {
      if (!codes.has(s.code)) codes.set(s.code, s.title)
    }
    return Array.from(codes.entries()).map(([code, title]) => ({ code, title }))
  }, [subjects])

  // Filter rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (subjectFilter !== 'all' && r.subjectCode !== subjectFilter) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return r.studentName.toLowerCase().includes(q) ||
          r.studentNumber.toLowerCase().includes(q) ||
          r.subjectCode.toLowerCase().includes(q)
      }
      return true
    })
  }, [rows, subjectFilter, searchQuery])

  const dirtyCount = rows.filter((r) => r.dirty).length

  const updateField = (key: string, field: 'prelim' | 'midterm' | 'finals' | 'finalGrade' | 'remarks', value: string) => {
    // allow INC (incomplete) — normalize to uppercase
    const v = value.toUpperCase() === 'INC' ? 'INC' : value
    // numeric 0-100 or INC or empty, otherwise ignore
    if (v !== '' && v !== 'INC' && (isNaN(Number(v)) || Number(v) < 0 || Number(v) > 100)) return
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, [field]: v, dirty: true } : r)))
  }

  const handleSave = async () => {
    const dirtyRows = rows.filter((r) => r.dirty)
    if (dirtyRows.length === 0) {
      toast.info('No changes to save.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/grades/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: dirtyRows.map((r) => ({
            studentUsername: r.studentUsername,
            subjectCode: r.subjectCode,
            branch: faculty?.branch ?? student.branch,
            prelim: r.prelim,
            midterm: r.midterm,
            finals: r.finals,
            finalGrade: r.finalGrade,
            remarks: r.remarks,
          })),
        }),
      })
      const data = await res.json()
      if (data.ok) {
        toast.success(`${data.message}`)
        // Update local state: mark all dirty rows as clean + keep saved values
        setRows((prev) => prev.map((r) =>
          r.dirty ? { ...r, dirty: false } : r
        ))
      } else {
        toast.error(data.error || 'Failed to save grades.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleNavigate = (v: View) => {
    onNavigate(v)
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  if (!faculty) {
    return (
      <div className="min-h-dvh bg-slate-50 font-sans flex items-center justify-center">
        <p className="text-red-600 text-sm">Faculty data not found.</p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-slate-50 font-sans">
      <FacultySidebar active="grade-encoding" onNavigate={handleNavigate} mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
      <div className="lg:pl-60">
        <Topbar student={student} onOpenMobileNav={() => setMobileNavOpen(true)} onProfile={() => onNavigate('profile')} onNavigate={onNavigate} onLogout={onLogout} events={events} professors={professors} tasks={tasks} />
        <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 min-w-0 space-y-6">
          {/* Page header — 1st Sem • AY 2026-2027 - Prelim / Midterm / Finals → final auto-computed + legend on right (prototype V23) */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <button onClick={() => onNavigate('dashboard')} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 mb-3">
                <ChevronRight className="w-4 h-4 rotate-180" /> Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Grade Encoding</h1>
              <p className="text-sm text-slate-500 mt-1">1st Sem • AY 2026-2027 - Prelim / Midterm / Finals → final auto-computed</p>
            </div>
            <div className="hidden sm:flex items-center gap-1 p-1 rounded-full bg-slate-50 border border-slate-200 shadow-sm self-center">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-xs font-medium"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Draft</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium"><span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span> Submitted</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Released</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 text-xs font-medium">Incomplete</span>
            </div>
          </div>

          {/* Section selector — pill style (prototype V23) */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Section</span>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setSubjectFilter('all')} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${subjectFilter==='all'?'bg-[#153357] text-white border-[#153357]':'bg-white text-slate-700 border-slate-200'}`}>All sections ({subjectCodes.length})</button>
              {subjectCodes.map((s) => (
                <button key={s.code} onClick={() => setSubjectFilter(s.code)} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${subjectFilter===s.code?'bg-[#287CBB] text-white border-[#287CBB]':'bg-white text-slate-700 border-slate-200'}`}>{s.code} <span className="opacity-70">• {s.title.slice(0,18)}</span></button>
              ))}
            </div>
          </div>

          {/* Grade table — per-period editing, All read-only, INC + focus preserved (prototype V23) */}
          {filteredRows.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-16 text-center">
              <p className="text-sm text-slate-500">No records found.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <div className="flex gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 self-center">Period</span>
                  <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#153357] text-white">All periods</span>
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-xs">Draft</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-amber-700 bg-[#fffbeb] border border-amber-100 rounded-full px-2.5 py-1">Final • auto-computed • editable</span>
                  <span className="text-xs font-medium text-amber-600">{dirtyCount} unsaved</span>
                  <button type="button" onClick={handleSave} disabled={saving || dirtyCount===0} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-left">Student</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center w-20">Prelim</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center w-20">Midterm</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center w-20">Finals</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center w-20">Final</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center w-24">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={row._key} className={`border-b border-slate-100 last:border-b-0 ${row.dirty ? 'bg-amber-50/40' : 'hover:bg-slate-50/60'}`}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-900">{row.studentName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{row.studentNumber} • {row.section}</p>
                          <p className="font-mono text-xs font-bold text-blue-700">{row.subjectCode}</p>
                        </td>
                        <td className="px-3 py-3">
                          <input type="text" value={row.prelim} onChange={(e) => updateField(row._key, 'prelim', e.target.value)} className="w-14 h-8 px-2 text-center font-mono text-sm rounded border border-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200" />
                        </td>
                        <td className="px-3 py-3">
                          <input type="text" value={row.midterm} onChange={(e) => updateField(row._key, 'midterm', e.target.value)} className="w-14 h-8 px-2 text-center font-mono text-sm rounded border border-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200" />
                        </td>
                        <td className="px-3 py-3">
                          <input type="text" value={row.finals} onChange={(e) => updateField(row._key, 'finals', e.target.value)} className="w-14 h-8 px-2 text-center font-mono text-sm rounded border border-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200" />
                        </td>
                        <td className="px-3 py-3">
                          <input type="text" value={row.finalGrade} onChange={(e) => updateField(row._key, 'finalGrade', e.target.value)} className="w-14 h-8 px-2 text-center font-mono text-sm font-bold rounded border border-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200" />
                        </td>
                        <td className="px-3 py-3">
                          <select value={row.remarks} onChange={(e) => updateField(row._key, 'remarks', e.target.value)} className="w-full h-8 px-2 text-xs rounded border border-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white">
                            <option value="">—</option>
                            <option value="Passed">Passed</option>
                            <option value="In Progress">In Progress</option>
                            <option value="INC">INC</option>
                            <option value="Failed">Failed</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">Edited rows amber • All periods read-only preview • Prelim/Midterm/Finals editable per period</div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
