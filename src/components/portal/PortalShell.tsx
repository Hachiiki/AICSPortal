'use client'

import { useState, type ReactNode } from 'react'
import { motion, MotionConfig } from 'framer-motion'
import type { Student, View } from '@/lib/aics/types'
import type { PortalEvent } from '@/lib/aics/events'
import type { Professor } from '@/lib/aics/professors'
import type { Task } from '@/lib/aics/tasks'
import type { NotificationInbox } from '@/lib/aics/notifications'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { assembleEntrance, useAssembleReveal } from './assemble-entrance'
import { MobileNavigation } from './MobileNavigation'
import { MobileSearch } from './MobileSearch'
import { usePhoneViewport } from '@/lib/aics/use-phone-viewport'
import type { AcademicsTab } from '@/lib/aics/use-portal-route'

interface PortalShellProps {
  student: Student
  active: View
  onNavigate: (view: View) => void
  onLogout: () => void
  events?: PortalEvent[]
  professors?: Professor[]
  tasks?: Task[]
  // Faculty teaching data for the role-aware search index.
  facultyData?: { subjects: any[]; students: any[] } | null
  taskGroups?: { title: string; subjectCode: string }[]
  // Bell inbox bundle.
  inbox?: NotificationInbox
  children: ReactNode
  academicTab?: AcademicsTab
}

// Single portal chrome. Sidebar tabs, top bar, and content offset
// live here so adding a tab never drifts between faculty and student views.
//
// Z-index scale — page content must stay below the Topbar:
//   page content ............ no z-index, or z under 20
//   stacked widgets ......... wrap the widget root in `isolate`,
//                             keep internal z single-digit
//   Topbar (sticky) ......... z-20
//   Sidebar (desktop) ....... z-30
//   DevBanner ............... in normal document flow (top of
//                             <body>; no z-index — never overlays)
//   drawer backdrops ........ z-40
//   drawers, modals,
//   dropdowns, toasts ....... z-50
// Fixed overlays above the Topbar are intentional. Anything else
// painting over the Topbar on scroll is a bug in that widget.
export function PortalShell({
  student,
  active,
  onNavigate,
  onLogout,
  events,
  professors,
  tasks,
  facultyData,
  taskGroups,
  inbox,
  children,
  academicTab,
}: PortalShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const role = student.role ?? 'student'
  const phone = usePhoneViewport()
  // Workspace-assembly entrance (assemble candidate only): staged
  // while the redirect overlay still covers the portal, animated
  // into place when the reveal flips. Null everywhere else — the
  // standard fade-up below is today's behavior, untouched.
  const assembleReveal = useAssembleReveal()
  const entrance = assembleEntrance('content', assembleReveal)

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-dvh bg-slate-50 font-sans [&_input]:text-base [&_textarea]:text-base [&_select]:text-base lg:[&_input]:text-sm lg:[&_textarea]:text-sm lg:[&_select]:text-sm">
      {/* Skip link — first tab stop on every portal page. Jumps past the
          sidebar and topbar to the page content wrapper below. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-link-strong focus:ring-2 focus:ring-blue-500"
      >
        Skip to content
      </a>
      <Sidebar
        role={role}
        active={active}
        onNavigate={onNavigate}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      <div className={`min-w-0 lg:pl-60 ${role === 'student' ? 'pb-[calc(var(--portal-mobile-controls-height,125px)+1rem)] sm:pb-0' : ''}`} inert={mobileNavOpen}>
        <Topbar
          student={student}
          active={active}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onProfile={() => onNavigate('profile')}
          onLogout={onLogout}
          onNavigate={onNavigate}
          events={events}
          professors={professors}
          tasks={tasks}
          facultyData={facultyData}
          taskGroups={taskGroups}
          inbox={inbox}
        />
        {/* Shared entrance transition. Every tab mounts through this
            shell, so all of them fade up the same way instead of each
            page inventing its own. Page-level section animations nest
            inside and keep working. During the post-login assembly the
            entrance comes from assemble-entrance.tsx instead: the real
            chrome (this sidebar, this topbar, this column) animates into
            place as the redirect overlay exits. */}
        {/* Error boundary per view: a render crash in one tab degrades
            to an inline retry card while the sidebar/topbar stay alive;
            resetKey makes navigating away remount the crashed view. */}
        <motion.div
          key={active}
          id="main-content"
          tabIndex={-1}
          initial={assembleReveal ? entrance.initial : { opacity: 0, y: 8 }}
          animate={assembleReveal ? entrance.animate : { opacity: 1, y: 0 }}
          transition={
            assembleReveal
              ? entrance.transition
              : { duration: 0.35, ease: 'easeOut' as const }
          }
        >
          <ErrorBoundary resetKey={String(active)}>
            {children}
          </ErrorBoundary>
        </motion.div>
        {role === 'student' && phone && (
          <MobileNavigation
            student={student}
            active={active}
            academicTab={academicTab}
            menuOpen={mobileNavOpen}
            onOpenMenu={() => setMobileNavOpen(true)}
            onNavigate={onNavigate}
            search={<MobileSearch {...{ student, events, professors, tasks, facultyData, taskGroups, onNavigate }} className="grid size-[48px] place-items-center rounded-full border border-white/30 bg-[#153357] text-white shadow-md shadow-slate-900/20 hover:bg-[#21466a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link focus-visible:ring-offset-2 focus-visible:ring-offset-surface motion-safe:transition-transform motion-safe:active:scale-95" />}
          />
        )}
      </div>
    </div>
    </MotionConfig>
  )
}
