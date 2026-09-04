'use client'

import { useState, type ReactNode } from 'react'
import type { Student, View } from '@/lib/aics/types'
import type { PortalEvent } from '@/lib/aics/events'
import type { Professor } from '@/lib/aics/professors'
import type { Task } from '@/lib/aics/tasks'
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
  children,
}: PortalShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const role = student.role ?? 'student'

  return (
    <div className="min-h-dvh bg-slate-50 font-sans">
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
        />
        {children}
      </div>
    </div>
  )
}
