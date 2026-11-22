'use client'

import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useAnimationPreferences } from '@/components/AnimationPreferences'
import { useStudentOnboarding } from '@/components/onboarding/StudentOnboarding'
import type { Student, View } from '@/lib/aics/types'
import type { PortalEvent } from '@/lib/aics/events'
import type { Professor } from '@/lib/aics/professors'
import type { Task } from '@/lib/aics/tasks'
import type { NotificationInbox } from '@/lib/aics/notifications'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { assembleEntrance, useAssembleReveal } from './assemble-entrance'
import { finishFacultyPhoneNavigation, MobileNavigation } from './MobileNavigation'
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
  const [mobileNav, setMobileNav] = useState<'closed' | 'open' | 'closing'>('closed')
  const [profilePanel, setProfilePanel] = useState(false)
  const mobileNavOpen = mobileNav === 'open'
  const mobileNavActive = mobileNav !== 'closed'
  const menuTrigger = useRef<HTMLButtonElement>(null)
  const openMobileNav = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    menuTrigger.current = event.currentTarget
    setProfilePanel(false)
    setMobileNav('open')
  }, [])
  const openMobileProfile = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    menuTrigger.current = event.currentTarget
    setProfilePanel(true)
    setMobileNav('open')
  }, [])
  const closeMobileNav = useCallback(() => setMobileNav('closing'), [])
  const finishClosingMobileNav = useCallback(() => setMobileNav('closed'), [])
  useEffect(() => {
    if (mobileNavActive || !menuTrigger.current) return
    menuTrigger.current.focus({ preventScroll: true })
    menuTrigger.current = null
  }, [mobileNavActive])
  const role = student.role ?? 'student'
  const mainContent = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (role === 'faculty' && mainContent.current) finishFacultyPhoneNavigation(mainContent.current)
  }, [role, active])
  const phone = usePhoneViewport()
  const { mode } = useAnimationPreferences()
  const studentPhone = role === 'student' && phone
  const hasPhoneDock = role === 'student' || role === 'faculty'
  const tourActive = useStudentOnboarding()?.busy ?? false
  // The sign-in overlay coordinates its own reveal of the portal chrome.
  const assembleReveal = useAssembleReveal()
  const entrance = assembleEntrance('content', mode === 'off' ? null : assembleReveal)
  const pageKey = studentPhone && academicTab ? `${active}:${academicTab}` : active
  const motionBlocked = !!assembleReveal || tourActive
  const [pageMotion, setPageMotion] = useState(() => ({ key: pageKey, enabled: !motionBlocked }))
  // Finishing sign-in or dismissing a tour should not replay this route's entrance.
  if (pageMotion.key !== pageKey || (pageMotion.enabled && motionBlocked)) {
    setPageMotion({ key: pageKey, enabled: !motionBlocked })
  }

  return (
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
        mobileActive={mobileNavActive}
        onMobileClose={closeMobileNav}
        onMobileExitComplete={finishClosingMobileNav}
        profile={profilePanel ? student : undefined}
        onLogout={onLogout}
      />
      <div className={`min-w-0 lg:pl-60 ${role === 'student' ? 'student-portal-column' : role === 'faculty' ? 'faculty-portal-column' : ''} ${hasPhoneDock ? 'pb-[calc(var(--portal-mobile-nav-height,65px)+1rem)] sm:pb-0' : ''}`} inert={mobileNavActive}>
        <Topbar
          student={student}
          active={active}
          onOpenMobileNav={openMobileNav}
          onOpenMobileProfile={openMobileProfile}
          mobileProfileOpen={profilePanel && mobileNavOpen}
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
        {/* Error boundary per view: a render crash in one tab degrades
            to an inline retry card while the sidebar/topbar stay alive;
            resetKey makes navigating away remount the crashed view. */}
        <motion.div
          key={pageKey}
          ref={mainContent}
          id="main-content"
          tabIndex={-1}
          data-portal-page-enter={pageMotion.enabled && !motionBlocked ? '' : undefined}
          {...entrance}
        >
          <ErrorBoundary resetKey={String(active)}>
            {children}
          </ErrorBoundary>
        </motion.div>
        {hasPhoneDock && phone && (
          <MobileNavigation
            student={student}
            active={active}
            academicTab={academicTab}
            onNavigate={onNavigate}
            searchProps={{ events, professors, tasks, facultyData, taskGroups }}
          />
        )}
      </div>
    </div>
  )
}
