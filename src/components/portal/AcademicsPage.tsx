'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download,
  CheckCircle2,
  Clock,
  ChevronRight,
  X,
  AlertTriangle,
  ClipboardList,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Student, Subject } from '@/lib/aics/types'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import type { Task, TaskType, TaskStatus } from '@/lib/aics/tasks'
import { computeStatus, TYPE_COLORS, STATUS_COLORS } from '@/lib/aics/tasks'

interface AcademicsPageProps {
  student: Student
  onBack: () => void
  onProfile: () => void
  onLogout: () => void
}

// GPA computation: unit-weighted average of finalGrade
function computeGPA(subjects: Subject[]): string {
  let totalUnits = 0
  let weightedSum = 0
  for (const s of subjects) {
    const grade = parseFloat(s.finalGrade)
    if (!isNaN(grade)) {
      totalUnits += s.units
      weightedSum += grade * s.units
    }
  }
  if (totalUnits === 0) return '-'
  return (weightedSum / totalUnits).toFixed(2)
}

// Group subjects by term (yearLevel + academicYear + semester)
interface TermGroup {
  key: string
  yearLevel: string
  academicYear: string
  semester: string
  status: string
  subjects: Subject[]
  gpa: string
  totalUnits: number
}

function groupByTerm(subjects: Subject[]): TermGroup[] {
  const map = new Map<string, TermGroup>()
  for (const s of subjects) {
    const yl = s.yearLevel || 'Unknown'
    const ay = s.academicYear || 'Unknown'
    const sem = s.semester || 'Unknown'
    const key = `${yl}|${ay}|${sem}`
    if (!map.has(key)) {
      map.set(key, {
        key, yearLevel: yl, academicYear: ay, semester: sem,
        status: s.status || 'completed', subjects: [], gpa: '-', totalUnits: 0,
      })
    }
    map.get(key)!.subjects.push(s)
  }
  const groups = Array.from(map.values())
  // Sort by academicYear then semester
  groups.sort((a, b) => {
    if (a.academicYear !== b.academicYear) return a.academicYear.localeCompare(b.academicYear)
    return a.semester.localeCompare(b.semester)
  })
  // Compute GPA and units per term
  for (const g of groups) {
    const completed = g.subjects.filter((s) => s.status !== 'in-progress' && parseFloat(s.finalGrade) > 0)
    g.gpa = completed.length > 0 ? computeGPA(completed) : '-'
    g.totalUnits = g.subjects.reduce((sum, s) => sum + s.units, 0)
  }
  return groups
}

// PDF export helpers
function exportYearPDF(student: Student, term: TermGroup) {
  const lastName = student.lastName.replace(/\s+/g, '')
  const firstName = student.firstName.replace(/\s+/g, '')
  const filename = `${lastName}${firstName}_Grades_AY${term.academicYear}.pdf`

  // Dynamically import jspdf + autotable to avoid SSR issues
  Promise.all([import('jspdf'), import('jspdf-autotable')]).then(([{ jsPDF }, mod]: any) => {
    mod.applyPlugin(jsPDF)
    const doc = new jsPDF()
    // Header
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('ASIAN INSTITUTE OF COMPUTER STUDIES', 105, 20, { align: 'center' })
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Student Portal - Grade Report', 105, 27, { align: 'center' })
    // Student info
    doc.setFontSize(10)
    doc.text(`Name: ${student.fullName}`, 14, 40)
    doc.text(`ID: ${student.studentNumber}`, 14, 46)
    doc.text(`Program: ${student.program}`, 14, 52)
    doc.text(`Year/Section: ${student.yearLevel}, ${student.section}`, 14, 58)
    // Title
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`Grade Report - ${term.yearLevel} | AY ${term.academicYear}`, 14, 68)
    // Table
    const head = [['Code', 'Subject', 'Units', 'Professor', 'Midterm', 'Finals', 'Final Grade', 'Remarks']]
    const body = term.subjects.map((s) => [s.code, s.title, String(s.units), s.professor, s.midterm, s.finals, s.finalGrade, s.remarks])
    body.push(['', 'Total Units Enrolled', String(term.totalUnits), '', '', '', '', ''])
    doc.autoTable({ head, body, startY: 74, theme: 'grid', styles: { fontSize: 8 } })
    // Footer
    const finalY = (doc as any).lastAutoTable.finalY || 74
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`Year GPA: ${term.gpa}    Total Units: ${term.totalUnits}`, 14, finalY + 10)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, finalY + 16)
    doc.save(filename)
  })
}

