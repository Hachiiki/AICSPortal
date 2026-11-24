'use client'

import type { ReactNode } from 'react'
import type { Student } from '@/lib/aics/types'
import type { Announcement } from '@/lib/aics/announcements'
import { AnnouncementsDeck } from './AnnouncementsDeck'
import { usePortalRoute } from '@/lib/aics/use-portal-route'
import { useDestinationFocus } from '@/lib/aics/use-destination-focus'

export function AcademicHeader({ student }: { student: Student }) {
  return (
    <DashboardWelcome firstName={student.firstName} semester={student.semester} academicYear={student.academicYear} tour="student-overview">
      <span className="sm:hidden">{student.programShort}</span><span className="hidden sm:inline">{student.program}</span> &bull; {student.yearLevel} &bull; {student.section}
    </DashboardWelcome>
  )
}

export function DashboardWelcome({ firstName, semester, academicYear, tour, children }: {
  firstName: string
  semester: string
  academicYear: string
  tour?: string
  children?: ReactNode
}) {
  return (
    <section
      data-tour={tour}
      className="student-welcome student-card min-w-0 sm:max-lg:row-start-1 lg:col-start-1 lg:row-start-1"
    >
      <div className="flex-1 min-w-0">
        <p className="hidden text-xs font-medium uppercase tracking-[0.12em] text-slate-500 sm:block">
          {semester} &bull; AY {academicYear}
        </p>
        <h1 className="student-welcome-heading max-sm:font-[650] text-xl font-bold leading-tight tracking-tight text-blue-950 [overflow-wrap:anywhere] max-sm:text-white min-[360px]:text-2xl sm:mt-1.5 sm:text-3xl">
          Welcome back, {firstName}!
        </h1>
        {children && <p className="student-welcome-identity student-text-detail mt-1.5 text-sm text-slate-600 max-sm:text-white/85">{children}</p>}
      </div>

    </section>
  )
}

export function AcademicTermStats({ student, totalUnits }: { student: Student; totalUnits: number }) {
  return (
    <DashboardSummary title="Academic summary" regionLabel="Term summary" semester={student.semester} academicYear={student.academicYear}
      identity={<>{student.programShort} &middot; {student.yearLevel} &middot; {student.section}</>}
      stats={[
        { label: 'Overall GPA', value: student.gpa },
        { label: 'Units', value: String(totalUnits) },
        { label: 'Subjects', value: String(student.subjects.length) },
        { label: 'Standing', value: student.deanLister ? "Dean's Lister" : 'Regular', accent: student.deanLister },
      ]}
    />
  )
}

export function DashboardSummary({ title, regionLabel, semester, academicYear, identity, stats }: {
  title: string
  regionLabel?: string
  semester: string
  academicYear: string
  identity?: ReactNode
  stats: Array<{ label: string; value: string; accent?: boolean }>
}) {
  return (
    <section className="student-overview min-w-0 sm:max-lg:row-start-3 lg:col-start-1 lg:row-start-2" aria-label={regionLabel ?? title}>
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 sm:hidden">
        <h2 className="student-section-title text-lg font-bold tracking-tight text-ink">{title}</h2>
        <p className="text-xs font-medium text-muted-fg">{semester} &middot; <span className="inline-block">AY {academicYear}</span></p>
      </div>
      {identity && <p className="student-term-identity mb-2 hidden text-sm text-muted-fg">{identity}</p>}
      <dl className="student-overview-stats student-card grid grid-cols-[1.25fr_0.65fr_0.95fr_1.15fr] items-end gap-x-3 gap-y-2 max-sm:rounded-xl max-sm:border max-sm:border-line max-sm:bg-surface max-sm:p-[12px] sm:flex sm:flex-wrap sm:gap-x-6 sm:gap-y-3 sm:[&>div+div]:border-l sm:[&>div+div]:border-line sm:[&>div+div]:pl-6">
        {stats.map(stat => <Stat key={stat.label} {...stat} />)}
      </dl>
    </section>
  )
}

export function AcademicAnnouncements({ student, announcements, announcementReadIds }: {
  student: Student
  announcements?: Announcement[]
  announcementReadIds?: string[]
}) {
  const { route } = usePortalRoute()
  const faculty = student.role === 'faculty'
  const id = faculty ? 'faculty-announcements' : 'student-announcements'
  useDestinationFocus(id, route.view === 'dashboard' && route.focus === 'announcements')
  return (
      <section id={id} tabIndex={-1} data-tour={faculty ? undefined : 'student-announcements'} aria-label="Campus announcements" className="min-w-0 scroll-mt-16 sm:scroll-mt-36 lg:col-start-2 lg:row-span-2 lg:row-start-1">
      {announcements && announcements.length > 0 ? (
        <AnnouncementsDeck announcements={announcements} username={student.username} readIds={announcementReadIds} />
      ) : <div className="student-card rounded-xl border border-border bg-surface p-5 text-ink"><h2 className="student-section-title text-sm font-semibold">Announcements</h2><p className="mt-2 text-sm text-muted-fg">No announcements right now. Check here for campus updates.</p></div>}
      </section>
  )
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-fg">
        {label}
      </dt>
      {/* Exact pre-Stage-2B light hexes (v4 oklch palette shades render
          differently); dark: variants re-theme via the bridge/tokens. */}
      <dd
        className={`mt-0.5 text-base font-bold max-sm:font-[650] leading-tight tabular-nums [overflow-wrap:anywhere] sm:text-xl ${
          accent
            ? 'text-[#1d4ed8] dark:text-link-strong'
            : 'text-[#0f172a] dark:text-slate-900'
        }`}
      >
        {value}
      </dd>
    </div>
  )
}
