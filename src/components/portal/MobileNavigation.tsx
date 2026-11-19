'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useAnimate } from 'framer-motion'
import { Menu, Presentation, X } from 'lucide-react'
import * as Dropdown from '@radix-ui/react-dropdown-menu'
import { useAnimationPreferences, type AnimationMode } from '@/components/AnimationPreferences'
import type { Student, View } from '@/lib/aics/types'
import { getPrimaryNav, SECONDARY_NAV, STUDENT_MOBILE_NAV } from '@/lib/aics/nav-config'
import { usePortalRoute, type AcademicsTab } from '@/lib/aics/use-portal-route'

const MOBILE_NAV_ACTION = 'relative isolate grid min-h-[44px] min-w-[44px] place-items-center rounded-full text-ink active:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-link motion-safe:transition-[scale,background-color,color] motion-safe:duration-150 motion-safe:active:scale-95'
const ACTIVE_NAV_ACTION = 'text-link-strong'
const MORE_PAGES = [...getPrimaryNav('student'), ...SECONDARY_NAV].filter(
  item => item.enabled && !STUDENT_MOBILE_NAV.some(destination => destination.view === item.view),
)

function DockHighlight({ mode }: { mode: AnimationMode }) {
  const reducedMotion = mode !== 'full'
  const [surface, animate] = useAnimate<HTMLSpanElement>()

  return <motion.span aria-hidden="true" data-dock-highlight=""
    layoutId={reducedMotion ? undefined : 'student-dock-highlight'}
    className="pointer-events-none absolute inset-0 -z-10"
    transition={{ type: 'spring', stiffness: 430, damping: 29, mass: 0.9 }}
    onLayoutAnimationStart={() => {
      if (reducedMotion || !surface.current) return
      void animate(surface.current, {
        scaleX: [1, 1.1, 1],
        scaleY: [1, 1.055, 1],
      }, { duration: 0.36, times: [0, 0.32, 1], ease: ['easeOut', 'easeInOut'] })
    }}>
    <span ref={surface} className="absolute inset-0 rounded-full bg-blue-50" />
  </motion.span>
}

export function MobileNavigation({ student, active, academicTab, onNavigate, search }: {
  student: Student
  active: View
  academicTab?: AcademicsTab
  onNavigate: (view: View) => void
  search: ReactNode
}) {
  const { navigate } = usePortalRoute()
  const { mode } = useAnimationPreferences()
  const dock = useRef<HTMLDivElement>(null)
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
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
      const open = !!editing && !!viewport && viewport.height < baseline * 0.75
      setKeyboardOpen(open)
      if (open) setMenuOpen(false)
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
          {selected && <DockHighlight key={mode} mode={mode} />}
          <Icon className="size-[23px]" strokeWidth={selected ? 2.4 : 2} aria-hidden="true" />
          <span className="student-floating-label sr-only">{item.label}</span>
        </button>
      })}
      <Dropdown.Root modal={false} open={menuOpen && !keyboardOpen} onOpenChange={setMenuOpen}>
      <Dropdown.Trigger asChild>
      <button type="button" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-current={!primary && !menuOpen ? 'page' : undefined} data-tour="topbar-mobile-nav"
        className={`${MOBILE_NAV_ACTION} ${moreSelected ? ACTIVE_NAV_ACTION : 'hover:bg-slate-100'}`}>
        {moreSelected && <DockHighlight key={mode} mode={mode} />}
        {menuOpen ? <X className="size-[23px]" aria-hidden="true" /> : <Menu className="size-[23px]" strokeWidth={moreSelected ? 2.4 : 2} aria-hidden="true" />}
        <span className="student-floating-label sr-only">More</span>
      </button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content aria-label="More pages" aria-labelledby={undefined} side="top" align="end" sideOffset={13} collisionPadding={12} loop
          className="student-more-popover z-50 grid max-w-[calc(100vw-24px)] grid-cols-6 gap-[8px] rounded-3xl border border-line bg-surface/95 p-[12px] shadow-xl backdrop-blur-xl">
          {MORE_PAGES.map((item, index) => {
            const Icon = item.view === 'professors' ? Presentation : item.icon
            return <Dropdown.Item key={item.view} aria-label={item.label} data-destination-label={item.label}
              onSelect={() => onNavigate(item.view)}
              className={`student-more-item relative col-span-2 grid size-[48px] cursor-pointer place-items-center rounded-2xl outline-none transition-colors data-highlighted:bg-blue-100 data-highlighted:text-link-strong ${active === item.view ? 'bg-blue-100 text-link-strong' : 'bg-slate-100 text-ink'} ${index === 3 ? 'col-start-2' : ''}`}>
              <Icon className="size-5" aria-hidden="true" />
            </Dropdown.Item>
          })}
        </Dropdown.Content>
      </Dropdown.Portal>
      </Dropdown.Root>
    </nav>
    {search}
    </div>
  </div>
}
