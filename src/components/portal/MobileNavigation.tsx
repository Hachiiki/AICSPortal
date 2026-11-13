'use client'

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Menu } from 'lucide-react'
import type { Student, View } from '@/lib/aics/types'
import { STUDENT_MOBILE_NAV } from '@/lib/aics/nav-config'
import { usePortalRoute, type AcademicsTab } from '@/lib/aics/use-portal-route'

const MOBILE_NAV_ACTION = 'relative isolate grid min-h-[44px] min-w-[44px] place-items-center rounded-full text-ink active:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-link motion-safe:transition-[scale,background-color,color] motion-safe:duration-150 motion-safe:active:scale-95'
const ACTIVE_NAV_ACTION = 'text-link-strong'

export function MobileNavigation({ student, active, academicTab, menuOpen, onOpenMenu, onNavigate, search }: {
  student: Student
  active: View
  academicTab?: AcademicsTab
  menuOpen: boolean
  onOpenMenu: (event: MouseEvent<HTMLButtonElement>) => void
  onNavigate: (view: View) => void
  search: ReactNode
}) {
  const { navigate } = usePortalRoute()
  const reducedMotion = useReducedMotion()
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
  const primary = active === 'notifications' || STUDENT_MOBILE_NAV.some(item => item.view === active)
  const moreSelected = menuOpen || !primary
  const activePill = <motion.span aria-hidden="true" data-dock-highlight=""
    layoutId={reducedMotion ? undefined : 'student-dock-highlight'}
    className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-blue-50"
    transition={{ type: 'spring', stiffness: 500, damping: 39 }} />
  return <div ref={dock} data-student-mobile-nav="" aria-hidden={keyboardOpen || undefined}
    className={`pointer-events-none fixed inset-x-0 bottom-0 z-20 pl-[max(12px,env(safe-area-inset-left))] pr-[max(12px,env(safe-area-inset-right))] pb-[calc(10px+env(safe-area-inset-bottom))] sm:hidden ${keyboardOpen ? 'invisible' : ''}`}>
    <div aria-hidden="true" className="student-floating-backdrop" />
    <div className="student-floating-nav relative mx-auto flex w-full max-w-[440px] items-center gap-[12px]">
    <nav aria-label="Student mobile navigation" className="student-floating-pill pointer-events-auto grid min-w-0 flex-1 grid-cols-4 gap-[2px] rounded-full border border-line bg-surface/90 p-[4px] shadow-[0_6px_22px_rgb(15_23_42/0.12)] backdrop-blur-md">
      {STUDENT_MOBILE_NAV.map(item => {
        const selected = !menuOpen && active === item.view && (item.view !== 'academics' || (item.tab === 'tasks' ? academicTab === 'tasks' : academicTab !== 'tasks'))
        const Icon = item.icon
        return <button key={item.label} type="button" aria-current={selected ? 'page' : undefined} data-tour={item.view === 'academics' && item.tab === 'tasks' ? 'academics-tab-tasks' : undefined}
          className={`${MOBILE_NAV_ACTION} ${selected ? ACTIVE_NAV_ACTION : 'hover:bg-slate-100'}`}
          onClick={() => item.view === 'academics' ? navigate({ view: 'academics', role: 'student', branch: student.branch, username: student.username, tab: item.tab }) : onNavigate(item.view)}>
          {selected && activePill}
          <Icon className="size-[23px]" strokeWidth={selected ? 2.4 : 2} aria-hidden="true" />
          <span className="student-floating-label sr-only">{item.label}</span>
        </button>
      })}
      <button type="button" aria-label="Open navigation menu" aria-haspopup="dialog" aria-expanded={menuOpen} aria-controls="mobile-navigation"
        aria-current={!primary && !menuOpen ? 'page' : undefined} data-tour="topbar-mobile-nav"
        className={`${MOBILE_NAV_ACTION} ${moreSelected ? ACTIVE_NAV_ACTION : 'hover:bg-slate-100'}`} onClick={onOpenMenu}>
        {moreSelected && activePill}
        <Menu className="size-[23px]" strokeWidth={moreSelected ? 2.4 : 2} aria-hidden="true" />
        <span className="student-floating-label sr-only">More</span>
      </button>
    </nav>
    {search}
    </div>
  </div>
}
