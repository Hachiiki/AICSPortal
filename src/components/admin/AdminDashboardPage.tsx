'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  GraduationCap,
  Landmark,
  Loader2,
  Megaphone,
  RotateCcw,
  Stamp,
  Users,
} from 'lucide-react'
import { CATEGORY_LABELS, CATEGORY_PILL_STYLES } from '@/lib/aics/events'
import { ANNOUNCEMENT_STYLES } from '@/lib/aics/announcements'
import type { EventCategory } from '@/lib/aics/events'
import type { AnnouncementCategory } from '@/lib/aics/announcements'
import { PortalShell } from '../portal/PortalShell'
import { EmptyState } from '../portal/EmptyState'
import type { AdminPageProps } from './admin-props'

// ============================================================
//  Admin Dashboard — school-wide snapshot
//
//  Enrollment counts, GPA distribution (Philippine 1.00-best
//  scale, dean's lister cutoff 1.75), fee collection status,
//  and a per-branch overview. All numbers come from
//  GET /api/admin/stats (admin session required).
// ============================================================

interface StatsResponse {
  totals: {
    students: number
    faculty: number
    admins: number
    branches: number
    programs: number
    courses: number
    events: number
    announcements: number
    pendingReleaseGroups: number
    pendingReleaseRows: number
    upcomingEvents: number
  }
  enrollment: {
    byStatus: { label: string; count: number }[]
    byYearLevel: { label: string; count: number }[]
    byProgram: { label: string; count: number }[]
  }
  gpa: {
    buckets: { label: string; count: number }[]
    deanListers: number
    withGpa: number
    withoutGpa: number
    average: string | null
  }
  finances: {
    totalAssessment: number
    totalPaid: number
    totalBalance: number
    paid: number
    partial: number
    unpaid: number
  }
  branches: {
    branch: string
    branchName: string
    students: number
    faculty: number
    programs: number
    courses: number
    events: number
    announcements: number
    pendingReleases: number
    deanListers: number
    balance: number
  }[]
  upcomingEvents: {
    _id: string
    title: string
    date: string
    endDate: string | null
    category: EventCategory
    branch: string
  }[]
  recentAnnouncements: {
    _id: string
    title: string
    category: AnnouncementCategory
    priority: 'normal' | 'urgent'
    author: string
    postedDate: string
    expiryDate: string | null
    branch: string
  }[]
  pendingReleases: {
    subjectCode: string
    title: string
    academicYear: string
    semester: string
    period: 'prelim' | 'midterm' | 'finals'
    count: number
  }[]
}

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 })

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  onClick,
}: {
  icon: typeof Users
  label: string
  value: string
  hint?: string
  onClick?: () => void
}) {
  const clickable = typeof onClick === 'function'
  return (
    <div
      className={`bg-surface rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 ${
        clickable ? 'cursor-pointer hover:border-blue-300 hover:shadow transition-colors' : ''
      }`}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.() } : undefined}
    >
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-link-strong" />
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}

