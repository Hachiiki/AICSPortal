'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Menu } from 'lucide-react'
import type { Student, View } from '@/lib/aics/types'
import { STUDENT_MOBILE_NAV } from '@/lib/aics/nav-config'
import { usePortalRoute, type AcademicsTab } from '@/lib/aics/use-portal-route'

const MOBILE_NAV_GRID = 'student-dock-grid grid min-h-[64px] grid-cols-[1fr_1fr_1.5fr_1fr_1fr_1fr] items-stretch px-[4px]'
const MOBILE_NAV_ACTION = 'student-dock-destination my-[4px] flex min-h-[44px] min-w-0 flex-col items-center justify-center gap-[4px] rounded-xl px-[2px] text-center text-xs font-medium leading-tight [overflow-wrap:anywhere] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link motion-safe:transition-[scale,background-color,color] motion-safe:duration-150 motion-safe:active:scale-95'

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
  const dock = useRef<HTMLDivElement>(null)
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  useEffect(() => {
    if (!dock.current) return
    const element = dock.current
    const root = document.documentElement.style
    const updateHeight = () => {
      root.setProperty('--portal-mobile-nav-height', `${element.offsetHeight}px`)
    }
    const observer = new ResizeObserver(updateHeight)
    updateHeight()
    observer.observe(element)
    return () => {
      observer.disconnect()
      root.removeProperty('--portal-mobile-nav-height')
    }
  }, [])
  useEffect(() => {
    const viewport = window.visualViewport
    let baseline = viewport?.height ?? window.innerHeight
    const update = () => {
      const focused = document.activeElement
      // A modal owns focus and covers the dock. Keep its trigger available
      // for focus restoration while the software keyboard is dismissing.
      const editing = focused?.matches('textarea, input:not([type="checkbox"]):not([type="radio"]):not([type="file"])')
        && !focused.closest('[role="dialog"][aria-modal="true"], [data-slot="dialog-content"]')
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
  const primary = active === 'dashboard' || active === 'academics' || active === 'events' || active === 'notifications'
  return <div ref={dock} data-student-mobile-nav="" aria-hidden={keyboardOpen || undefined}
    className={`student-dock-container fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgb(15_23_42/0.04)] sm:hidden ${keyboardOpen ? 'invisible pointer-events-none' : ''}`}>
    <nav aria-label="Student mobile navigation" className={MOBILE_NAV_GRID}>
      {STUDENT_MOBILE_NAV.map(item => {
        const selected = !menuOpen && active === item.view && (item.view !== 'academics' || (item.tab === 'tasks' ? academicTab === 'tasks' : academicTab !== 'tasks'))
        const Icon = item.icon
        return <button key={item.label} type="button" aria-current={selected ? 'page' : undefined} data-tour={item.view === 'academics' && item.tab === 'tasks' ? 'academics-tab-tasks' : undefined}
          className={`${MOBILE_NAV_ACTION} ${selected ? 'bg-blue-50 font-semibold text-link-strong' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-700'}`}
          onClick={() => item.view === 'academics' ? navigate({ view: 'academics', role: 'student', branch: student.branch, username: student.username, tab: item.tab }) : onNavigate(item.view)}>
          <Icon className={`size-[20px] shrink-0 motion-safe:transition-transform ${selected ? 'motion-safe:-translate-y-0.5' : ''}`} strokeWidth={selected ? 2.4 : 2} aria-hidden="true" />
          <span className="max-w-full">{item.label}</span>
        </button>
      })}
      <button type="button" aria-label="Open navigation menu" aria-haspopup="dialog" aria-expanded={menuOpen} aria-controls="mobile-navigation"
        aria-current={!primary && !menuOpen ? 'page' : undefined} data-tour="topbar-mobile-nav"
        className={`${MOBILE_NAV_ACTION} ${menuOpen || !primary ? 'bg-blue-50 text-link-strong' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-700'}`} onClick={onOpenMenu}>
        <Menu className="size-[20px] shrink-0" aria-hidden="true" /><span className="max-w-full">More</span>
      </button>
      <div data-mobile-dock-search="" className="flex min-w-0 items-center justify-center">{search}</div>
    </nav>
  </div>
}
