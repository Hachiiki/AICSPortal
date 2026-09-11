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
}: PortalShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const role = student.role ?? 'student'

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-dvh bg-slate-50 font-sans">
      {/* Skip link — first tab stop on every portal page. Jumps past the
          sidebar and topbar to the page content wrapper below. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-blue-700 focus:ring-2 focus:ring-blue-500"
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
      <div className="lg:pl-60">
        <Topbar
          student={student}
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
            inside and keep working. */}
        <motion.div
          key={active}
          id="main-content"
          tabIndex={-1}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </div>
    </div>
    </MotionConfig>
  )
}
