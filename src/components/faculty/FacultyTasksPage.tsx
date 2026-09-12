'use client'

import { useState, useEffect, useCallback } from 'react'
import { ClipboardList, Send, Loader2, Lock, LockOpen, Users as UsersIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { Student, View } from '@/lib/aics/types'
import type { PortalEvent } from '@/lib/aics/events'
import type { Professor } from '@/lib/aics/professors'
import type { Task, TaskType } from '@/lib/aics/tasks'
import type { NotificationInbox } from '@/lib/aics/notifications'
import { TYPE_COLORS } from '@/lib/aics/tasks'
import type { FacultyMember, FacultyStudent } from '@/lib/aics/faculty'
import { PortalShell } from '../portal/PortalShell'
import { Modal } from '../portal/Modal'
import { DashboardSkeleton } from '../portal/Skeleton'

export interface TaskGroup {
  subjectCode: string
  title: string
  type: TaskType
  dueDate: string
  maxScore: number
  total: number
  submitted: number
  graded: number
  closed: number
}

interface SubmissionRow {
  _id: string
  studentUsername: string
  fullName: string
  studentNumber: string
  submitted: boolean
  submittedAt: string | null
  score: number | null
  maxScore: number | null
  feedback: string | null
  submissionsClosed: boolean
}

interface FacultyTasksPageProps {
  student: Student
  onNavigate: (view: View) => void
  onLogout: () => void
  events?: PortalEvent[]
  professors?: Professor[]
  tasks?: Task[]
  facultyData?: { faculty: FacultyMember; subjects: any[]; students: FacultyStudent[] } | null
  inbox?: NotificationInbox
  facultyLoading?: boolean
  taskGroupsData?: { groups: TaskGroup[] } | null
  taskGroupsLoading?: boolean
  taskGroupsError?: string | null
  onFetchTaskGroups?: () => void
}

const TASK_TYPES: TaskType[] = ['Activity', 'Quiz', 'Test', 'Project']

// One-shot handoff for the roster drawer's Announce quiz button
// (refs #36): the drawer stores { type: 'Quiz', subjectCode } in
// sessionStorage, the freshly mounted Tasks page consumes it once
// (type preselected, subject applied when codes arrive) and clears
// it so later visits start at the defaults.
const TASKS_HANDOFF_KEY = 'aics_tasks_handoff'

function readTasksHandoff(): { type?: TaskType; subjectCode?: string } {
  try {
    if (typeof window === 'undefined') return {}
    const raw = window.sessionStorage.getItem(TASKS_HANDOFF_KEY)
    if (!raw) return {}
    window.sessionStorage.removeItem(TASKS_HANDOFF_KEY)
    const parsed = JSON.parse(raw) as { type?: unknown; subjectCode?: unknown }
    const out: { type?: TaskType; subjectCode?: string } = {}
    if (typeof parsed.type === 'string' && (TASK_TYPES as string[]).includes(parsed.type)) {
      out.type = parsed.type as TaskType
    }
    if (typeof parsed.subjectCode === 'string' && parsed.subjectCode) {
      out.subjectCode = parsed.subjectCode
    }
    return out
  } catch {
    return {}
  }
}

function defaultDue(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDue(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function groupKey(group: TaskGroup): string {
  return `${group.subjectCode}|${group.title}|${group.dueDate}`
}

function isClosedGroup(group: TaskGroup): boolean {
  return group.closed >= group.total && group.total > 0
}

// Shared per-group actions so the open list and the closed side
// panel never diverge (owner request: closed tasks live in the
// side panel using the page's empty side space).
function GroupActions({ group, toggling, closed, onSubmissions, onToggle, vertical }: {
  group: TaskGroup
  toggling: boolean
  closed: boolean
  onSubmissions: (group: TaskGroup) => void
  onToggle: (group: TaskGroup) => void
  vertical?: boolean
}) {
  const wrap = vertical ? 'flex flex-col gap-2' : 'flex items-center gap-2 flex-shrink-0'
  const stretch = vertical ? 'w-full justify-center' : ''
  return (
    <div className={wrap}>
      <button
        type="button"
        onClick={() => onSubmissions(group)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-xs font-medium text-blue-700 hover:bg-blue-100 ${stretch}`}
      >
        <UsersIcon className="w-3.5 h-3.5" />
        Submissions
      </button>
      <button
        type="button"
        onClick={() => onToggle(group)}
        disabled={toggling}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium hover:bg-slate-50 disabled:opacity-60 ${stretch}`}
      >
        {toggling ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : closed ? (
          <LockOpen className="w-3.5 h-3.5" />
        ) : (
          <Lock className="w-3.5 h-3.5" />
        )}
        {toggling ? 'Saving...' : closed ? 'Reopen' : 'Close submissions'}
      </button>
    </div>
  )
}

export function FacultyTasksPage({
  student, onNavigate, onLogout, events, professors, tasks,
  facultyData, facultyLoading, taskGroupsData, taskGroupsLoading, taskGroupsError, onFetchTaskGroups,
  inbox,
}: FacultyTasksPageProps) {
  const faculty = facultyData?.faculty ?? null
  const loading = facultyLoading ?? true
  const groups = taskGroupsData?.groups ?? []
  const openGroups = groups.filter((g) => !isClosedGroup(g))
  const closedGroups = groups.filter(isClosedGroup)
  const groupsPending = taskGroupsLoading ?? false

  const codes = Array.from(
    new Set(
      ((facultyData?.subjects as any[]) || [])
        .filter((s) => (s.academicYear || '') === (faculty?.academicYear || '') && (s.semester || '') === (faculty?.semester || ''))
        .map((s) => s.code)
    )
  ).sort()

  const [subjectCode, setSubjectCode] = useState('')
  const [title, setTitle] = useState('')
  // Type may arrive preselected via the Announce quiz handoff (refs #36).
  const [tasksHandoff] = useState(readTasksHandoff)
  const [type, setType] = useState<TaskType>(tasksHandoff.type || 'Activity')
  const [description, setDescription] = useState('')
  const [maxScore, setMaxScore] = useState('10')
  const [dueDate, setDueDate] = useState(defaultDue)
  const [posting, setPosting] = useState(false)
  const [togglingKey, setTogglingKey] = useState<string | null>(null)

  // Grading drawer: one assignment group at a time. Drafts are keyed
  // by task _id and seeded from the fetched submissions.
  const [gradingGroup, setGradingGroup] = useState<TaskGroup | null>(null)
  const [submissions, setSubmissions] = useState<SubmissionRow[] | null>(null)
  const [submissionsLoading, setSubmissionsLoading] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, { score: string; feedback: string }>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  // Stable closer: Modal's mount-only focus effect depends on onClose identity.
  const closeGrading = useCallback(() => {
    setGradingGroup(null)
    setSubmissions(null)
    setDrafts({})
  }, [])

  // Lazy once-per-session fetch, same rule as teaching history.
  useEffect(() => {
    if (!loading && faculty && !taskGroupsData && !groupsPending && onFetchTaskGroups) onFetchTaskGroups()
  }, [loading, faculty, taskGroupsData, groupsPending, onFetchTaskGroups])

  // Default the subject picker once codes arrive, honoring a
  // handoff subject when it is one of the faculty's codes.
  useEffect(() => {
    if (!subjectCode && codes.length > 0) {
      setSubjectCode(tasksHandoff.subjectCode && codes.includes(tasksHandoff.subjectCode) ? tasksHandoff.subjectCode : codes[0])
    }
  }, [codes, subjectCode, tasksHandoff])

  const canPost = subjectCode !== '' && title.trim().length > 0 && !posting

  const handlePost = async () => {
    if (!canPost) {
      toast.error('Pick a subject and give the task a title first.')
      return
    }
    setPosting(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch: student.branch,
          subjectCode,
          title: title.trim(),
          type,
          description: description.trim() || undefined,
          maxScore: Number(maxScore),
          dueDate,
          performedBy: student.username,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        toast.success(data.message || 'Task posted.')
        setTitle('')
        setDescription('')
        setMaxScore('10')
        setDueDate(defaultDue())
        onFetchTaskGroups?.()
      } else {
        toast.error(data.error || 'Failed to post task.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setPosting(false)
    }
  }

  const handleToggle = async (group: TaskGroup) => {
    const key = `${group.subjectCode}|${group.title}|${group.dueDate}`
    const closing = group.closed < group.total
    setTogglingKey(key)
    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch: student.branch,
          subjectCode: group.subjectCode,
          title: group.title,
          dueDate: group.dueDate,
          submissionsClosed: closing,
          performedBy: student.username,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        toast.success(data.message || 'Task updated.')
        onFetchTaskGroups?.()
      } else {
        toast.error(data.error || 'Failed to update task.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setTogglingKey(null)
    }
  }

  const openGrading = async (group: TaskGroup) => {
    setGradingGroup(group)
    setSubmissions(null)
    setDrafts({})
    setSubmissionsLoading(true)
    try {
      const params = new URLSearchParams({
        username: student.username,
        subjectCode: group.subjectCode,
        title: group.title,
        dueDate: group.dueDate,
      })
      const res = await fetch(`/api/faculty/tasks/submissions?${params.toString()}`)
      const data = await res.json()
      if (data.ok) {
        const rows = (data.submissions || []) as SubmissionRow[]
        setSubmissions(rows)
        setDrafts(Object.fromEntries(rows.map((r) => [r._id, { score: r.score === null ? '' : String(r.score), feedback: r.feedback || '' }])))
      } else {
        toast.error(data.error || 'Failed to load submissions.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSubmissionsLoading(false)
    }
  }

  const saveGrade = async (row: SubmissionRow) => {
    const draft = drafts[row._id] || { score: '', feedback: '' }
    const score = Number(draft.score)
    const max = Number(row.maxScore)
    if (draft.score.trim() === '' || !isFinite(score)) {
      toast.error('Enter a numeric score first.')
      return
    }
    if (score < 0 || score > max) {
      toast.error(`Score must be between 0 and ${max}.`)
      return
    }
    setSavingId(row._id)
    try {
      const res = await fetch(`/api/tasks/${row._id}/grade`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, feedback: draft.feedback, performedBy: student.username }),
      })
      const data = await res.json()
      if (data.ok) {
        toast.success(data.message || 'Graded.')
        setSubmissions((prev) => (prev || []).map((r) => r._id === row._id ? { ...r, score, feedback: draft.feedback.trim().slice(0, 2000) } : r))
        // Keep the open drawer's counters honest when a first-time grade lands.
        if (row.score === null) {
          setGradingGroup((prev) => (prev ? { ...prev, graded: prev.graded + 1 } : prev))
        }
        onFetchTaskGroups?.()
      } else {
        toast.error(data.error || 'Failed to save grade.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSavingId(null)
    }
  }

  if (loading || groupsPending) return <DashboardSkeleton />
  if (taskGroupsError) {
    return (
      <div className="min-h-dvh bg-slate-50 grid place-items-center">
        <div className="text-center">
          <p className="text-red-600 text-sm font-medium mb-2">{taskGroupsError}</p>
          <button onClick={onFetchTaskGroups} className="text-blue-600 text-sm font-medium hover:underline">
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
      active="tasks"
      onNavigate={onNavigate}
      onLogout={onLogout}
      events={events}
      professors={professors}
      tasks={tasks}
      facultyData={facultyData}
      taskGroups={taskGroupsData?.groups}
      inbox={inbox}
    >
      <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 max-w-6xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-balance text-slate-900">Tasks</h1>
          <p className="text-sm text-slate-500 mt-1">
            Post work for your subjects. One post reaches every enrolled student.
          </p>
        </div>

        {/* Create form */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">New task</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Subject</label>
                <select
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {codes.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as TaskType)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {TASK_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="e.g., Problem Set 2: Normalization"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Instructions (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="What should students turn in..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-y"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Max score</label>
                <input
                  type="number"
                  min={1}
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Due date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handlePost}
                disabled={!canPost}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {posting ? 'Posting...' : 'Post task'}
              </button>
            </div>
          </div>
        </div>

        {/* Posted groups: open tasks lead, closed ones live in the side panel */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Posted ({groups.length})</h2>
          {groups.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-10 text-center">
              <p className="text-sm text-slate-500">No tasks posted yet. Create the first one above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
              <div className="space-y-3 min-w-0">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Open ({openGroups.length})</h3>
                {openGroups.length === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-10 text-center">
                    <p className="text-sm text-slate-500">Nothing open. Reopen a closed task from the side panel to collect work again.</p>
                  </div>
                ) : (
                  openGroups.map((group) => {
                    const key = groupKey(group)
                    const closed = isClosedGroup(group)
                    const toggling = togglingKey === key
              return (
                <div key={key} className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-blue-700">{group.subjectCode}</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${TYPE_COLORS[group.type] || ''}`}>
                          {group.type}
                        </span>
                        {closed && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border bg-slate-100 text-slate-600 border-slate-200">
                            <Lock className="w-3 h-3" /> Closed
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{group.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Due {formatDue(group.dueDate)} • {group.submitted}/{group.total} submitted • {group.graded} graded • {group.maxScore} pts
                      </p>
                    </div>
                    <GroupActions
                      group={group}
                      toggling={toggling}
                      closed={closed}
                      onSubmissions={openGrading}
                      onToggle={handleToggle}
                    />
                  </div>
                </div>
              )
                  })
                )}
              </div>
          {closedGroups.length > 0 && (
            <aside aria-label="Closed tasks" className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 lg:sticky lg:top-20">
              <h3 className="text-sm font-semibold text-slate-900">Closed ({closedGroups.length})</h3>
              <p className="text-xs text-slate-500 mt-0.5">Done collecting. Reopen to accept work again.</p>
              <div className="space-y-3 mt-3">
                {closedGroups.map((group) => {
                  const key = groupKey(group)
                  const toggling = togglingKey === key
                  return (
                    <div key={key} className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-blue-700">{group.subjectCode}</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${TYPE_COLORS[group.type] || ''}`}>
                          {group.type}
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border bg-slate-100 text-slate-600 border-slate-200">
                          <Lock className="w-3 h-3" /> Closed
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{group.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Due {formatDue(group.dueDate)} • {group.submitted}/{group.total} submitted • {group.graded} graded • {group.maxScore} pts
                      </p>
                      <div className="mt-2.5">
                        <GroupActions
                          group={group}
                          toggling={toggling}
                          closed
                          onSubmissions={openGrading}
                          onToggle={handleToggle}
                          vertical
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </aside>
          )}
        </div>
          )}
        </div>
      </main>

      {gradingGroup && (
        <Modal
          title={<>Submissions — <span className="font-mono text-blue-700">{gradingGroup.subjectCode}</span> {gradingGroup.title}</>}
          description={<>Due {formatDue(gradingGroup.dueDate)} • {gradingGroup.submitted}/{gradingGroup.total} submitted • {gradingGroup.graded} graded • {gradingGroup.maxScore} pts max. Scores show on the student side as soon as you save.</>}
          onClose={closeGrading}
          maxWidthClass="max-w-2xl"
          footer={
            <button type="button" onClick={closeGrading} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50">Close</button>
          }
        >
          {submissionsLoading || submissions === null ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : submissions.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No submissions found for this assignment.</p>
          ) : (
            <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-1">
              {submissions.map((row) => {
                const draft = drafts[row._id] || { score: '', feedback: '' }
                const saving = savingId === row._id
                return (
                  <div key={row._id} className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{row.fullName}</p>
                        <p className="text-xs text-slate-500 font-mono">{row.studentNumber} • {row.studentUsername}</p>
                      </div>
                      {row.score !== null ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200 flex-shrink-0">
                          {row.score} / {row.maxScore}
                        </span>
                      ) : row.submitted ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0">
                          Awaiting grade
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 flex-shrink-0">
                          Not submitted
                        </span>
                      )}
                    </div>
                    {row.submittedAt && (
                      <p className="text-[11px] text-slate-500 mt-1">Submitted {new Date(row.submittedAt).toLocaleString()}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <label className="text-xs font-medium text-slate-600 flex-shrink-0">Score</label>
                      <input
                        type="number"
                        min={0}
                        max={row.maxScore ?? undefined}
                        step="any"
                        value={draft.score}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [row._id]: { ...draft, score: e.target.value } }))}
                        aria-label={`Score for ${row.fullName}`}
                        placeholder={`0–${row.maxScore}`}
                        className="w-24 h-9 px-2 rounded-lg border border-slate-200 bg-white text-sm font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                      <span className="text-xs text-slate-500">/ {row.maxScore}</span>
                      <button
                        type="button"
                        onClick={() => saveGrade(row)}
                        disabled={saving}
                        className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 disabled:opacity-60"
                      >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                    <label className="block text-xs font-medium text-slate-600 mt-2">Feedback (shown to student)</label>
                    <textarea
                      value={draft.feedback}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [row._id]: { ...draft, feedback: e.target.value } }))}
                      maxLength={2000}
                      rows={2}
                      aria-label={`Feedback for ${row.fullName}`}
                      placeholder="What did they do well? What to fix next time..."
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-y"
                    />
                  </div>
                )
              })}
            </div>
          )}
        </Modal>
      )}
    </PortalShell>
  )
}
