'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
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
import { getPrimaryNav } from '@/lib/aics/nav-config'
import type { View } from '@/lib/aics/types'
import { usePhoneViewport } from '@/lib/aics/use-phone-viewport'
import { DashboardWelcome } from '../portal/AcademicHeader'
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
    withoutReleasedGrades: number
    withPercentage: number
    percentageAverage: string | null
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
const mobileManagementViews: View[] = ['admin-announcements', 'admin-events', 'admin-enrollment', 'admin-professors']

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
  const Card = clickable ? 'button' : 'div'
  return (
    <Card
      className={`bg-surface rounded-xl border border-slate-200 shadow-sm p-4 text-left sm:p-5 ${
        clickable ? 'cursor-pointer hover:border-blue-300 hover:shadow transition-colors' : ''
      }`}
      onClick={onClick}
      type={clickable ? 'button' : undefined}
    >
      <span className="flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-link-strong" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      </span>
      <span className="mt-3 block text-2xl font-bold text-slate-900 tabular-nums">{value}</span>
      {hint ? <span className="mt-0.5 block text-xs text-slate-500">{hint}</span> : null}
    </Card>
  )
}

function AdminMobileOverview({ stats, firstName }: { stats: StatsResponse | null; firstName: string }) {
  const metrics = stats ? [
    { label: 'Students', value: stats.totals.students },
    { label: 'Faculty', value: stats.totals.faculty },
    { label: 'Pending releases', value: stats.totals.pendingReleaseGroups },
  ] : []
  return (
    <div className="student-dashboard-hero sm:hidden" data-portal-motion-group>
      <DashboardWelcome firstName={firstName}>
        Admin dashboard
      </DashboardWelcome>
      {stats && (
        <section className="student-overview min-w-0" aria-label="School overview">
          <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-1">
            <h2 className="font-semibold">School overview</h2>
            <p className="text-xs">{stats.totals.branches} {stats.totals.branches === 1 ? 'branch' : 'branches'}</p>
          </div>
          <dl className="student-overview-stats grid grid-cols-[1fr_0.85fr_1.25fr] rounded-xl border">
            {metrics.map(({ label, value }) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs leading-tight">{label}</dt>
                <dd className="mt-1 text-xl font-semibold leading-none tabular-nums [overflow-wrap:anywhere]">{value.toLocaleString('en-PH')}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  )
}

function AdminManagement({ releaseBranch, onNavigate }: { releaseBranch?: string; onNavigate: (view: View) => void }) {
  const destinations = getPrimaryNav('admin')
  return (
    <div className="space-y-5 sm:hidden">
      {releaseBranch && (
        <button type="button" onClick={() => onNavigate('release-queue')}
          className="flex w-full items-center gap-3 rounded-xl border border-amber-200 bg-surface p-3.5 text-left shadow-sm hover:border-amber-400">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700"><Stamp className="size-5" aria-hidden="true" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">Review submitted grades</span>
            <span className="mt-0.5 block text-xs text-muted-fg">{releaseBranch} release queue</span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-amber-700" aria-hidden="true" />
        </button>
      )}
      <section>
        <h2 className="mb-2.5 font-semibold text-ink">Manage</h2>
        <ul className="grid grid-cols-2 gap-2.5">
          {mobileManagementViews.map(view => {
            const item = destinations.find(destination => destination.enabled && destination.view === view)
            if (!item) return null
            return (
              <li key={view} className="min-w-0">
                <button type="button" onClick={() => onNavigate(view)}
                  className="admin-management-link flex min-h-14 w-full items-center gap-2 rounded-xl border border-line bg-surface px-2.5 py-2 text-left text-[13px] font-semibold text-ink hover:border-link">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-blue-50 text-link-strong"><item.icon className="size-4" aria-hidden="true" /></span>
                  <span className="min-w-0 [overflow-wrap:anywhere]">{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

function AdminSchoolTotals({ stats, professorCount }: { stats: StatsResponse; professorCount: number }) {
  const totals = [
    { label: 'Programs', value: stats.totals.programs },
    { label: 'Courses', value: stats.totals.courses },
    { label: 'Student grades awaiting release', value: stats.totals.pendingReleaseRows },
    { label: 'Announcements', value: stats.totals.announcements },
    { label: 'Events', value: stats.totals.events },
    { label: "Dean's listers", value: stats.gpa.deanListers },
    { label: 'Professors listed in this branch', value: professorCount },
  ]
  return (
    <section className="rounded-xl border border-line bg-surface p-4 sm:hidden">
      <h2 className="font-semibold text-ink">School totals</h2>
      <dl className="mt-2 divide-y divide-line text-sm">
        {totals.map(({ label, value }) => (
          <div key={label} className="flex justify-between gap-3 py-2">
            <dt className="text-muted-fg">{label}</dt>
            <dd className="shrink-0 font-semibold tabular-nums text-ink">{value.toLocaleString('en-PH')}</dd>
          </div>
        ))}
      </dl>
    </section>
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
  const phone = usePhoneViewport()
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
  const releaseBranch = stats?.branches.find(branch => branch.branch === student.branch && branch.pendingReleases > 0)?.branchName

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
      <main className="admin-dashboard sm:space-y-6 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <AdminMobileOverview stats={loading || error ? null : stats} firstName={student.firstName} />
        <div className="hidden sm:block">
          <h1 className="text-2xl font-bold tracking-tight text-balance text-slate-900">Admin Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            School-wide snapshot across every branch — enrollment, grades, and collections.
          </p>
        </div>

        <div className="admin-dashboard-panel student-dashboard-panel max-sm:px-4 sm:space-y-6">
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
              <AdminManagement releaseBranch={releaseBranch} onNavigate={onNavigate} />
              {phone && <AdminUpdates stats={stats} onNavigate={onNavigate} />}
              {/* Headline stat cards */}
              <div data-portal-motion-group className="hidden grid-cols-2 gap-4 sm:grid lg:grid-cols-4">
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

              <div data-portal-motion-group className="hidden grid-cols-2 gap-4 sm:grid lg:grid-cols-4">
                <StatCard icon={Megaphone} label="Announcements" value={String(stats.totals.announcements)} hint="All-time posts" onClick={() => onNavigate('admin-announcements')} />
                <StatCard icon={CalendarDays} label="Events" value={String(stats.totals.events)} hint={`${stats.totals.upcomingEvents} in the next 7 days`} onClick={() => onNavigate('admin-events')} />
                <StatCard icon={Users} label="Professors listed" value={String(professors?.length ?? 0)} hint="Directory entries (this branch)" onClick={() => onNavigate('admin-professors')} />
                <StatCard icon={Stamp} label="Dean's listers" value={String(stats.gpa.deanListers)} hint={`GPA ≤ 1.75 · ${stats.gpa.withGpa} with a released GPA`} />
              </div>

              {/* GPA distribution + enrollment status */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <section className="bg-surface rounded-xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-sm font-bold text-slate-900">GPA distribution</h2>
                    <p className="text-xs text-slate-500">
                      {stats.gpa.average ? `GPA average ${stats.gpa.average}` : 'No released GPA grades'}
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
                    <span>{stats.gpa.withoutReleasedGrades} students without a released numeric grade</span>
                    {stats.gpa.percentageAverage && (
                      <span>Released percentage average {stats.gpa.percentageAverage}% across {stats.gpa.withPercentage} students</span>
                    )}
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

              <AdminSchoolTotals stats={stats} professorCount={professors?.length ?? 0} />

              {/* Branch overview */}
              <section className="bg-surface rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 pt-5 pb-3">
                  <h2 className="text-sm font-bold text-slate-900">Branch overview</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Per-branch counts across every collection.</p>
                </div>
                <div className="admin-table-scroll overflow-x-auto">
                  <table role="table" aria-label="Branch overview" className="admin-table w-full text-sm min-w-[980px]">
                    <thead role="rowgroup" className="sticky top-0 z-10">
                      <tr role="row" className="bg-slate-50 border-b border-slate-100">
                        <th role="columnheader" scope="col" className="bg-slate-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Branch</th>
                        <th role="columnheader" scope="col" className="bg-slate-50 px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Students</th>
                        <th role="columnheader" scope="col" className="bg-slate-50 px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Faculty</th>
                        <th role="columnheader" scope="col" className="bg-slate-50 px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Programs</th>
                        <th role="columnheader" scope="col" className="bg-slate-50 px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Courses</th>
                        <th role="columnheader" scope="col" className="bg-slate-50 px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Events</th>
                        <th role="columnheader" scope="col" className="bg-slate-50 px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Announcements</th>
                        <th role="columnheader" scope="col" className="bg-slate-50 px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Pending rel.</th>
                        <th role="columnheader" scope="col" className="bg-slate-50 px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Dean's listers</th>
                        <th role="columnheader" scope="col" className="bg-slate-50 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody role="rowgroup">
                      {stats.branches.map((b) => (
                        <tr role="row" key={b.branch} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60">
                          <td role="cell" className="admin-cell-title px-4 py-3">
                            <p className="font-semibold text-slate-900">{b.branchName}</p>
                            <p className="text-xs text-slate-500 font-mono">{b.branch}</p>
                          </td>
                          <td role="cell" className="px-4 py-3 text-center font-medium text-slate-700 tabular-nums">
                            <span className="admin-cell-label" aria-hidden="true">Students</span>
                            {b.students}
                          </td>
                          <td role="cell" className="px-4 py-3 text-center font-medium text-slate-700 tabular-nums">
                            <span className="admin-cell-label" aria-hidden="true">Faculty</span>
                            {b.faculty}
                          </td>
                          <td role="cell" className="px-4 py-3 text-center font-medium text-slate-700 tabular-nums">
                            <span className="admin-cell-label" aria-hidden="true">Programs</span>
                            {b.programs}
                          </td>
                          <td role="cell" className="px-4 py-3 text-center font-medium text-slate-700 tabular-nums">
                            <span className="admin-cell-label" aria-hidden="true">Courses</span>
                            {b.courses}
                          </td>
                          <td role="cell" className="px-4 py-3 text-center font-medium text-slate-700 tabular-nums">
                            <span className="admin-cell-label" aria-hidden="true">Events</span>
                            {b.events}
                          </td>
                          <td role="cell" className="px-4 py-3 text-center font-medium text-slate-700 tabular-nums">
                            <span className="admin-cell-label" aria-hidden="true">Announcements</span>
                            {b.announcements}
                          </td>
                          <td role="cell" className="px-4 py-3 text-center">
                            <span className="admin-cell-label" aria-hidden="true">Pending releases</span>
                            {b.pendingReleases > 0 ? (
                              <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold tabular-nums">
                                {b.pendingReleases}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-xs">—</span>
                            )}
                          </td>
                          <td role="cell" className="px-4 py-3 text-center font-medium text-emerald-700 tabular-nums">
                            <span className="admin-cell-label" aria-hidden="true">Dean's listers</span>
                            {b.deanListers}
                          </td>
                          <td role="cell" className="px-4 py-3 text-right font-semibold text-slate-900 tabular-nums">
                            <span className="admin-cell-label" aria-hidden="true">Outstanding</span>
                            {peso.format(b.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {!phone && <AdminUpdates stats={stats} onNavigate={onNavigate} />}
            </>
          )}
        </div>
      </main>
    </PortalShell>
  )
}

function AdminUpdates({ stats, onNavigate }: { stats: StatsResponse; onNavigate: (view: View) => void }) {
  return (
    <div className="admin-dashboard-updates grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section className="bg-surface rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900">Next 7 days</h2>
          <button type="button" onClick={() => onNavigate('admin-events')} className="shrink-0 text-xs font-semibold text-link-strong hover:underline">
            Manage events
          </button>
        </div>
        {stats.upcomingEvents.length === 0 ? (
          <EmptyState compact icon={CalendarDays} message="No events in the next seven days." className="mt-3" />
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {stats.upcomingEvents.map((e) => (
              <li key={e._id} className="py-2.5 flex items-center gap-3">
                <span className={`inline-flex w-fit px-2 py-0.5 rounded-full text-[11px] font-semibold border flex-shrink-0 ${CATEGORY_PILL_STYLES[e.category]}`}>
                  {CATEGORY_LABELS[e.category]}
                </span>
                <span className="admin-update-title min-w-0 truncate text-sm font-medium text-slate-800">{e.title}</span>
                <span className="ml-auto text-xs text-slate-500 flex-shrink-0 tabular-nums">{formatDate(e.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-surface rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900">Latest announcements</h2>
          <button type="button" aria-label="Manage announcements" onClick={() => onNavigate('admin-announcements')} className="shrink-0 text-xs font-semibold text-link-strong hover:underline">
            <span className="sm:hidden">Manage</span>
            <span className="hidden sm:inline">Manage announcements</span>
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
                    <span className="inline-flex w-fit px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-red-50 text-red-700 border-red-200 flex-shrink-0">Urgent</span>
                  ) : (
                    <span className={`inline-flex w-fit px-2 py-0.5 rounded-full text-[11px] font-semibold border flex-shrink-0 ${style.pill}`}>{style.label}</span>
                  )}
                  <span className="admin-update-title min-w-0 truncate text-sm font-medium text-slate-800">{a.title}</span>
                  <span className="ml-auto text-xs text-slate-500 flex-shrink-0 tabular-nums">{formatDate(a.postedDate)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
