'use client'

import { useCallback, useEffect, useState } from 'react'
import { Stamp, Check, Loader2, Inbox } from 'lucide-react'
import { toast } from 'sonner'
import type { Student, View } from '@/lib/aics/types'
import type { PortalEvent } from '@/lib/aics/events'
import type { Professor } from '@/lib/aics/professors'
import type { Task } from '@/lib/aics/tasks'
import type { NotificationInbox } from '@/lib/aics/notifications'
import { PortalShell } from '../portal/PortalShell'
import { EmptyState } from '../portal/EmptyState'

interface PendingGroup {
  subjectCode: string
  title: string
  academicYear: string
  semester: string
  period: 'prelim' | 'midterm' | 'finals'
  count: number
}

interface AdminReleasePageProps {
  student: Student
  onNavigate: (view: View) => void
  onLogout: () => void
  events?: PortalEvent[]
  professors?: Professor[]
  tasks?: Task[]
  inbox?: NotificationInbox
}

function periodLabel(period: PendingGroup['period']): string {
  return period === 'prelim' ? 'Prelim' : period === 'midterm' ? 'Midterm' : 'Finals'
}

export function AdminReleasePage({ student, onNavigate, onLogout, events, professors, tasks, inbox }: AdminReleasePageProps) {
  const [groups, setGroups] = useState<PendingGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmKey, setConfirmKey] = useState<string | null>(null)
  const [releasingKey, setReleasingKey] = useState<string | null>(null)
  const [hasPendingAuditExport, setHasPendingAuditExport] = useState(false)
  const [retryingAudit, setRetryingAudit] = useState(false)

  const branch = student.branch || 'commonwealth'

  const fetchGroups = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/grades/release?username=${encodeURIComponent(student.username)}`)
      const data = await res.json()
      if (data.ok) {
        setGroups(data.groups ?? [])
        setHasPendingAuditExport(data.hasPendingAuditExport === true)
      } else {
        setError(data.error || 'Failed to load pending releases.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [student.username])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  const handleRelease = async (group: PendingGroup) => {
    const key = `${group.subjectCode}|${group.academicYear}|${group.semester}|${group.period}`
    if (confirmKey !== key) {
      setConfirmKey(key)
      return
    }
    setConfirmKey(null)
    setReleasingKey(key)
    try {
      const res = await fetch('/api/grades/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch,
          subjectCode: group.subjectCode,
          academicYear: group.academicYear,
          semester: group.semester,
          period: group.period,
          performedBy: student.username,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        if (data.auditWarning) {
          setHasPendingAuditExport(true)
          toast.warning(data.auditWarning)
        } else {
          toast.success(data.message || 'Grades released.')
        }
        fetchGroups()
      } else {
        toast.error(data.error || 'Failed to release grades.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setReleasingKey(null)
    }
  }

  const retryAuditExport = async () => {
    setRetryingAudit(true)
    try {
      const response = await fetch('/api/grades/release', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch, performedBy: student.username }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || 'Could not export grade history.')
      toast.success('Grade history exported.')
      await fetchGroups()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not export grade history. Try again.')
    } finally {
      setRetryingAudit(false)
    }
  }

  return (
    <PortalShell
      student={student}
      active="release-queue"
      onNavigate={onNavigate}
      onLogout={onLogout}
      events={events}
      professors={professors}
      tasks={tasks}
      inbox={inbox}
    >
      <main className="admin-page space-y-5 px-4 py-6 sm:space-y-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="admin-page-header">
          <h1 className="admin-page-title text-2xl font-bold tracking-tight text-balance text-slate-900">Release Queue</h1>
          <p className="text-sm text-slate-500 mt-1">
            Submitted grade periods awaiting release. Released grades become visible to students.
          </p>
        </div>

        {hasPendingAuditExport && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-surface p-4">
            <p role="status" className="text-sm text-slate-700">Some grade history is waiting to be exported.</p>
            <button
              type="button"
              onClick={retryAuditExport}
              disabled={retryingAudit || releasingKey !== null}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-link disabled:opacity-60"
            >
              {retryingAudit ? 'Exporting grade history…' : 'Retry grade history export'}
            </button>
          </div>
        )}

        {loading ? (
          <div className="bg-surface rounded-xl border border-slate-200 shadow-sm px-6 py-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading pending releases...</p>
          </div>
        ) : error ? (
          <div className="bg-surface rounded-xl border border-red-200 shadow-sm px-6 py-10 text-center">
            <p className="text-sm text-red-600 font-medium mb-1">{error}</p>
            <button
              type="button"
              onClick={fetchGroups}
              className="text-link text-sm font-medium hover:underline"
            >
              Try again
            </button>
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-surface rounded-xl border border-slate-200 shadow-sm">
            <EmptyState icon={Inbox} message="Nothing waiting" hint="Submitted periods from faculty will appear here." />
          </div>
        ) : (
          <div className="bg-surface admin-table-card rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="admin-table-scroll overflow-x-auto">
              <table role="table" aria-label="Pending grade releases" className="admin-table w-full text-sm min-w-[720px]">
                <thead role="rowgroup" className="sticky top-0 z-10">
                  <tr role="row" className="bg-slate-50 border-b border-slate-100">
                    <th role="columnheader" scope="col" className="bg-slate-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Subject</th>
                    <th role="columnheader" scope="col" className="bg-slate-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Term</th>
                    <th role="columnheader" scope="col" className="bg-slate-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Period</th>
                    <th role="columnheader" scope="col" className="bg-slate-50 px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Students</th>
                    <th role="columnheader" scope="col" className="bg-slate-50 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody role="rowgroup">
                  {groups.map((group) => {
                    const key = `${group.subjectCode}|${group.academicYear}|${group.semester}|${group.period}`
                    const confirming = confirmKey === key
                    const releasing = releasingKey === key
                    return (
                      <tr role="row" key={key} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60">
                        <td role="cell" className="admin-cell-title px-4 py-3">
                          <span className="font-mono text-xs font-bold text-link-strong max-sm:block">{group.subjectCode}</span>
                          <span className="text-sm text-slate-700 max-sm:mt-0.5 max-sm:block max-sm:font-semibold max-sm:text-ink sm:ml-2">{group.title}</span>
                        </td>
                        <td role="cell" className="px-4 py-3 text-sm text-slate-600">
                          <span className="admin-cell-label" aria-hidden="true">Term</span>
                          {group.academicYear} {group.semester}
                        </td>
                        <td role="cell" className="px-4 py-3">
                          <span className="admin-cell-label" aria-hidden="true">Period</span>
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-blue-50 text-link-strong border-blue-200">
                            {periodLabel(group.period)}
                          </span>
                        </td>
                        <td role="cell" className="admin-cell-wide px-4 py-3 text-center">
                          <span className="admin-cell-label" aria-hidden="true">Students</span>
                          <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold tabular-nums">
                            {group.count}
                          </span>
                        </td>
                        <td role="cell" className="admin-cell-actions px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRelease(group)}
                            disabled={releasing || retryingAudit}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60 ${
                              confirming
                                ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                                : 'bg-[#153357] text-white hover:bg-[#0f2744]'
                            }`}
                          >
                            {releasing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : confirming ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Stamp className="w-3.5 h-3.5" />
                            )}
                            {releasing ? 'Releasing...' : confirming ? `Confirm release (${group.count})` : 'Release'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </PortalShell>
  )
}
