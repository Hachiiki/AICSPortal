'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  X,
  AlertTriangle,
  ClipboardList,
  Calendar,
  Info,
  Lock,
  CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Student } from '@/lib/aics/types'
import { SelectMenu } from '../ui/select-menu'
import { TasksSkeleton } from './Skeleton'
import type { Task, TaskType, TaskStatus, TaskVariant } from '@/lib/aics/tasks'
import { computeStatus, TYPE_COLORS, VARIANT_COLORS, STATUS_LABELS, STATUS_ICON_COLORS, canSubmit, canViewDetails } from '@/lib/aics/tasks'
import { DialogPanel } from './DialogPanel'
import { EmptyState } from './EmptyState'
import { StudentTasksGuide } from '@/components/onboarding/StudentOnboarding'

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
  onRetry?: () => void
  // Bell deep-link (refs #37-review): expand the course, scroll the
  // row into view, flash it. Primitives drive the effect so a fresh
  // parent object identity never refires it.
  focusTask?: { subjectCode: string; taskId: string } | null
}

export function TasksTab({ student, tasks, loading, error, setTasks, focusTask, onRetry }: TasksTabProps) {
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState<'all' | TaskType>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all')
  const [submitTask, setSubmitTask] = useState<Task | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set())
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const courseRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const rowRefs = useRef<Record<string, HTMLElement | null>>({})
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [attentionExpanded, setAttentionExpanded] = useState(false)

  // Bell deep-link: expand the course, scroll the row into view, flash it once.
  // Waits for the task list to finish loading — rows do not exist before that.
  const focusTaskId = focusTask?.taskId || null
  const focusSubject = focusTask?.subjectCode || null
  useEffect(() => {
    if (!focusTaskId || loading) return
    if (focusSubject) {
      setExpandedCourses((prev) => {
        if (prev.has(focusSubject)) return prev
        return new Set(prev).add(focusSubject)
      })
    }
    const t = setTimeout(() => {
      // A later search or edit takes priority over this delayed destination focus.
      const active = document.activeElement
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLElement && active.isContentEditable) return
      const el = Array.from(document.querySelectorAll<HTMLElement>(`[data-task-id="${CSS.escape(focusTaskId)}"]`)).find(row => row.getClientRects().length > 0)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.focus({ preventScroll: true })
      setHighlightId(focusTaskId)
      setTimeout(() => setHighlightId((cur) => (cur === focusTaskId ? null : cur)), 2600)
    }, 250)
    return () => clearTimeout(t)
  }, [focusTaskId, focusSubject, loading, tasks.length])

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
  // Keep open submissions above closed work, then sort by due date.
  const needsAttentionTasks = useMemo(() => {
    const order: Record<TaskVariant, number> = {
      MISSING_CLOSED: 2,
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
        toast.success('Submitted. Awaiting grade.', { style: { pointerEvents: 'none' } })
        setSubmitTask(null)
      } else { toast.error(data.error || 'Failed to submit task.', { style: { pointerEvents: 'none' } }) }
    } catch { toast.error('Network error. Please try again.', { style: { pointerEvents: 'none' } }) }
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
    setSubjectFilter('all')
    setTypeFilter('all')
    setStatusFilter('all')
    setExpandedCourses((prev) => new Set(prev).add(task.subjectCode))
    setTimeout(() => {
      const el = courseRefs.current[task.subjectCode]
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }, [])

  if (loading) return <TasksSkeleton />
  if (error) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><p>We couldn't load your tasks. {error}</p>{onRetry && <button type="button" onClick={onRetry} className="mt-3 min-h-11 rounded-lg border border-red-300 px-4 font-semibold hover:bg-red-100">Retry loading tasks</button>}</div>

  const hasFilters = subjectFilter !== 'all' || typeFilter !== 'all' || statusFilter !== 'all'
  const clearFilters = () => { setSubjectFilter('all'); setTypeFilter('all'); setStatusFilter('all') }
  const closedCount = needsAttentionTasks.filter(task => computeStatus(task).variant === 'MISSING_CLOSED').length

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5 sm:gap-6">
      {/* Heading */}
      <div className="hidden sm:block">
        <h2 className="text-lg font-semibold text-slate-900">Tasks</h2>
        <p className="text-xs text-slate-500 mt-0.5">Current term activities, quizzes, tests and projects</p>
      </div>

      {/* NEEDS ATTENTION CARD */}
      <div data-tour="tasks-attention" className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-6 sm:py-4">
          <h3 className="text-base font-semibold text-ink">Needs attention</h3>
          {needsAttentionTasks.length > 0 && <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold tabular-nums text-ink">{needsAttentionTasks.length - closedCount} open{closedCount > 0 && ` · ${closedCount} closed`}</span>}
        </div>
        {needsAttentionTasks.length === 0 ? (
          <EmptyState icon={CheckCircle} message="All caught up." hint="Nothing needs your action right now." />
        ) : (
          <div className="divide-y divide-slate-100">
            {needsAttentionTasks.map((task, attentionIndex) => {
              const { variant, sub } = computeStatus(task)
              const subject = currentSubjects.find((s) => s.code === task.subjectCode)
              return (
                <button key={task._id}
                  type="button"
                  onClick={() => handleAttentionRowClick(task)}
                  className={`w-full px-4 py-2 text-left sm:px-6 sm:py-3 ${attentionIndex >= 3 && !attentionExpanded ? 'hidden' : 'grid'} grid-cols-[auto_minmax(0,1fr)_auto] sm:flex sm:items-center gap-x-3 gap-y-1 hover:bg-slate-50 transition-colors focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-link`}>
                  {/* Circular status icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${STATUS_ICON_COLORS[variant]}`} aria-hidden="true">
                    {variant === 'MISSING_OPEN' && <AlertTriangle className="w-4 h-4" />}
                    {variant === 'MISSING_CLOSED' && <Lock className="w-4 h-4" />}
                    {variant === 'NEEDS_ATTENTION' && <Calendar className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-fg [overflow-wrap:anywhere]">{task.subjectCode}<span className="hidden sm:inline">{subject ? ` · ${subject.title}` : ''}</span></p>
                    <p className="text-sm font-semibold text-ink [overflow-wrap:anywhere]">{task.title}</p>
                  </div>
                  <span className={`col-start-2 row-start-2 justify-self-start rounded-md border px-2 py-0.5 text-xs font-medium ${VARIANT_COLORS[variant]}`}>
                    {variant === 'MISSING_CLOSED' ? 'Missing · Closed' : sub}
                  </span>
                  <ChevronRight className="col-start-3 row-span-2 row-start-1 size-4 shrink-0 self-center text-muted-fg sm:hidden" aria-hidden="true" />
                </button>
              )
            })}
            {needsAttentionTasks.length > 3 && <button type="button" className="sm:hidden min-h-11 w-full px-4 py-3 text-sm font-semibold text-link hover:bg-slate-50" onClick={() => setAttentionExpanded(!attentionExpanded)}>{attentionExpanded ? 'Show fewer tasks' : `View all ${needsAttentionTasks.length} tasks`}</button>}
          </div>
        )}
      </div>

            {/* FILTER CARD */}
      <div data-tour="tasks-filters" className="bg-surface rounded-xl border border-slate-200 shadow-sm px-4 sm:px-6 py-4">
        <button type="button" aria-expanded={filtersExpanded} aria-controls="student-task-filter-controls" onClick={() => setFiltersExpanded(!filtersExpanded)} className="sm:hidden flex min-h-11 w-full items-center justify-between text-sm font-semibold text-slate-900">Filter tasks<ChevronDown className={`size-4 transition-transform ${filtersExpanded ? 'rotate-180' : ''}`} aria-hidden /></button>
        <div id="student-task-filter-controls" className={`${filtersExpanded ? 'flex' : 'hidden'} sm:flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-6 sm:items-center`}>
          {/* Subject (custom dropdown — shared SelectMenu) */}
          <SelectMenu
            label="Subject"
            value={subjectFilter}
            onChange={setSubjectFilter}
            placeholder="All Subjects"
            options={[
              { value: 'all', label: 'All Subjects' },
              ...currentSubjects.map((s) => ({ value: s.code, label: `${s.code} * ${s.title}` })),
            ]}
          />
          <div className="hidden sm:block w-px h-10 bg-slate-100" aria-hidden="true" />
          {/* Type */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Type</span>
            <div role="group" aria-label="Filter by task type" className="flex flex-wrap gap-1.5">
              {(['all', 'Activity', 'Quiz', 'Test', 'Project'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTypeFilter(t)} aria-pressed={typeFilter === t}
                  className={`min-h-11 min-w-11 sm:min-h-8 px-3 py-1 rounded-lg text-xs font-medium transition-all ${typeFilter === t ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-700'}`}>
                  {t === 'all' ? 'All' : t}
                </button>
              ))}
            </div>
          </div>
          <div className="hidden sm:block w-px h-10 bg-slate-100" aria-hidden="true" />
          {/* Status */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Status</span>
            <div role="group" aria-label="Filter by task status" className="flex flex-wrap gap-1.5">
              {(['all', 'MISSING', 'PENDING', 'NEEDS_ATTENTION', 'GRADED'] as const).map((s) => (
                <button key={s} type="button" onClick={() => setStatusFilter(s)} aria-pressed={statusFilter === s}
                  className={`min-h-11 min-w-11 sm:min-h-8 px-3 py-1 rounded-lg text-xs font-medium transition-all ${statusFilter === s ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-700'}`}>
                  {s === 'all' ? 'All' : s === 'NEEDS_ATTENTION' ? 'Needs attention' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
          <p role="status" className="text-xs text-slate-600">{filteredTasks.length} of {tasks.length} tasks match</p>
          {hasFilters && <button type="button" onClick={clearFilters} className="min-h-11 px-2 text-sm font-semibold text-link hover:underline">Clear filters</button>}
        </div>
      </div>

            {/* COURSES SECTION */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">Courses</h3>
        <button type="button" onClick={() => expandedCourses.size === currentSubjects.length ? collapseAll() : expandAll()}
          className="inline-flex min-h-11 px-2 items-center gap-1 text-xs font-medium text-link hover:text-link-strong">
          {expandedCourses.size === currentSubjects.length ? 'Collapse all' : 'Expand all'}
          {expandedCourses.size === currentSubjects.length ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

            {/* COURSE ACCORDION CARDS */}
      <div data-tour="tasks-courses">
      {filteredTasks.length === 0 ? (
        <div className="bg-surface rounded-xl border border-slate-200 shadow-sm">
          <EmptyState icon={ClipboardList} message={hasFilters ? 'No matching tasks.' : 'No tasks for this term.'} hint={hasFilters ? 'Try another subject, type or status.' : 'When a teacher posts a task, it shows up here.'} />
          {hasFilters && <div className="pb-4 text-center"><button type="button" onClick={clearFilters} className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-link">Show all tasks</button></div>}
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
                className="bg-surface rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Accordion header */}
                <button type="button" aria-expanded={isExpanded} onClick={() => toggleCourse(subjectCode)}
                  className="flex w-full flex-wrap items-center justify-between gap-[12px] px-[16px] py-[16px] text-left transition-colors hover:bg-slate-50 sm:flex-nowrap sm:px-6 sm:py-4">
                  <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="font-mono text-xs font-bold text-link-strong">{subjectCode}</span>
                      <span className="text-sm font-semibold text-slate-900 break-words">{subject?.title || subjectCode}</span>
                    </div>
                    {subject && <p className="text-xs text-slate-500 mt-0.5">{subject.professor}</p>}
                  </div>
                  <div className="flex min-w-0 max-w-full flex-wrap items-center gap-[8px] sm:shrink-0">
                    <span className="text-xs font-medium text-slate-500 px-2 py-0.5 rounded-md bg-slate-100">{taskCountLabel}</span>
                    {hasMissing && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                        <AlertTriangle className="w-3 h-3" aria-hidden /> Needs attention
                      </span>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" aria-hidden /> : <ChevronDown className="w-4 h-4 text-slate-500" aria-hidden />}
                  </div>
                </button>
                {/* Expanded task list — cards on mobile, scrollable table from md up */}
                {isExpanded && (
                  <>
                  <ul className="md:hidden divide-y divide-slate-100 border-t border-slate-100">
                    {subjectTasks.map((task) => {
                      const { variant, sub } = computeStatus(task)
                      const dueDate = new Date(task.dueDate)
                      const showSubmit = canSubmit(task)
                      const showDetails = canViewDetails(task)
                      const isClosed = variant === 'MISSING_CLOSED'
                      const isOverdue = variant === 'MISSING_OPEN'
                      return (
                        <li key={task._id} data-task-id={task._id} tabIndex={-1} ref={(el) => { rowRefs.current[task._id] = el }} className={`px-4 py-3.5 ${highlightId === task._id ? 'bg-blue-100/70' : ''}`}>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border flex-shrink-0 ${TYPE_COLORS[task.type]}`}>{task.type}</span>
                            <p className="text-sm font-medium text-slate-900 break-words">{task.title}</p>
                          </div>
                          <div className="mt-2.5 flex items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 min-w-0">
                              <span className="text-xs text-slate-500 whitespace-nowrap">Due {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border w-fit ${VARIANT_COLORS[variant]}`}>
                                {variant === 'GRADED' && <CheckCircle2 className="w-3 h-3" />}
                                {variant === 'PENDING' && <Clock className="w-3 h-3" />}
                                {variant === 'MISSING_OPEN' && <AlertTriangle className="w-3 h-3" />}
                                {variant === 'MISSING_CLOSED' && <Lock className="w-3 h-3" />}
                                {variant === 'NEEDS_ATTENTION' && <Calendar className="w-3 h-3" />}
                                {variant === 'NEEDS_ATTENTION' ? 'Not submitted' : sub}
                              </span>
                            </div>
                            <div className="flex-shrink-0">
                              {showSubmit ? (
                                <button type="button" onClick={() => setSubmitTask(task)}
                                  className={`inline-flex items-center min-h-11 sm:min-h-0 px-3 py-1.5 rounded-lg text-xs font-medium ${isOverdue ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100' : 'bg-blue-700 text-white hover:bg-blue-800'}`}>
                                  {isOverdue ? 'Submit (Late)' : 'Submit'}
                                </button>
                              ) : isClosed ? (
                                <span className="text-xs font-medium text-slate-500">Closed</span>
                              ) : showDetails ? (
                                <button type="button" onClick={() => setDetailTask(task)}
                                  aria-label="View details"
                                  className="inline-flex items-center justify-center size-11 sm:size-8 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                                  <Info className="w-4 h-4" />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                  <div className="hidden md:block border-t border-slate-100 overflow-x-auto">
                    <table className="w-full text-sm min-w-[560px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th scope="col" className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-left">Type</th>
                          <th scope="col" className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-left">Task</th>
                          <th scope="col" className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-left">Due Date</th>
                          <th scope="col" className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-left">Status / Score</th>
                          <th scope="col" className="px-4 py-2.5 pr-6 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center w-32">Action</th>
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
                            <tr key={task._id} data-task-id={task._id} tabIndex={-1} ref={(el) => { rowRefs.current[task._id] = el }} className={`border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 ${highlightId === task._id ? 'bg-blue-100/70' : ''}`}>
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
                                  {variant === 'NEEDS_ATTENTION' ? 'Not submitted' : sub}
                                </span>
                              </td>
                              <td className="px-4 py-3 pr-6 w-32">
                                <div className="flex justify-center">
                                  {showSubmit ? (
                                    <button type="button" onClick={() => setSubmitTask(task)}
                                      className={`inline-flex items-center min-h-11 sm:min-h-0 px-3 py-1.5 rounded-lg text-xs font-medium ${isOverdue ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100' : 'bg-blue-700 text-white hover:bg-blue-800'}`}>
                                      {isOverdue ? 'Submit (Late)' : 'Submit'}
                                    </button>
                                  ) : isClosed ? (
                                    <span className="text-xs font-medium text-slate-500">Closed</span>
                                  ) : showDetails ? (
                                    <button type="button" onClick={() => setDetailTask(task)}
                                      aria-label="View details"
                                      className="inline-flex items-center justify-center size-11 sm:size-8 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors">
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
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      </div>
            {/* TASK OVERVIEW CARD */}
      <div data-tour="tasks-overview" className="bg-surface rounded-xl border border-slate-200 shadow-sm">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">Task Overview</h3>
        </div>
        <div className="px-4 sm:px-6 py-5">
          <div className="grid grid-cols-2 min-[400px]:grid-cols-3 sm:grid-cols-5 gap-y-4 sm:divide-x divide-slate-100">
            {/* Tone classes keep the exact pre-Stage-2B light hexes (v4
                oklch palette shades render differently); the dark:
                variants re-theme via the tokens/bridge. */}
            <OverviewStat label="Total" value={summary.total} tone="text-[#2563EB] dark:text-link" />
            <OverviewStat label="Graded" value={summary.graded} tone="text-[#15803D] dark:text-green-700" />
            <OverviewStat label="Pending" value={summary.pending} tone="text-[#B45309] dark:text-amber-700" />
            <OverviewStat label="Needs attention" value={summary.needs} tone="text-[#2563EB] dark:text-link" />
            <OverviewStat label="Missing" value={summary.missing} tone="text-[#DC2626] dark:text-red-600" />
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

                  <div className="empty:hidden"><StudentTasksGuide /></div>
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

function OverviewStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="text-left sm:text-center px-2">
      <p className={`text-2xl font-bold ${tone}`}>{value}</p>
      <p className="text-xs text-slate-600 font-medium mt-0.5">{label}</p>
    </div>
  )
}

function SubmitWarningModal({ task, onCancel, onConfirm, submitting }: { task: Task; onCancel: () => void; onConfirm: () => void; submitting: boolean }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/50" onClick={onCancel}>
      <DialogPanel
        onClose={onCancel}
        aria-label="Confirm task submission"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-surface rounded-2xl shadow-2xl max-w-md w-full max-h-[calc(100dvh-32px)] overflow-y-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" aria-hidden />
            <h3 className="font-bold text-sm text-slate-900">Read this first</h3>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close submission warning" className="size-11 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="w-4 h-4" aria-hidden /></button>
        </div>
        <div className="px-4 sm:px-6 py-5">
          <p className="text-sm text-slate-600 leading-relaxed">
            You should have already passed the ACTUAL paper for this activity to your adviser/professor BEFORE submitting here. Submitting in the portal without passing the physical paper will result in a penalty the next day.
          </p>
          <p className="text-xs text-slate-500 mt-3">Task: <span className="font-medium text-slate-600">{task.title}</span> ({task.subjectCode})</p>
        </div>
        <div className="px-4 sm:px-6 py-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-3 justify-end">
          <button type="button" onClick={onCancel} className="min-h-11 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={submitting} className="min-h-11 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60">
            {submitting ? 'Submitting…' : 'I passed the paper · Submit'}
          </button>
        </div>
      </DialogPanel>
    </motion.div>
  )
}

function TaskDetailsModal({ task, subjectName, onClose }: { task: Task; subjectName: string; onClose: () => void }) {
  const { status, sub } = computeStatus(task)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/50" onClick={onClose}>
      <DialogPanel
        onClose={onClose}
        aria-label="Task details"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-surface rounded-2xl shadow-2xl max-w-md w-full max-h-[calc(100dvh-32px)] overflow-y-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between border-b border-slate-100">
          <h3 className="font-bold text-sm text-slate-900">Task Details</h3>
          <button type="button" onClick={onClose} aria-label="Close task details" className="size-11 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="w-4 h-4" aria-hidden /></button>
        </div>
        <div className="px-4 sm:px-6 py-5 space-y-3">
          <DetailRow label="Title" value={task.title} />
          <DetailRow label="Type" value={task.type} />
          <DetailRow label="Subject" value={`${task.subjectCode} · ${subjectName}`} />
          <DetailRow label="Due Date" value={new Date(task.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />
          {task.submittedAt && <DetailRow label="Submitted" value={new Date(task.submittedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />}
          <DetailRow label="Status" value={STATUS_LABELS[status]} />
          {task.score !== null && <DetailRow label="Score" value={`${task.score} / ${task.maxScore}`} />}
          {task.feedback && <DetailRow label="Feedback" value={task.feedback} />}
          {task.description && <DetailRow label="Description" value={task.description} />}
        </div>
        <div className="px-4 sm:px-6 py-4 border-t border-slate-100 flex justify-end">
          <button type="button" onClick={onClose} className="min-h-11 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50">Close</button>
        </div>
      </DialogPanel>
    </motion.div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">{label}</p>
      <p className="text-sm font-medium text-slate-700 mt-0.5 break-words">{value}</p>
    </div>
  )
}
