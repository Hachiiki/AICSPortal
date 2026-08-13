'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download,
  CheckCircle2,
  Clock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  AlertTriangle,
  ClipboardList,
  Calendar,
  MoreHorizontal,
  CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Student, Subject } from '@/lib/aics/types'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import type { Task, TaskType, TaskStatus } from '@/lib/aics/tasks'
import { computeStatus, TYPE_COLORS, STATUS_COLORS, STATUS_LABELS, STATUS_ICON_COLORS } from '@/lib/aics/tasks'

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
//  Tasks Tab — redesigned with overview, needs attention, accordions
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
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set())
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const courseRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    let cancelled = false
    async function fetchTasks() {
      try {
        const res = await fetch(`/api/tasks?username=${encodeURIComponent(student.username)}`)
        const data = await res.json()
        if (cancelled) return
        if (data.ok) setTasks(data.tasks)
        else setError(data.error || 'Failed to load tasks')
      } catch { if (!cancelled) setError('Network error') }
      finally { if (!cancelled) setLoading(false) }
    }
    fetchTasks()
    return () => { cancelled = true }
  }, [student.username])

  const currentSubjects = useMemo(() =>
    student.subjects.filter((s) => s.academicYear === student.academicYear && s.semester === student.semester),
  [student.subjects, student.academicYear, student.semester])

  // Compute summary with 4-status model
  const summary = useMemo(() => {
    let graded = 0, pending = 0, missing = 0, needs = 0
    for (const t of tasks) {
      const { status } = computeStatus(t)
      if (status === 'GRADED') graded++
      else if (status === 'PENDING') pending++
      else if (status === 'MISSING') missing++
      else needs++
    }
    return { total: tasks.length, graded, pending, missing, needs }
  }, [tasks])

  const pct = summary.total > 0 ? Math.round((summary.graded / summary.total) * 100) : 0

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

  // Needs attention list (all non-graded, ordered MISSING → PENDING → NEEDS_ATTENTION, by dueDate asc)
  const needsAttentionTasks = useMemo(() => {
    const order: Record<TaskStatus, number> = { MISSING: 0, PENDING: 1, NEEDS_ATTENTION: 2, GRADED: 3 }
    return tasks
      .filter((t) => computeStatus(t).status !== 'GRADED')
      .sort((a, b) => {
        const sa = computeStatus(a).status
        const sb = computeStatus(b).status
        if (order[sa] !== order[sb]) return order[sa] - order[sb]
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      })
  }, [tasks])

  // Group filtered tasks by subject
  const groupedBySubject = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of filteredTasks) {
      if (!map.has(t.subjectCode)) map.set(t.subjectCode, [])
      map.get(t.subjectCode)!.push(t)
    }
    for (const [, list] of map) list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    return Array.from(map.entries())
  }, [filteredTasks])

  // Submit handler
  const handleConfirmSubmit = useCallback(async () => {
    if (!submitTask) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/tasks/${submitTask._id}/submit?username=${encodeURIComponent(student.username)}`, { method: 'PATCH' })
      const data = await res.json()
      if (data.ok) {
        setTasks((prev) => prev.map((t) => t._id === submitTask._id ? { ...t, submitted: true, submittedAt: new Date().toISOString() } : t))
        toast.success('Submitted. Awaiting grade.')
        setSubmitTask(null)
      } else { toast.error(data.error || 'Failed to submit task.') }
    } catch { toast.error('Network error. Please try again.') }
    finally { setSubmitting(false) }
  }, [submitTask, student.username])

  // Toggle course expansion
  const toggleCourse = useCallback((code: string) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }, [])

  const expandAll = useCallback(() => setExpandedCourses(new Set(currentSubjects.map((s) => s.code))), [currentSubjects])
  const collapseAll = useCallback(() => setExpandedCourses(new Set()), [])

  // Row click from Needs Attention → expand + scroll to course
  const handleAttentionRowClick = useCallback((task: Task) => {
    setExpandedCourses((prev) => new Set(prev).add(task.subjectCode))
    setTimeout(() => {
      const el = courseRefs.current[task.subjectCode]
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }, [])

  if (loading) return <div className="text-slate-500 text-sm">Loading tasks…</div>
  if (error) return <div className="text-red-600 text-sm">{error}</div>

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Heading */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Tasks</h2>
        <p className="text-xs text-slate-500 mt-0.5">Current term activities, quizzes, tests and projects</p>
      </div>

      {/* TASK OVERVIEW CARD */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">Task Overview</h3>
        </div>
        <div className="px-6 py-5">
          <div className="grid grid-cols-5 divide-x divide-slate-100">
            <OverviewStat label="Total" value={summary.total} color="text-blue-700" />
            <OverviewStat label="Graded" value={summary.graded} color="text-green-700" />
            <OverviewStat label="Pending" value={summary.pending} color="text-amber-700" />
            <OverviewStat label="Needs attention" value={summary.needs} color="text-blue-700" />
            <OverviewStat label="Missing" value={summary.missing} color="text-red-700" />
          </div>
          <div className="mt-4">
            <p className="text-xs text-slate-500 mb-1.5">
              {summary.graded} of {summary.total} tasks graded &bull; {pct}% completed
            </p>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* FILTER CARD */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4">
        <div className="flex flex-wrap gap-6 items-center">
          {/* Subject */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Subject</label>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 bg-white"
            >
              <option value="all">All Subjects</option>
              {currentSubjects.map((s) => (<option key={s.code} value={s.code}>{s.code}</option>))}
            </select>
          </div>
          <div className="w-px h-10 bg-slate-100" />
          {/* Type */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Type</label>
            <div className="flex gap-1">
              {(['all', 'Activity', 'Quiz', 'Test', 'Project'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${typeFilter === t ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-700'}`}>
                  {t === 'all' ? 'All' : t}
                </button>
              ))}
            </div>
          </div>
          <div className="w-px h-10 bg-slate-100" />
          {/* Status */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Status</label>
            <div className="flex gap-1">
              {(['all', 'MISSING', 'PENDING', 'NEEDS_ATTENTION', 'GRADED'] as const).map((s) => (
                <button key={s} type="button" onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${statusFilter === s ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-700'}`}>
                  {s === 'all' ? 'All' : s === 'NEEDS_ATTENTION' ? 'Needs attention' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* NEEDS ATTENTION CARD */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">Needs Attention</h3>
          <p className="text-xs text-slate-500 mt-0.5">Tasks that require your action</p>
        </div>
        {needsAttentionTasks.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-green-600">All caught up.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {needsAttentionTasks.map((task) => {
              const { status, sub } = computeStatus(task)
              const subject = currentSubjects.find((s) => s.code === task.subjectCode)
              return (
                <div key={task._id}
                  onClick={() => handleAttentionRowClick(task)}
                  className="px-6 py-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors">
                  {/* Circular status icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${STATUS_ICON_COLORS[status]}`}>
                    {status === 'MISSING' && <AlertTriangle className="w-4 h-4" />}
                    {status === 'PENDING' && <Clock className="w-4 h-4" />}
                    {status === 'NEEDS_ATTENTION' && <Calendar className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500">{task.subjectCode} &bull; {subject?.title || ''}</p>
                    <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border flex-shrink-0 ${STATUS_COLORS[status]}`}>
                    {status === 'GRADED' && <CheckCircle2 className="w-3 h-3" />}
                    {status === 'PENDING' && <Clock className="w-3 h-3" />}
                    {status === 'MISSING' && <AlertTriangle className="w-3 h-3" />}
                    {status === 'NEEDS_ATTENTION' && <Calendar className="w-3 h-3" />}
                    {sub}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* COURSES SECTION */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">Courses</h3>
        <button type="button" onClick={() => expandedCourses.size === currentSubjects.length ? collapseAll() : expandAll()}
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">
          {expandedCourses.size === currentSubjects.length ? 'Collapse all' : 'Expand all'}
          {expandedCourses.size === currentSubjects.length ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* COURSE ACCORDION CARDS */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-16 text-center">
          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No tasks for this term.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedBySubject.map(([subjectCode, subjectTasks]) => {
            const subject = currentSubjects.find((s) => s.code === subjectCode)
            const isExpanded = expandedCourses.has(subjectCode)
            const hasMissing = subjectTasks.some((t) => computeStatus(t).status === 'MISSING')
            return (
              <div key={subjectCode} ref={(el) => { courseRefs.current[subjectCode] = el }}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Accordion header */}
                <div onClick={() => toggleCourse(subjectCode)}
                  className="px-6 py-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-700">{subjectCode}</span>
                      <h3 className="text-sm font-semibold text-slate-900 truncate">{subject?.title || subjectCode}</h3>
                    </div>
                    {subject && <p className="text-xs text-slate-500 mt-0.5">{subject.professor}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-medium text-slate-500 px-2 py-0.5 rounded-md bg-slate-100">{subjectTasks.length} tasks</span>
                    {hasMissing && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                        <AlertTriangle className="w-3 h-3" /> Needs attention
                      </span>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>
                {/* Expanded table */}
                {isExpanded && (
                  <div className="border-t border-slate-100 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-left">Type</th>
                          <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-left">Task</th>
                          <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-left">Due Date</th>
                          <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-left">Status / Score</th>
                          <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjectTasks.map((task) => {
                          const { status, sub } = computeStatus(task)
                          const dueDate = new Date(task.dueDate)
                          const isMissing = status === 'MISSING'
                          const showSubmit = !task.submitted && task.score === null
                          return (
                            <tr key={task._id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60">
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${TYPE_COLORS[task.type]}`}>{task.type}</span>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-sm font-medium text-slate-900">{task.title}</p>
                                {task.feedback && <p className="text-xs text-slate-400 mt-0.5 italic">"{task.feedback}"</p>}
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-500">
                                {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col gap-0.5">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border w-fit ${STATUS_COLORS[status]}`}>
                                    {status === 'GRADED' && <CheckCircle2 className="w-3 h-3" />}
                                    {status === 'PENDING' && <Clock className="w-3 h-3" />}
                                    {status === 'MISSING' && <AlertTriangle className="w-3 h-3" />}
                                    {status === 'NEEDS_ATTENTION' && <Calendar className="w-3 h-3" />}
                                    {sub}
                                  </span>
                                  <span className="text-[10px] text-slate-400">{STATUS_LABELS[status]}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {showSubmit ? (
                                  <button type="button" onClick={() => setSubmitTask(task)}
                                    className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium ${isMissing ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100' : 'bg-blue-700 text-white hover:bg-blue-800'}`}>
                                    {isMissing ? 'Submit (Late)' : 'Submit'}
                                  </button>
                                ) : (
                                  <button type="button" onClick={() => setDetailTask(task)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Submit warning modal */}
      <AnimatePresence>
        {submitTask && (
          <SubmitWarningModal task={submitTask} onCancel={() => setSubmitTask(null)} onConfirm={handleConfirmSubmit} submitting={submitting} />
        )}
      </AnimatePresence>

      {/* Task details modal */}
      <AnimatePresence>
        {detailTask && (
          <TaskDetailsModal task={detailTask} subjectName={currentSubjects.find((s) => s.code === detailTask.subjectCode)?.title || ''} onClose={() => setDetailTask(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function OverviewStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center px-2">
      <p className="text-2xl font-bold {color}" style={{ color: color.replace('text-', '').includes('green') ? '#15803D' : color.includes('amber') ? '#B45309' : color.includes('red') ? '#DC2626' : '#2563EB' }}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mt-0.5">{label}</p>
    </div>
  )
}

function SubmitWarningModal({ task, onCancel, onConfirm, submitting }: { task: Task; onCancel: () => void; onConfirm: () => void; submitting: boolean }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50" onClick={onCancel}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-sm text-slate-900">Wait — read this first</h3>
          </div>
          <button type="button" onClick={onCancel} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-slate-600 leading-relaxed">
            You should have already passed the ACTUAL paper for this activity to your adviser/professor BEFORE submitting here. Submitting in the portal without passing the physical paper will result in a penalty the next day.
          </p>
          <p className="text-xs text-slate-400 mt-3">Task: <span className="font-medium text-slate-600">{task.title}</span> ({task.subjectCode})</p>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={submitting} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60">
            {submitting ? 'Submitting…' : 'I passed the paper — Submit'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function TaskDetailsModal({ task, subjectName, onClose }: { task: Task; subjectName: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const { status, sub } = computeStatus(task)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
          <h3 className="font-bold text-sm text-slate-900">Task Details</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-3">
          <DetailRow label="Title" value={task.title} />
          <DetailRow label="Type" value={task.type} />
          <DetailRow label="Subject" value={`${task.subjectCode} — ${subjectName}`} />
          <DetailRow label="Due Date" value={new Date(task.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />
          {task.submittedAt && <DetailRow label="Submitted" value={new Date(task.submittedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />}
          <DetailRow label="Status" value={STATUS_LABELS[status]} />
          {task.score !== null && <DetailRow label="Score" value={`${task.score} / ${task.maxScore}`} />}
          {task.feedback && <DetailRow label="Feedback" value={task.feedback} />}
          {task.description && <DetailRow label="Description" value={task.description} />}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50">Close</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">{label}</p>
      <p className="text-sm font-medium text-slate-700 mt-0.5 break-words">{value}</p>
    </div>
  )
}

function Th({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <th className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 ${center ? 'text-center' : 'text-left'}`}>
      {children}
    </th>
  )
}
