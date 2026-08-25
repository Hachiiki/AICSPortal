'use client'

import { useState, useMemo } from 'react'
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

// A row in the grade table: one student per subject
interface GradeRow {
  _key: string
  studentUsername: string
  studentName: string
  studentNumber: string
  section: string
  subjectCode: string
  subjectTitle: string
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

  // Build grade rows from subjects + students
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
        midterm: s.midterm || '',
        finals: s.finals || '',
        finalGrade: s.finalGrade || '',
        remarks: s.remarks || '',
        status: s.status || '',
        dirty: false,
      }
    })
  }, [subjects, allStudents])

  // Sync external data to local editable state
  if (loading && rows.length === 0) {
    // still loading
  } else if (!loading && rows.length === 0 && gradeRows.length > 0) {
    setRows(gradeRows)
  }

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

  const updateField = (key: string, field: 'midterm' | 'finals' | 'finalGrade' | 'remarks', value: string) => {
    setRows((prev) => prev.map((r) =>
      r._key === key ? { ...r, [field]: value, dirty: true } : r
    ))
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
        setRows((prev) => prev.map((r) => ({ ...r, dirty: false })))
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
          {/* Page header */}
          <div>
            <button onClick={() => onNavigate('dashboard')} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 mb-3">
              <ChevronRight className="w-4 h-4 rotate-180" /> Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Grade Encoding</h1>
            <p className="text-sm text-slate-500 mt-1">
              {faculty.semester} &bull; AY {faculty.academicYear} &bull; {gradeRows.length} enrollment records
            </p>
          </div>

          {/* Filters + save */}
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student or subject..."
                  className="w-full h-10 pl-10 pr-3 rounded-lg border border-slate-200 text-sm bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="flex items-center gap-1">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 bg-white"
                >
                  <option value="all">All Subjects</option>
                  {subjectCodes.map((s) => (
                    <option key={s.code} value={s.code}>{s.code} - {s.title}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {dirtyCount > 0 && (
                <span className="text-xs font-medium text-amber-600">
                  {dirtyCount} unsaved {dirtyCount === 1 ? 'change' : 'changes'}
                </span>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || dirtyCount === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : dirtyCount > 0 ? <Save className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Grade table */}
          {filteredRows.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-16 text-center">
              <p className="text-sm text-slate-500">No records found.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-left">Student</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-left">Subject</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center w-24">Midterm</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center w-24">Finals</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center w-24">Final Grade</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center w-28">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr
                        key={row._key}
                        className={`border-b border-slate-100 last:border-b-0 ${row.dirty ? 'bg-amber-50/40' : 'hover:bg-slate-50/60'}`}
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-900">{row.studentName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{row.studentNumber} &bull; {row.section}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-bold text-blue-700">{row.subjectCode}</span>
                          <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{row.subjectTitle}</p>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={row.midterm}
                            onChange={(e) => updateField(row._key, 'midterm', e.target.value)}
                            className="w-16 h-8 px-2 text-center font-mono text-sm rounded border border-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={row.finals}
                            onChange={(e) => updateField(row._key, 'finals', e.target.value)}
                            className="w-16 h-8 px-2 text-center font-mono text-sm rounded border border-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={row.finalGrade}
                            onChange={(e) => updateField(row._key, 'finalGrade', e.target.value)}
                            className="w-16 h-8 px-2 text-center font-mono text-sm font-bold rounded border border-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={row.remarks}
                            onChange={(e) => updateField(row._key, 'remarks', e.target.value)}
                            className="w-full h-8 px-2 text-xs rounded border border-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white"
                          >
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
            </div>
          )}

          {/* Hint */}
          <p className="text-xs text-slate-400">
            Edit grades directly in the table. Changed rows are highlighted amber. Click Save Changes to persist.
          </p>
        </main>
      </div>
    </div>
  )
}