function BreakdownList({ title, rows, emptyLabel }: { title: string; rows: { label: string; count: number }[]; emptyLabel: string }) {
  const total = rows.reduce((sum, r) => sum + r.count, 0)
  return (
    <section className="bg-surface rounded-xl border border-slate-200 shadow-sm p-5">
      <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      {rows.length === 0 ? (
        <EmptyState compact icon={Users} message={emptyLabel} className="mt-3" />
      ) : (
        <ul className="mt-3 space-y-2.5">
          {rows.map((r) => {
            const pct = total > 0 ? Math.round((r.count / total) * 100) : 0
            return (
              <li key={r.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 font-medium truncate">{r.label}</span>
                  <span className="text-slate-500 tabular-nums flex-shrink-0 ml-3">
                    {r.count} <span className="text-slate-500">({pct}%)</span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export function AdminDashboardPage({ student, onNavigate, onLogout, events, professors, tasks, inbox }: AdminPageProps) {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/stats')
      const data = await res.json()
      if (data.ok) setStats(data.stats)
      else setError(data.error || 'Failed to load school stats.')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const maxBucket = stats ? Math.max(1, ...stats.gpa.buckets.map((b) => b.count)) : 1

  return (
    <PortalShell
      student={student}
      active="dashboard"
      onNavigate={onNavigate}
      onLogout={onLogout}
      events={events}
      professors={professors}
      tasks={tasks}
      inbox={inbox}
    >
      <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-balance text-slate-900">Admin Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            School-wide snapshot across every branch — enrollment, grades, and collections.
          </p>
        </div>

        {loading ? (
          <div className="bg-surface rounded-xl border border-slate-200 shadow-sm px-6 py-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Crunching school numbers...</p>
          </div>
        ) : error || !stats ? (
          <div className="bg-surface rounded-xl border border-red-200 shadow-sm px-6 py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-sm text-red-600 font-medium mb-1">{error || 'Something went wrong.'}</p>
            <button
              type="button"
              onClick={fetchStats}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#153357] text-white text-sm font-semibold hover:bg-[#0f2744]"
            >
              <RotateCcw className="w-4 h-4" /> Try again
            </button>
          </div>
        ) : (
          <>
            {/* Headline stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Students" value={String(stats.totals.students)} hint={`${stats.totals.branches} branch${stats.totals.branches === 1 ? '' : 'es'} · ${stats.totals.programs} programs`} onClick={() => onNavigate('admin-people')} />
              <StatCard icon={GraduationCap} label="Faculty" value={String(stats.totals.faculty)} hint={`${stats.totals.courses} courses in catalog`} onClick={() => onNavigate('admin-people')} />
              <StatCard
                icon={Stamp}
                label="Pending releases"
                value={String(stats.totals.pendingReleaseGroups)}
                hint={
                  stats.totals.pendingReleaseGroups > 0
                    ? `${stats.totals.pendingReleaseRows} student rows waiting`
                    : 'Nothing waiting'
                }
                onClick={() => onNavigate('release-queue')}
              />
              <StatCard icon={Landmark} label="Outstanding balance" value={peso.format(stats.finances.totalBalance)} hint={`${peso.format(stats.finances.totalPaid)} collected of ${peso.format(stats.finances.totalAssessment)}`} onClick={() => onNavigate('admin-enrollment')} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Megaphone} label="Announcements" value={String(stats.totals.announcements)} hint="All-time posts" onClick={() => onNavigate('admin-announcements')} />
              <StatCard icon={CalendarDays} label="Events" value={String(stats.totals.events)} hint={`${stats.totals.upcomingEvents} in the next 7 days`} onClick={() => onNavigate('admin-events')} />
              <StatCard icon={Users} label="Professors listed" value={String(professors?.length ?? 0)} hint="Directory entries (this branch)" onClick={() => onNavigate('admin-professors')} />
              <StatCard icon={Stamp} label="Dean's listers" value={String(stats.gpa.deanListers)} hint={`GPA ≤ 1.75 · ${stats.gpa.withGpa} with released grades`} />
            </div>

            {/* GPA distribution + enrollment status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <section className="bg-surface rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-sm font-bold text-slate-900">GPA distribution</h2>
                  <p className="text-xs text-slate-500">
                    {stats.gpa.average ? `School average ${stats.gpa.average}` : 'No released grades yet'}
                  </p>
                </div>
                <ul className="mt-4 space-y-2">
                  {stats.gpa.buckets.map((b, i) => {
                    const deans = i < 3 // buckets at or below 1.75
                    const pct = Math.round((b.count / maxBucket) * 100)
                    return (
                      <li key={b.label} className="flex items-center gap-3">
                        <span className="w-20 flex-shrink-0 text-xs font-medium text-slate-600 tabular-nums">{b.label}</span>
                        <div className="flex-1 h-5 rounded-md bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-md ${deans ? 'bg-emerald-600' : 'bg-blue-600'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-6 text-right text-xs font-semibold text-slate-700 tabular-nums">{b.count}</span>
                      </li>
                    )
                  })}
                </ul>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm bg-emerald-600" /> Dean&apos;s lister range (≤ 1.75)
                  </span>
                  <span>{stats.gpa.withoutGpa} students without released grades</span>
                </div>
              </section>

              <BreakdownList title="Enrollment status" rows={stats.enrollment.byStatus} emptyLabel="No students yet." />
            </div>

            {/* Year level + program + finances */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <BreakdownList title="By year level" rows={stats.enrollment.byYearLevel} emptyLabel="No students yet." />
              <BreakdownList title="By program" rows={stats.enrollment.byProgram} emptyLabel="No students yet." />
              <section className="bg-surface rounded-xl border border-slate-200 shadow-sm p-5">
                <h2 className="text-sm font-bold text-slate-900">Fee collection</h2>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Total assessment</dt>
                    <dd className="font-semibold text-slate-900 tabular-nums">{peso.format(stats.finances.totalAssessment)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Collected</dt>
                    <dd className="font-semibold text-emerald-700 tabular-nums">{peso.format(stats.finances.totalPaid)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Outstanding</dt>
                    <dd className="font-semibold text-red-600 tabular-nums">{peso.format(stats.finances.totalBalance)}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                    {stats.finances.paid} paid
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-amber-50 text-amber-700 border-amber-200">
                    {stats.finances.partial} partial
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-slate-100 text-slate-600 border-slate-200">
                    {stats.finances.unpaid} unpaid
                  </span>
                </div>
                {stats.finances.totalAssessment > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                      <span>Collection rate</span>
                      <span className="tabular-nums">
                        {Math.round((stats.finances.totalPaid / stats.finances.totalAssessment) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.min(100, Math.round((stats.finances.totalPaid / stats.finances.totalAssessment) * 100))}%` }}
                      />
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Branch overview */}
            <section className="bg-surface rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-3">
                <h2 className="text-sm font-bold text-slate-900">Branch overview</h2>
                <p className="text-xs text-slate-500 mt-0.5">Per-branch counts across every collection.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[980px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th scope="col" className="bg-slate-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Branch</th>
                      <th scope="col" className="bg-slate-50 px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Students</th>
                      <th scope="col" className="bg-slate-50 px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Faculty</th>
                      <th scope="col" className="bg-slate-50 px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Programs</th>
                      <th scope="col" className="bg-slate-50 px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Courses</th>
                      <th scope="col" className="bg-slate-50 px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Events</th>
                      <th scope="col" className="bg-slate-50 px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Announcements</th>
                      <th scope="col" className="bg-slate-50 px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Pending rel.</th>
                      <th scope="col" className="bg-slate-50 px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Dean's listers</th>
                      <th scope="col" className="bg-slate-50 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.branches.map((b) => (
                      <tr key={b.branch} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{b.branchName}</p>
                          <p className="text-xs text-slate-500 font-mono">{b.branch}</p>
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-slate-700 tabular-nums">{b.students}</td>
                        <td className="px-4 py-3 text-center font-medium text-slate-700 tabular-nums">{b.faculty}</td>
                        <td className="px-4 py-3 text-center font-medium text-slate-700 tabular-nums">{b.programs}</td>
                        <td className="px-4 py-3 text-center font-medium text-slate-700 tabular-nums">{b.courses}</td>
                        <td className="px-4 py-3 text-center font-medium text-slate-700 tabular-nums">{b.events}</td>
                        <td className="px-4 py-3 text-center font-medium text-slate-700 tabular-nums">{b.announcements}</td>
                        <td className="px-4 py-3 text-center">
                          {b.pendingReleases > 0 ? (
                            <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold tabular-nums">
                              {b.pendingReleases}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-emerald-700 tabular-nums">{b.deanListers}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900 tabular-nums">{peso.format(b.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Upcoming events + recent announcements */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <section className="bg-surface rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900">Next 7 days</h2>
                  <button type="button" onClick={() => onNavigate('admin-events')} className="text-xs font-semibold text-link-strong hover:underline">
                    Manage events
                  </button>
                </div>
                {stats.upcomingEvents.length === 0 ? (
                  <EmptyState compact icon={CalendarDays} message="No events in the next seven days." className="mt-3" />
                ) : (
                  <ul className="mt-3 divide-y divide-slate-100">
                    {stats.upcomingEvents.map((e) => (
                      <li key={e._id} className="py-2.5 flex items-center gap-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border flex-shrink-0 ${CATEGORY_PILL_STYLES[e.category]}`}>
                          {CATEGORY_LABELS[e.category]}
                        </span>
                        <span className="text-sm text-slate-800 font-medium truncate min-w-0">{e.title}</span>
                        <span className="ml-auto text-xs text-slate-500 flex-shrink-0 tabular-nums">{formatDate(e.date)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="bg-surface rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900">Latest announcements</h2>
                  <button type="button" onClick={() => onNavigate('admin-announcements')} className="text-xs font-semibold text-link-strong hover:underline">
                    Manage announcements
                  </button>
                </div>
                {stats.recentAnnouncements.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">Nothing posted yet.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-slate-100">
                    {stats.recentAnnouncements.map((a) => {
                      const style = ANNOUNCEMENT_STYLES[a.category] ?? ANNOUNCEMENT_STYLES.general
                      return (
                        <li key={a._id} className="py-2.5 flex items-center gap-3">
                          {a.priority === 'urgent' ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-red-50 text-red-700 border-red-200 flex-shrink-0">Urgent</span>
                          ) : (
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border flex-shrink-0 ${style.pill}`}>{style.label}</span>
                          )}
                          <span className="text-sm text-slate-800 font-medium truncate min-w-0">{a.title}</span>
                          <span className="ml-auto text-xs text-slate-500 flex-shrink-0 tabular-nums">{formatDate(a.postedDate)}</span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </PortalShell>
  )
}
