'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Download,
  CheckCircle2,
  Clock,
  ChevronRight,
} from 'lucide-react'
import type { Student, Subject } from '@/lib/aics/types'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { RemarksBadge } from './RemarksBadge'
import { GradesHeader, GradesRow, GradesFooter } from './GradesRow'
import { TasksTab } from './TasksTab'
import type { Task } from '@/lib/aics/tasks'

interface AcademicsPageProps {
  student: Student
  onBack: () => void
  onProfile: () => void
  onEvents: () => void
  onLogout: () => void
  // Tasks data is lifted to the parent (StudentDataWrapper) so it
  // persists across route switches. Previously AcademicsPage fetched
  // tasks itself, which worked for tab switches within Academics but
  // still re-fetched when navigating away and back. Now the parent
  // fetches once and passes the data down.
  tasks: Task[]
  tasksLoading: boolean
  tasksError: string | null
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
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

export function AcademicsPage({ student, onBack, onProfile, onEvents, onLogout, tasks, tasksLoading, tasksError, setTasks }: AcademicsPageProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'grades' | 'subjects' | 'tasks'>('grades')

  // Tasks state is now lifted to the parent (StudentDataWrapper) so
  // it persists across route switches. See the props comment above.

  const terms = useMemo(() => groupByTerm(student.subjects), [student.subjects])
  const completedSubjects = useMemo(() => student.subjects.filter((s) => s.status !== 'in-progress' && parseFloat(s.finalGrade) > 0), [student.subjects])
  const cumulativeGPA = useMemo(() => computeGPA(completedSubjects), [completedSubjects])
  const totalUnits = useMemo(() => student.subjects.reduce((sum, s) => sum + s.units, 0), [student.subjects])

  const handleNavigate = (v: any) => {
    if (v === 'dashboard') onBack()
    else if (v === 'events') onEvents()
    else if (v === 'profile') onProfile()
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
                        <GradesHeader />
                      </thead>
                      <tbody>
                        {term.subjects.map((s) => (
                          <GradesRow key={s.code + term.key} subject={s} rowKey={s.code + term.key} />
                        ))}
                      </tbody>
                      <tfoot>
                        <GradesFooter totalUnits={term.totalUnits} />
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
                            <RemarksBadge remarks={s.remarks} />
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
            <TasksTab
              student={student}
              tasks={tasks}
              loading={tasksLoading}
              error={tasksError}
              setTasks={setTasks}
            />
          )}
        </main>
      </div>
    </div>
  )
}

// ============================================================
//  Tasks Tab is now in its own file: ./TasksTab
//  (Extracted to reduce this file's size and complexity.)
// ============================================================


function Th({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <th className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 ${center ? 'text-center' : 'text-left'}`}>
      {children}
    </th>
  )
}
