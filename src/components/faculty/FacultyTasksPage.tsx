'use client'

import { useState, useEffect } from 'react'
import { ClipboardList, Send, Loader2, Lock, LockOpen } from 'lucide-react'
import { toast } from 'sonner'
import type { Student, View } from '@/lib/aics/types'
import type { PortalEvent } from '@/lib/aics/events'
import type { Professor } from '@/lib/aics/professors'
import type { Task, TaskType } from '@/lib/aics/tasks'
import { TYPE_COLORS } from '@/lib/aics/tasks'
import type { FacultyMember, FacultyStudent } from '@/lib/aics/faculty'
import { PortalShell } from '../portal/PortalShell'
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

interface FacultyTasksPageProps {
  student: Student
  onNavigate: (view: View) => void
  onLogout: () => void
  events?: PortalEvent[]
  professors?: Professor[]
  tasks?: Task[]
  facultyData?: { faculty: FacultyMember; subjects: any[]; students: FacultyStudent[] } | null
  facultyLoading?: boolean
  taskGroupsData?: { groups: TaskGroup[] } | null
  taskGroupsLoading?: boolean
  taskGroupsError?: string | null
  onFetchTaskGroups?: () => void
}

const TASK_TYPES: TaskType[] = ['Activity', 'Quiz', 'Test', 'Project']

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

export function FacultyTasksPage({
  student, onNavigate, onLogout, events, professors, tasks,
  facultyData, facultyLoading, taskGroupsData, taskGroupsLoading, taskGroupsError, onFetchTaskGroups,
}: FacultyTasksPageProps) {
  const faculty = facultyData?.faculty ?? null
  const loading = facultyLoading ?? true
  const groups = taskGroupsData?.groups ?? []
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
  const [type, setType] = useState<TaskType>('Activity')
  const [description, setDescription] = useState('')
  const [maxScore, setMaxScore] = useState('10')
  const [dueDate, setDueDate] = useState(defaultDue)
  const [posting, setPosting] = useState(false)
  const [togglingKey, setTogglingKey] = useState<string | null>(null)

  // Lazy once-per-session fetch, same rule as teaching history.
  useEffect(() => {
    if (!loading && faculty && !taskGroupsData && !groupsPending && onFetchTaskGroups) onFetchTaskGroups()
  }, [loading, faculty, taskGroupsData, groupsPending, onFetchTaskGroups])

  // Default the subject picker once codes arrive.
  useEffect(() => {
    if (!subjectCode && codes.length > 0) setSubjectCode(codes[0])
  }, [codes, subjectCode])

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
    >
      <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Tasks</h1>
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

        {/* Posted groups */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Posted ({groups.length})</h2>
          {groups.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-10 text-center">
              <p className="text-sm text-slate-500">No tasks posted yet. Create the first one above.</p>
            </div>
          ) : (
            groups.map((group) => {
              const key = `${group.subjectCode}|${group.title}|${group.dueDate}`
              const closed = group.closed >= group.total && group.total > 0
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
                    <button
                      type="button"
                      onClick={() => handleToggle(group)}
                      disabled={toggling}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium hover:bg-slate-50 disabled:opacity-60 flex-shrink-0"
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
                </div>
              )
            })
          )}
        </div>
      </main>
    </PortalShell>
  )
}