function exportAllSubjectsPDF(student: Student, allSubjects: Subject[], cumulativeGPA: string) {
  const lastName = student.lastName.replace(/\s+/g, '')
  const firstName = student.firstName.replace(/\s+/g, '')
  const filename = `${lastName}${firstName}_AllSubjects.pdf`

  Promise.all([import('jspdf'), import('jspdf-autotable')]).then(([{ jsPDF }, mod]: any) => {
    mod.applyPlugin(jsPDF)
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('ASIAN INSTITUTE OF COMPUTER STUDIES', 105, 20, { align: 'center' })
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Student Portal - Complete Subject Record', 105, 27, { align: 'center' })
    doc.setFontSize(10)
    doc.text(`Name: ${student.fullName}`, 14, 40)
    doc.text(`ID: ${student.studentNumber}`, 14, 46)
    doc.text(`Program: ${student.program}`, 14, 52)
    doc.text(`Year/Section: ${student.yearLevel}, ${student.section}`, 14, 58)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Complete Subject Record', 14, 68)
    const head = [['Term', 'Code', 'Subject', 'Units', 'Professor', 'Mid', 'Fin', 'FG', 'Remarks']]
    const body = allSubjects.map((s) => [
      `${s.yearLevel} | AY ${s.academicYear}`, s.code, s.title, String(s.units), s.professor, s.midterm, s.finals, s.finalGrade, s.remarks,
    ])
    const totalUnits = allSubjects.reduce((sum, s) => sum + s.units, 0)
    body.push(['', '', 'TOTAL', String(totalUnits), '', '', '', '', ''])
    doc.autoTable({ head, body, startY: 74, theme: 'grid', styles: { fontSize: 7 } })
    const finalY = (doc as any).lastAutoTable.finalY || 74
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`Cumulative GPA: ${cumulativeGPA}    Total Subjects: ${allSubjects.length}    Total Units: ${totalUnits}`, 14, finalY + 10)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, finalY + 16)
    doc.save(filename)
  })
}

