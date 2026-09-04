'use client'

import { useCallback, useEffect, useState } from 'react'
import { Stamp, Check, Loader2, Inbox } from 'lucide-react'
import { toast } from 'sonner'
import type { Student, View } from '@/lib/aics/types'
import type { PortalEvent } from '@/lib/aics/events'
import type { Professor } from '@/lib/aics/professors'
import type { Task } from '@/lib/aics/tasks'
import { PortalShell } from '../portal/PortalShell'

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
}

function periodLabel(period: PendingGroup['period']): string {
  return period === 'prelim' ? 'Prelim' : period === 'midterm' ? 'Midterm' : 'Finals'
}

export function AdminReleasePage({ student, onNavigate, onLogout, events, professors, tasks }: AdminReleasePageProps) {
  const [groups, setGroups] = useState<PendingGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmKey, setConfirmKey] = useState<string | null>(null)
  const [releasingKey, setReleasingKey] = useState<string | null>(null)

  const branch = student.branch || 'commonwealth'

  const fetchGroups = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/grades/release?username=${encodeURIComponent(student.username)}`)
      const data = await res.json()
      if (data.ok) setGroups(data.groups || [])
      else setError(data.error || 'Failed to load pending releases.')
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
        toast.success(data.message || 'Grades released.')
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

  return (
    <PortalShell
      student={student}
      active="dashboard"
      onNavigate={onNavigate}
      onLogout={onLogout}
      events={events}
      professors={professors}
      tasks={tasks}
    >
      <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Release Queue</h1>
          <p className="text-sm text-slate-500 mt-1">
            Submitted grade periods awaiting release. Released grades become visible to students.
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading pending releases...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl border border-red-200 shadow-sm px-6 py-10 text-center">
            <p className="text-sm text-red-600 font-medium mb-1">{error}</p>
            <button
              type="button"
              onClick={fetchGroups}
              className="text-blue-600 text-sm font-medium hover:underline"
            >
              Try again
            </button>
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
              <Inbox className="w-6 h-6 text-green-500" />
            </div>
            <p className="text-sm font-medium text-slate-600">Nothing waiting</p>
            <p className="text-xs text-slate-400 mt-1">Submitted periods from faculty will appear here.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Subject</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Term</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Period</th>
                    <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Students</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => {
                    const key = `${group.subjectCode}|${group.academicYear}|${group.semester}|${group.period}`
                    const confirming = confirmKey === key
                    const releasing = releasingKey === key
                    return (
                      <tr key={key} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-bold text-blue-700">{group.subjectCode}</span>
                          <span className="text-sm text-slate-700 ml-2">{group.title}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {group.academicYear} {group.semester}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-blue-50 text-blue-700 border-blue-200">
                            {periodLabel(group.period)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                            {group.count}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRelease(group)}
                            disabled={releasing}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60 ${
                              confirming
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
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
