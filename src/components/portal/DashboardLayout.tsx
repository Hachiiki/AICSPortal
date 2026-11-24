import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import type { Course, Session } from '@/lib/schedule'
import { ScheduleGrid } from './ScheduleGrid'
import { TodaysClasses } from './TodaysClasses'

export function DashboardLayout({
  welcome, summary, today, gettingStarted, announcements, subjects,
  detailsLabel, onDetails, scheduleId, courses, sessions,
}: {
  welcome: ReactNode
  summary: ReactNode
  today: ReactNode
  gettingStarted?: ReactNode
  announcements: ReactNode
  subjects: ReactNode
  detailsLabel: string
  onDetails: () => void
  scheduleId: string
  courses: Course[]
  sessions: Session[]
}) {
  return (
    <main className="dashboard-home min-w-0 sm:grid sm:grid-cols-1 sm:gap-6 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1fr)_470px] lg:gap-8 lg:px-8 lg:py-8">
      <div data-portal-motion-group className="student-dashboard-hero sm:contents">
        {welcome}
        {summary}
      </div>

      <div data-portal-motion-group className="student-dashboard-panel min-w-0 max-sm:space-y-5 max-sm:px-4 sm:contents">
        <div data-portal-motion-group className="student-dashboard-intro grid grid-cols-1 gap-4 sm:contents">
          <div className="min-w-0 sm:max-lg:row-start-2 lg:col-span-2 lg:row-start-3">{today}</div>
          {gettingStarted && <div className="min-w-0 empty:hidden lg:col-span-2 lg:row-start-4">{gettingStarted}</div>}
          {announcements}
        </div>

        <div className="min-w-0 lg:col-span-2">{subjects}</div>
        <div className="flex justify-end lg:col-span-2">
          <button type="button" onClick={onDetails} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-link hover:text-link-strong hover:underline">
            {detailsLabel} <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>

        <section id={scheduleId} aria-label="Class schedule" tabIndex={-1} className="flex scroll-mt-16 flex-col gap-4 lg:col-span-2 lg:flex-row lg:scroll-mt-20">
          <ScheduleGrid courses={courses} sessions={sessions} />
          <div className="order-first lg:order-last lg:w-[320px] lg:shrink-0"><TodaysClasses courses={courses} sessions={sessions} /></div>
        </section>
      </div>
    </main>
  )
}

export function DashboardSubjectsCard({ title, detail, children }: { title: string; detail: string; children: ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
      className="student-card bg-surface rounded-xl border border-slate-200 shadow-sm"
    >
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="student-section-title text-base font-semibold text-slate-900">{title}</h2>
        <p className="student-text-detail text-xs text-slate-500 mt-0.5">{detail}</p>
      </div>
      {children}
    </motion.section>
  )
}