export function AcademicsPage({ student, onBack, onProfile, onLogout }: AcademicsPageProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'grades' | 'subjects' | 'tasks'>('grades')

  const terms = useMemo(() => groupByTerm(student.subjects), [student.subjects])
  const completedSubjects = useMemo(() => student.subjects.filter((s) => s.status !== 'in-progress' && parseFloat(s.finalGrade) > 0), [student.subjects])
  const cumulativeGPA = useMemo(() => computeGPA(completedSubjects), [completedSubjects])
  const totalUnits = useMemo(() => student.subjects.reduce((sum, s) => sum + s.units, 0), [student.subjects])

  const handleNavigate = (v: any) => {
    if (v === 'dashboard') onBack()
  }

  return (
    <div className="min-h-dvh bg-slate-50 font-sans">
      <Sidebar
        active="academics"
        onNavigate={handleNavigate}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      <div className="lg:pl-60">
        <Topbar
          student={student}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onProfile={onProfile}
          onLogout={onLogout}
        />
        <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 min-w-0 space-y-6">
          {/* Page header */}
          <div>
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 mb-3"
            >
              <ChevronRight className="w-4 h-4 rotate-180" /> Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Academics</h1>
            <p className="text-sm text-slate-500 mt-1">
              {student.fullName} &bull; {student.studentNumber} &bull; {student.program}
            </p>
          </div>

          {/* Mini-tab switcher */}
          <div className="inline-flex gap-1 p-1 rounded-xl bg-slate-100">
            <button
              type="button"
              onClick={() => setActiveTab('grades')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'grades' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Grades
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('subjects')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'subjects' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Subjects
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'tasks' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Tasks
            </button>
          </div>

          {/* GRADES TAB */}
          {activeTab === 'grades' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {terms.map((term) => (
                <div key={term.key} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Card header */}
                  <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-slate-900">
                        {term.yearLevel} &bull; AY {term.academicYear} &bull; {term.semester}
                      </h2>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                          term.status === 'completed'
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {term.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {term.status === 'completed' ? 'Completed' : 'In Progress'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => exportYearPDF(student, term)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 flex-shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" /> Export PDF
                    </button>
                  </div>

                  {/* Stat chips */}
                  <div className="px-6 py-3 flex gap-6 border-b border-slate-100">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">GPA</p>
                      <p className="text-base font-bold text-blue-700">{term.gpa}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Units</p>
                      <p className="text-base font-bold text-slate-900">{term.totalUnits}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Subjects</p>
                      <p className="text-base font-bold text-slate-900">{term.subjects.length}</p>
                    </div>
                  </div>

                  {/* Grades table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <Th>Code</Th><Th>Subject</Th><Th center>Units</Th><Th>Professor</Th>
                          <Th center>Midterm</Th><Th center>Finals</Th><Th center>Final Grade</Th><Th center>Remarks</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {term.subjects.map((s) => (
                          <tr key={s.code + term.key} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60">
                            <td className="px-4 py-3"><span className="font-mono text-xs font-bold text-blue-700">{s.code}</span></td>
                            <td className="px-4 py-3"><span className="text-sm text-slate-700">{s.title}</span></td>
                            <td className="px-4 py-3 text-center text-sm text-slate-700">{s.units}</td>
                            <td className="px-4 py-3"><span className="text-sm text-slate-700">{s.professor}</span></td>
                            <td className="px-4 py-3 text-center font-mono text-sm text-slate-700">{s.midterm}</td>
                            <td className="px-4 py-3 text-center font-mono text-sm text-slate-700">{s.finals}</td>
                            <td className="px-4 py-3 text-center"><span className="font-mono text-sm font-bold text-blue-700">{s.finalGrade}</span></td>
                            <td className="px-4 py-3 text-center">
                              {s.status === 'in-progress' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-xs font-medium">
                                  <Clock className="w-3 h-3" /> {s.remarks}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-50 text-green-700 text-xs font-medium">
                                  <CheckCircle2 className="w-3 h-3" /> {s.remarks}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 border-t border-slate-100">
                          <td className="px-4 py-3 text-sm font-semibold text-slate-900" colSpan={2}>Total Units Enrolled</td>
                          <td className="px-4 py-3 text-center text-sm font-bold text-slate-900">{term.totalUnits}</td>
                          <td colSpan={5}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* SUBJECTS TAB */}
          {activeTab === 'subjects' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-slate-900">All Subjects</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Complete enrollment history</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => exportAllSubjectsPDF(student, student.subjects, cumulativeGPA)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 flex-shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" /> Export PDF
                  </button>
                </div>

                {/* Summary chips */}
                <div className="px-6 py-3 flex gap-6 border-b border-slate-100">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Total Units</p>
                    <p className="text-base font-bold text-slate-900">{totalUnits}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Total Subjects</p>
                    <p className="text-base font-bold text-slate-900">{student.subjects.length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Cumulative GPA</p>
                    <p className="text-base font-bold text-blue-700">{cumulativeGPA}</p>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <Th>Term</Th><Th>Code</Th><Th>Subject</Th><Th center>Units</Th><Th>Professor</Th>
                        <Th center>Mid</Th><Th center>Fin</Th><Th center>FG</Th><Th center>Remarks</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {student.subjects.map((s, i) => (
                        <tr key={i} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60">
                          <td className="px-4 py-3 whitespace-nowrap"><span className="text-xs text-slate-500">{s.yearLevel} &bull; AY {s.academicYear}</span></td>
                          <td className="px-4 py-3"><span className="font-mono text-xs font-bold text-blue-700">{s.code}</span></td>
                          <td className="px-4 py-3"><span className="text-sm text-slate-700">{s.title}</span></td>
                          <td className="px-4 py-3 text-center text-sm text-slate-700">{s.units}</td>
                          <td className="px-4 py-3"><span className="text-sm text-slate-700">{s.professor}</span></td>
                          <td className="px-4 py-3 text-center font-mono text-sm text-slate-700">{s.midterm}</td>
                          <td className="px-4 py-3 text-center font-mono text-sm text-slate-700">{s.finals}</td>
                          <td className="px-4 py-3 text-center"><span className="font-mono text-sm font-bold text-blue-700">{s.finalGrade}</span></td>
                          <td className="px-4 py-3 text-center">
                            {s.status === 'in-progress' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-xs font-medium">
                                <Clock className="w-3 h-3" /> {s.remarks}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-50 text-green-700 text-xs font-medium">
                                <CheckCircle2 className="w-3 h-3" /> {s.remarks}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* TASKS TAB */}
          {activeTab === 'tasks' && (
            <TasksTab student={student} />
          )}
        </main>
      </div>
    </div>
  )
}

// ============================================================
//  Tasks Tab — current-term task tracker with submit flow
// ============================================================

function TasksTab({ student }: { student: Student }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState<'all' | TaskType>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all')
  const [submitTask, setSubmitTask] = useState<Task | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Fetch tasks from API
  useEffect(() => {
    let cancelled = false
    async function fetchTasks() {
      try {
        const res = await fetch(`/api/tasks?username=${encodeURIComponent(student.username)}`)
        const data = await res.json()
        if (cancelled) return
        if (data.ok) {
          setTasks(data.tasks)
        } else {
          setError(data.error || 'Failed to load tasks')
        }
      } catch {
        if (!cancelled) setError('Network error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchTasks()
    return () => { cancelled = true }
  }, [student.username])

  // Current-term subjects for the dropdown
  const currentSubjects = useMemo(() => {
    return student.subjects.filter(
      (s) => s.academicYear === student.academicYear && s.semester === student.semester
    )
  }, [student.subjects, student.academicYear, student.semester])

  // Summary chips (computed from all tasks)
  const summary = useMemo(() => {
    let graded = 0, pending = 0, missing = 0
    for (const t of tasks) {
      const { status } = computeStatus(t)
      if (status === 'GRADED') graded++
      else if (status === 'MISSING') missing++
      else pending++
    }
    return { total: tasks.length, graded, pending, missing }
  }, [tasks])

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (subjectFilter !== 'all' && t.subjectCode !== subjectFilter) return false
      if (typeFilter !== 'all' && t.type !== typeFilter) return false
      if (statusFilter !== 'all') {
        const { status } = computeStatus(t)
        if (status !== statusFilter) return false
      }
      return true
    })
  }, [tasks, subjectFilter, typeFilter, statusFilter])

  // Group by subject
  const groupedBySubject = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of filteredTasks) {
      if (!map.has(t.subjectCode)) map.set(t.subjectCode, [])
      map.get(t.subjectCode)!.push(t)
    }
    // Sort tasks within each subject by dueDate ascending
    for (const [, list] of map) {
      list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    }
    return Array.from(map.entries())
  }, [filteredTasks])

  // Submit handler
  const handleConfirmSubmit = useCallback(async () => {
    if (!submitTask) return
    setSubmitting(true)
    try {
      const res = await fetch(
        `/api/tasks/${submitTask._id}/submit?username=${encodeURIComponent(student.username)}`,
        { method: 'PATCH' }
      )
      const data = await res.json()
      if (data.ok) {
        // Update local state
        setTasks((prev) =>
          prev.map((t) =>
            t._id === submitTask._id
              ? { ...t, submitted: true, submittedAt: new Date().toISOString() }
              : t
          )
        )
        toast.success('Submitted. Awaiting grade.')
        setSubmitTask(null)
      } else {
        toast.error(data.error || 'Failed to submit task.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [submitTask, student.username])

  if (loading) {
    return <div className="text-slate-500 text-sm">Loading tasks…</div>
  }

  if (error) {
    return <div className="text-red-600 text-sm">{error}</div>
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Tasks</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Current term activities, quizzes, tests and projects
        </p>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-3">
        <SummaryChip label="TOTAL" value={summary.total} color="text-slate-900" />
        <SummaryChip label="GRADED" value={summary.graded} color="text-green-700" />
        <SummaryChip label="PENDING" value={summary.pending} color="text-amber-700" />
        <SummaryChip label="MISSING" value={summary.missing} color="text-red-700" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Subject dropdown */}
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 bg-white"
        >
          <option value="all">All Subjects</option>
          {currentSubjects.map((s) => (
            <option key={s.code} value={s.code}>{s.code} - {s.title}</option>
          ))}
        </select>
        {/* Type chips */}
        <div className="flex gap-1">
          {(['all', 'Activity', 'Quiz', 'Test', 'Project'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                typeFilter === t ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>
        {/* Status chips */}
        <div className="flex gap-1">
          {(['all', 'MISSING', 'PENDING', 'GRADED'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                statusFilter === s ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-700'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-16 text-center">
          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No tasks for this term.</p>
        </div>
      ) : (
        /* Task cards grouped by subject */
        <div className="space-y-6">
          {groupedBySubject.map(([subjectCode, subjectTasks]) => {
            const subject = currentSubjects.find((s) => s.code === subjectCode)
            return (
              <div key={subjectCode} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Subject header */}
                <div className="px-6 py-4 border-b border-slate-100">
                  <h3 className="text-base font-semibold text-slate-900">
                    <span className="font-mono text-xs font-bold text-blue-700 mr-2">{subjectCode}</span>
                    {subject?.title || subjectCode}
                  </h3>
                  {subject && (
                    <p className="text-xs text-slate-500 mt-0.5">{subject.professor}</p>
                  )}
                </div>
                {/* Task rows */}
                <div className="divide-y divide-slate-100">
                  {subjectTasks.map((task) => {
                    const { status, sub } = computeStatus(task)
                    const dueDate = new Date(task.dueDate)
                    const isMissing = status === 'MISSING'
                    const showSubmit = !task.submitted && task.score === null
                    return (
                      <div key={task._id} className="px-6 py-4 flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {/* Type badge */}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border flex-shrink-0 ${TYPE_COLORS[task.type]}`}>
                            {task.type}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900">{task.title}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-slate-500">
                                Due: {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                              {task.score !== null && (
                                <span className="text-xs font-mono font-bold text-slate-700">
                                  Score: {task.score} / {task.maxScore}
                                </span>
                              )}
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${STATUS_COLORS[status]}`}>
                                {status === 'GRADED' && <CheckCircle2 className="w-3 h-3" />}
                                {status === 'PENDING' && <Clock className="w-3 h-3" />}
                                {status === 'MISSING' && <AlertTriangle className="w-3 h-3" />}
                                {sub}
                              </span>
                            </div>
                            {task.feedback && (
                              <p className="text-xs text-slate-400 mt-1 italic">"{task.feedback}"</p>
                            )}
                          </div>
                        </div>
                        {/* Submit button */}
                        {showSubmit && (
                          <button
                            type="button"
                            onClick={() => setSubmitTask(task)}
                            className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 ${
                              isMissing
                                ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                                : 'bg-blue-700 text-white hover:bg-blue-800'
                            }`}
                          >
                            {isMissing ? 'Submit (Late)' : 'Submit'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Submit warning modal */}
      <AnimatePresence>
        {submitTask && (
          <SubmitWarningModal
            task={submitTask}
            onCancel={() => setSubmitTask(null)}
            onConfirm={handleConfirmSubmit}
            submitting={submitting}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function SummaryChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 px-4 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  )
}

function SubmitWarningModal({
  task,
  onCancel,
  onConfirm,
  submitting,
}: {
  task: Task
  onCancel: () => void
  onConfirm: () => void
  submitting: boolean
}) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-sm text-slate-900">Wait — read this first</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm text-slate-600 leading-relaxed">
            You should have already passed the ACTUAL paper for this activity to your
            adviser/professor BEFORE submitting here. Submitting in the portal without passing
            the physical paper will result in a penalty the next day.
          </p>
          <p className="text-xs text-slate-400 mt-3">
            Task: <span className="font-medium text-slate-600">{task.title}</span> ({task.subjectCode})
          </p>
        </div>
        {/* Buttons */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'I passed the paper — Submit'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Th({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <th className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 ${center ? 'text-center' : 'text-left'}`}>
      {children}
    </th>
  )
}
