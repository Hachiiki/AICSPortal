'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Menu } from 'lucide-react'
import type { Student, View } from '@/lib/aics/types'
import { STUDENT_MOBILE_NAV } from '@/lib/aics/nav-config'
import { usePortalRoute, type AcademicsTab } from '@/lib/aics/use-portal-route'

export const MOBILE_NAV_GRID = 'grid h-16 grid-cols-[1fr_1fr_1.25fr_1fr_1fr_1fr] px-1'
export const MOBILE_NAV_ACTION = 'group my-1 flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link motion-safe:transition-[scale,background-color,color] motion-safe:duration-150 motion-safe:active:scale-95'

export function MobileNavigation({ student, active, academicTab, menuOpen, onOpenMenu, onNavigate, search }: {
  student: Student
  active: View
  academicTab?: AcademicsTab
  menuOpen: boolean
  onOpenMenu: () => void
  onNavigate: (view: View) => void
  search: ReactNode
}) {
  const { navigate } = usePortalRoute()
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  useEffect(() => {
    const viewport = window.visualViewport
    let baseline = viewport?.height ?? window.innerHeight
    const update = () => {
      const editing = document.activeElement?.matches('textarea, input:not([type="checkbox"]):not([type="radio"]):not([type="file"])')
      if (!editing) baseline = viewport?.height ?? window.innerHeight
      setKeyboardOpen(!!editing && !!viewport && viewport.height < baseline * 0.75)
    }
    viewport?.addEventListener('resize', update)
    document.addEventListener('focusin', update)
    document.addEventListener('focusout', update)
    return () => {
      viewport?.removeEventListener('resize', update)
      document.removeEventListener('focusin', update)
      document.removeEventListener('focusout', update)
    }
  }, [])
  const primary = active === 'dashboard' || active === 'academics' || active === 'events'
  return <nav data-student-mobile-nav="" aria-label="Student mobile navigation" aria-hidden={keyboardOpen || undefined}
    className={`fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgb(15_23_42/0.04)] sm:hidden ${keyboardOpen ? 'invisible pointer-events-none' : ''}`}>
    <div className={MOBILE_NAV_GRID}>
      {STUDENT_MOBILE_NAV.map(item => {
        const selected = !menuOpen && active === item.view && (item.view !== 'academics' || (item.tab === 'tasks' ? academicTab === 'tasks' : academicTab !== 'tasks'))
        const Icon = item.icon
        return <button key={item.label} type="button" aria-current={selected ? 'page' : undefined}
          className={`${MOBILE_NAV_ACTION} ${selected ? 'bg-blue-50 text-link-strong' : 'text-muted-fg hover:bg-slate-100'}`}
          onClick={() => item.view === 'academics' ? navigate({ view: 'academics', role: 'student', branch: student.branch, username: student.username, tab: item.tab }) : onNavigate(item.view)}>
          <Icon className={`size-5 motion-safe:transition-transform ${selected ? 'motion-safe:-translate-y-0.5' : ''}`} strokeWidth={selected ? 2.4 : 2} aria-hidden="true" />
          <span>{item.label}</span>
        </button>
      })}
      {search}
      <button type="button" aria-label="Open navigation menu" aria-haspopup="dialog" aria-expanded={menuOpen} aria-controls="mobile-navigation"
        aria-current={!primary && !menuOpen ? 'page' : undefined} data-tour="topbar-mobile-nav"
        className={`${MOBILE_NAV_ACTION} ${menuOpen || !primary ? 'bg-blue-50 text-link-strong' : 'text-muted-fg hover:bg-slate-100'}`} onClick={onOpenMenu}>
        <Menu className="size-5" aria-hidden="true" /><span>More</span>
      </button>
    </div>
  </nav>
}
