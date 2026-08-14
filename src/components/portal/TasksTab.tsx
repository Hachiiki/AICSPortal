'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  AlertTriangle,
  ClipboardList,
  Calendar,
  Info,
  Lock,
  Check,
  CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Student } from '@/lib/aics/types'
import { TasksSkeleton } from './Skeleton'
import type { Task, TaskType, TaskStatus, TaskVariant } from '@/lib/aics/tasks'
import { computeStatus, TYPE_COLORS, VARIANT_COLORS, STATUS_LABELS, STATUS_ICON_COLORS, canSubmit, canViewDetails } from '@/lib/aics/tasks'

// ============================================================
//  TasksTab — the "Tasks" mini-tab inside the Academics page.
//  Extracted from AcademicsPage.tsx to reduce file size and
//  complexity (was 441 lines / CRAP 342 in a 987-LOC file).
//
//  Data (tasks + loading + error + setTasks) is lifted to the
//  parent so it persists across route switches.
// ============================================================

interface TasksTabProps {
  student: Student
  tasks: Task[]
  loading: boolean
  error: string | null
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
}

export function TasksTab({ student, tasks, loading, error, setTasks }: TasksTabProps) {
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState<'all' | TaskType>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all')
  const [submitTask, setSubmitTask] = useState<Task | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set())
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false)
  const courseRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const subjectDropdownRef = useRef<HTMLDivElement | null>(null)

  // Close subject dropdown on outside click or Esc
  useEffect(() => {
    if (!subjectDropdownOpen) return
    const onPointerDown = (e: MouseEvent) => {
      if (subjectDropdownRef.current && !subjectDropdownRef.current.contains(e.target as Node)) {
        setSubjectDropdownOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSubjectDropdownOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [subjectDropdownOpen])

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

  // Needs attention list — UNSENT tasks only (MISSING_CLOSED,
  // MISSING_OPEN, NEEDS_ATTENTION). PENDING rows are excluded.
  // Order: MISSING rows first (dueDate asc), then NEEDS_ATTENTION
  // (dueDate asc).
  const needsAttentionTasks = useMemo(() => {
    const order: Record<TaskVariant, number> = {
      MISSING_CLOSED: 0,
      MISSING_OPEN: 0,
      NEEDS_ATTENTION: 1,
      GRADED: 3,
      PENDING: 3,
    }
    return tasks
      .filter((t) => {
        const { variant } = computeStatus(t)
        return variant === 'MISSING_CLOSED' || variant === 'MISSING_OPEN' || variant === 'NEEDS_ATTENTION'
      })
      .sort((a, b) => {
        const va = computeStatus(a).variant
        const vb = computeStatus(b).variant
        if (order[va] !== order[vb]) return order[va] - order[vb]
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
  }, [submitTask, student.username, setTasks])

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

  if (loading) return <TasksSkeleton />
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
              {summary.graded} of {summary.total} {summary.total === 1 ? 'task' : 'tasks'} graded &bull; {pct}% completed
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
          {/* Subject (custom dropdown) */}
          <div className="flex flex-col gap-1" ref={subjectDropdownRef}>
            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Subject</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setSubjectDropdownOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={subjectDropdownOpen}
                className="min-w-56 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-left text-slate-700 flex items-center justify-between gap-2 hover:border-slate-300 transition-colors"
              >
                <span className="truncate">
                  {subjectFilter === 'all'
                    ? 'All Subjects'
                    : (() => {
                        const s = currentSubjects.find((x) => x.code === subjectFilter)
                        return s ? `${s.code} * ${s.title}` : 'All Subjects'
                      })()}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${subjectDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {subjectDropdownOpen && (
                <div
                  role="listbox"
                  className="absolute mt-2 w-full min-w-56 rounded-lg border border-slate-200 bg-white shadow-lg z-20 max-h-64 overflow-auto"
                >
                  <button
                    type="button"
                    onClick={() => { setSubjectFilter('all'); setSubjectDropdownOpen(false) }}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between gap-2 hover:bg-slate-50 ${subjectFilter === 'all' ? 'text-blue-700 font-medium' : 'text-slate-700'}`}
                  >
                    <span>All Subjects</span>
                    {subjectFilter === 'all' && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                  </button>
                  {currentSubjects.map((s) => {
                    const selected = subjectFilter === s.code
                    return (
                      <button
                        key={s.code}
                        type="button"
                        onClick={() => { setSubjectFilter(s.code); setSubjectDropdownOpen(false) }}
                        className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between gap-2 hover:bg-slate-50 ${selected ? 'text-blue-700 font-medium' : 'text-slate-700'}`}
                      >
                        <span className="truncate">{s.code} * {s.title}</span>
                        {selected && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
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
              const { variant, sub } = computeStatus(task)
              const subject = currentSubjects.find((s) => s.code === task.subjectCode)
              return (
                <div key={task._id}
                  onClick={() => handleAttentionRowClick(task)}
                  className="px-6 py-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors">
                  {/* Circular status icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${STATUS_ICON_COLORS[variant]}`}>
                    {variant === 'MISSING_OPEN' && <AlertTriangle className="w-4 h-4" />}
                    {variant === 'MISSING_CLOSED' && <Lock className="w-4 h-4" />}
                    {variant === 'NEEDS_ATTENTION' && <Calendar className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500">{task.subjectCode} &bull; {subject?.title || ''}</p>
                    <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border flex-shrink-0 ${VARIANT_COLORS[variant]}`}>
                    {variant === 'GRADED' && <CheckCircle2 className="w-3 h-3" />}
                    {variant === 'PENDING' && <Clock className="w-3 h-3" />}
                    {variant === 'MISSING_OPEN' && <AlertTriangle className="w-3 h-3" />}
                    {variant === 'MISSING_CLOSED' && <Lock className="w-3 h-3" />}
                    {variant === 'NEEDS_ATTENTION' && <Calendar className="w-3 h-3" />}
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
            const hasMissing = subjectTasks.some((t) => {
              const { variant } = computeStatus(t)
              return variant === 'MISSING_OPEN' || variant === 'MISSING_CLOSED'
            })
            const taskCountLabel = subjectTasks.length === 1 ? '1 task' : `${subjectTasks.length} tasks`
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
                    <span className="text-xs font-medium text-slate-500 px-2 py-0.5 rounded-md bg-slate-100">{taskCountLabel}</span>
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
                          <th className="px-4 py-2.5 pr-6 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center w-32">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjectTasks.map((task) => {
                          const { variant, sub } = computeStatus(task)
                          const dueDate = new Date(task.dueDate)
                          const showSubmit = canSubmit(task)
                          const showDetails = canViewDetails(task)
                          const isClosed = variant === 'MISSING_CLOSED'
                          const isOverdue = variant === 'MISSING_OPEN'
                          return (
                            <tr key={task._id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60">
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${TYPE_COLORS[task.type]}`}>{task.type}</span>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-sm font-medium text-slate-900">{task.title}</p>
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-500">
                                {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border w-fit ${VARIANT_COLORS[variant]}`}>
                                  {variant === 'GRADED' && <CheckCircle2 className="w-3 h-3" />}
                                  {variant === 'PENDING' && <Clock className="w-3 h-3" />}
                                  {variant === 'MISSING_OPEN' && <AlertTriangle className="w-3 h-3" />}
                                  {variant === 'MISSING_CLOSED' && <Lock className="w-3 h-3" />}
                                  {variant === 'NEEDS_ATTENTION' && <Calendar className="w-3 h-3" />}
                                  {sub}
                                </span>
                              </td>
                              <td className="px-4 py-3 pr-6 w-32">
                                <div className="flex justify-center">
                                  {showSubmit ? (
                                    <button type="button" onClick={() => setSubmitTask(task)}
                                      className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium ${isOverdue ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100' : 'bg-blue-700 text-white hover:bg-blue-800'}`}>
                                      {isOverdue ? 'Submit (Late)' : 'Submit'}
                                    </button>
                                  ) : isClosed ? (
                                    <span className="text-xs font-medium text-slate-400">Closed</span>
                                  ) : showDetails ? (
                                    <button type="button" onClick={() => setDetailTask(task)}
                                      aria-label="View details"
                                      className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                                      <Info className="w-4 h-4" />
                                    </button>
                                  ) : null}
                                </div>
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

// ============================================================
//  Sub-components
// ============================================================

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
