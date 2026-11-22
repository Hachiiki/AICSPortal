'use client'

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ComponentProps } from 'react'
import { flushSync } from 'react-dom'
import { AnimatePresence, motion, useAnimate } from 'framer-motion'
import { Menu, Moon, PanelBottomOpen, Presentation, Sun, X } from 'lucide-react'
import * as Dropdown from '@radix-ui/react-dropdown-menu'
import { useTheme } from 'next-themes'
import { useAnimationPreferences, type AnimationMode } from '@/components/AnimationPreferences'
import { useStudentOnboarding } from '@/components/onboarding/StudentOnboarding'
import type { Student, View } from '@/lib/aics/types'
import { getMobileNav, getPrimaryNav, SECONDARY_NAV } from '@/lib/aics/nav-config'
import { quickToggleTheme } from '@/lib/aics/theme-palette'
import { useMounted } from '@/lib/aics/use-mounted'
import { routeToPath, usePortalRoute, type AcademicsTab } from '@/lib/aics/use-portal-route'
import { MobileSearch } from './MobileSearch'

const MOBILE_NAV_ACTION = 'relative isolate grid min-h-[44px] min-w-[44px] place-items-center rounded-full text-ink active:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-link motion-safe:transition-[scale,background-color,color] motion-safe:duration-150 motion-safe:active:scale-95'
const FLOATING_BUTTON = 'pointer-events-auto grid size-[52px] shrink-0 place-items-center rounded-full border border-line bg-surface/90 text-ink shadow-[0_6px_22px_rgb(15_23_42/0.12)] backdrop-blur-md hover:bg-blue-50 hover:text-link-strong active:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-link'
const DOCK_SPRING = { type: 'spring', stiffness: 420, damping: 30, mass: 0.82 } as const
const SCROLL_THRESHOLD = 8
const ACTIVE_NAV_ACTION = 'text-link-strong'
const MORE_ACTION = 'student-more-item relative col-span-2 grid size-[48px] cursor-pointer place-items-center rounded-2xl outline-none transition-colors data-highlighted:bg-blue-100 data-highlighted:text-link-strong'

const FACULTY_MORE_ACTION = 'flex min-h-11 min-w-0 cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium leading-snug outline-none [overflow-wrap:anywhere] data-highlighted:bg-blue-100 data-highlighted:text-link-strong'

function scrollLimit() {
  return Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
}

function readScrollPosition(limit = scrollLimit()) {
  return Math.max(0, Math.min(window.scrollY, limit))
}

function focusDock(dock: Element | null) {
  const destination = dock?.querySelector<HTMLButtonElement>('[aria-current="page"]') ?? dock?.querySelector('button')
  destination?.focus({ preventScroll: true })
}

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

export function MobileNavigation({ student, active, academicTab, onNavigate, searchProps }: {
  student: Student
  active: View
  academicTab?: AcademicsTab
  onNavigate: (view: View) => void
  searchProps: Omit<ComponentProps<typeof MobileSearch>, 'className' | 'onOpenChange' | 'student' | 'onNavigate'>
}) {
  const { navigate, route } = usePortalRoute()
  const { mode } = useAnimationPreferences()
  const { resolvedTheme, setTheme } = useTheme()
  const themeMounted = useMounted()
  const isDark = themeMounted && resolvedTheme === 'dark'
  const themeAction = isDark ? 'Switch to light theme' : 'Switch to dark theme'
  const themeButton = useRef<HTMLDivElement>(null)
  const themeReveal = useRef<ViewTransition | null>(null)
  const guided = useStudentOnboarding()?.busy ?? false
  const navId = useId()
  const dock = useRef<HTMLDivElement>(null)
  const fullDock = useRef<HTMLDivElement>(null)
  const expandButton = useRef<HTMLButtonElement>(null)
  const restoreNavFocus = useRef(false)
  const scroll = useRef({ position: 0, travel: 0 })
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [foldedScale, setFoldedScale] = useState(0.16)
  const routeKey = routeToPath(route)
  const [foldedOn, setFoldedOn] = useState<string | null>(null)
  if (foldedOn !== null && (foldedOn !== routeKey || guided)) setFoldedOn(null)
  const keepExpanded = guided || menuOpen || searchOpen || keyboardOpen
  const folded = foldedOn === routeKey && !keepExpanded
  const spatialMotion = mode === 'full'
  const fade = { duration: mode === 'off' ? 0 : 0.12 }
  const expandDock = useCallback(() => {
    scroll.current = { position: readScrollPosition(), travel: 0 }
    setFoldedOn(null)
  }, [])
  const changeSearchOpen = useCallback((open: boolean) => {
    if (open) expandDock()
    setSearchOpen(open)
  }, [expandDock])

  function toggleTheme() {
    if (themeReveal.current) return
    const button = themeButton.current
    if (!spatialMotion || !button || !document.startViewTransition) {
      quickToggleTheme(resolvedTheme, setTheme)
      return
    }

    const { left, top, width, height } = button.getBoundingClientRect()
    const x = left + width / 2
    const y = top + height / 2
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
    const root = document.documentElement
    root.classList.add('portal-theme-reveal')
    const transition = document.startViewTransition(() => {
      flushSync(() => quickToggleTheme(resolvedTheme, setTheme))
    })
    themeReveal.current = transition
    void transition.ready.then(() => {
      root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] }, {
        pseudoElement: '::view-transition-new(root)',
        duration: 480,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'both',
      })
    }).catch(() => {})
    const finish = () => {
      themeReveal.current = null
      root.classList.remove('portal-theme-reveal')
    }
    void transition.finished.then(finish, finish)
  }

  useEffect(() => {
    const element = dock.current
    const row = fullDock.current
    const button = expandButton.current
    if (!element || !row || !button) return
    const root = document.documentElement.style
    const updateHeight = () => {
      root.setProperty('--portal-mobile-nav-height', `${element.offsetHeight}px`)
      if (row.offsetWidth) setFoldedScale(button.offsetWidth / row.offsetWidth)
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
    scroll.current = { position: readScrollPosition(), travel: 0 }
    const update = () => {
      const limit = scrollLimit()
      const position = readScrollPosition(limit)
      const tracker = scroll.current
      const delta = position - tracker.position
      tracker.position = position
      if (position === 0 || limit - position <= 2 || keepExpanded) {
        tracker.travel = 0
        setFoldedOn(null)
        return
      }
      if (!delta) return
      tracker.travel = Math.sign(delta) === Math.sign(tracker.travel) ? tracker.travel + delta : delta
      if (Math.abs(tracker.travel) < SCROLL_THRESHOLD) return
      tracker.travel = 0
      if (delta > 0 && fullDock.current?.querySelector(':focus-visible')) return
      setFoldedOn(delta > 0 ? routeKey : null)
    }
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [keepExpanded, routeKey])

  useEffect(() => {
    if (folded || !restoreNavFocus.current) return
    restoreNavFocus.current = false
    if (document.activeElement !== document.body && document.activeElement !== expandButton.current) return
    focusDock(fullDock.current)
  }, [folded])

  useLayoutEffect(() => () => {
    if (!restoreNavFocus.current) return
    // Each view can mount its own shell. Hand focus to the replacement dock.
    window.requestAnimationFrame(() => {
      if (document.activeElement !== document.body) return
      focusDock(document.querySelector('[data-student-mobile-nav]:not([inert]) [data-folded-dock]:not([inert])'))
    })
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
  const faculty = student.role === 'faculty'
  const role = faculty ? 'faculty' : 'student'
  const destinations = getMobileNav(role)
  const morePages = [...getPrimaryNav(role), ...SECONDARY_NAV].filter(
    (item) => item.enabled && !destinations.some(({ view }) => view === item.view),
  )
  const primary = (!faculty && active === 'notifications') || destinations.some((item) => item.view === active)
  const moreSelected = menuOpen || !primary
  return <div ref={dock} data-student-mobile-nav="" data-dock-folded={folded} inert={keyboardOpen}
    className={`pointer-events-none fixed inset-x-0 bottom-0 z-20 pl-[max(12px,env(safe-area-inset-left))] pr-[max(12px,env(safe-area-inset-right))] pb-[calc(10px+env(safe-area-inset-bottom))] sm:hidden ${keyboardOpen ? 'invisible' : ''}`}>
    <motion.div aria-hidden="true" className="student-floating-backdrop" initial={false} animate={{ opacity: folded ? 0 : 1 }} transition={fade} />
    <div className="student-floating-nav relative mx-auto w-full max-w-[440px]">
    <motion.div ref={fullDock} id={navId} data-folded-dock="" inert={folded}
      className="flex items-center gap-[12px]" style={{ originX: 0 }} initial={false}
      animate={{ scaleX: folded && spatialMotion ? foldedScale : 1, opacity: folded ? 0 : 1 }}
      transition={{ scaleX: spatialMotion ? DOCK_SPRING : { duration: 0 }, opacity: { ...fade, delay: folded && spatialMotion ? 0.06 : 0 } }}>
    <nav aria-label={faculty ? 'Faculty mobile navigation' : 'Student mobile navigation'} data-faculty-dock={faculty ? '' : undefined} className="student-floating-pill pointer-events-auto grid min-w-0 flex-1 grid-cols-4 gap-[2px] rounded-full border border-line bg-surface/90 p-[4px] shadow-[0_6px_22px_rgb(15_23_42/0.12)] backdrop-blur-md">
      {destinations.map(item => {
        const selected = !menuOpen && active === item.view && (item.view !== 'academics' || (item.tab === 'tasks' ? academicTab === 'tasks' : academicTab !== 'tasks'))
        const Icon = item.icon
        return <button key={item.label} type="button" aria-current={selected ? 'page' : undefined} data-tour={item.view === 'academics' && item.tab === 'tasks' ? 'academics-tab-tasks' : undefined}
          className={`${MOBILE_NAV_ACTION} ${selected ? ACTIVE_NAV_ACTION : 'hover:bg-slate-100'}`}
          onClick={() => item.view === 'academics' && item.tab ? navigate({ view: 'academics', role, branch: student.branch, username: student.username, tab: item.tab }) : onNavigate(item.view)}>
          {selected && <DockHighlight key={mode} mode={mode} />}
          <Icon className="size-[23px]" strokeWidth={selected ? 2.4 : 2} aria-hidden="true" />
          <span className={faculty ? 'faculty-dock-label' : 'student-floating-label sr-only'}>{item.label}</span>
        </button>
      })}
      <Dropdown.Root modal={false} open={menuOpen && !keyboardOpen} onOpenChange={setMenuOpen}>
      <Dropdown.Trigger asChild>
      <button type="button" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-current={!primary && !menuOpen ? 'page' : undefined} data-tour="topbar-mobile-nav"
        className={`${MOBILE_NAV_ACTION} ${moreSelected ? ACTIVE_NAV_ACTION : 'hover:bg-slate-100'}`}>
        {moreSelected && <DockHighlight key={mode} mode={mode} />}
        {menuOpen ? <X className="size-[23px]" aria-hidden="true" /> : <Menu className="size-[23px]" strokeWidth={moreSelected ? 2.4 : 2} aria-hidden="true" />}
        <span className={faculty ? 'faculty-dock-label' : 'student-floating-label sr-only'}>More</span>
      </button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content aria-label="More pages" aria-labelledby={undefined} side="top" align="end" sideOffset={13} collisionPadding={12} loop
          className={`student-more-popover z-50 grid max-w-[calc(100vw-24px)] gap-2 rounded-3xl border border-line bg-surface/95 p-3 shadow-xl backdrop-blur-xl ${faculty ? "w-72 grid-cols-2 max-h-[min(60dvh,var(--radix-dropdown-menu-content-available-height))] overflow-y-auto" : "grid-cols-6"}`}>
          {morePages.map((item) => {
            const Icon = item.view === 'professors' ? Presentation : item.icon
            return <Dropdown.Item key={item.view} aria-label={item.label} data-destination-label={item.label}
              onSelect={() => onNavigate(item.view)}
              className={`${faculty ? FACULTY_MORE_ACTION : MORE_ACTION} ${active === item.view ? 'bg-blue-100 text-link-strong' : 'bg-slate-100 text-ink'}`}>
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              {faculty && <span>{item.label}</span>}
            </Dropdown.Item>
          })}
          <Dropdown.Item ref={themeButton} aria-label={themeAction} data-destination-label={themeAction}
            className={`${faculty ? FACULTY_MORE_ACTION : MORE_ACTION} bg-slate-100 text-ink`}
            onSelect={(event) => {
              event.preventDefault()
              toggleTheme()
            }}>
            <span className="relative size-5" aria-hidden="true">
              <AnimatePresence initial={false}>
                <motion.span key={isDark ? 'moon' : 'sun'} className="absolute inset-0"
                  initial={{ opacity: 0, rotate: -40, scale: 0.8 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 40, scale: 0.8 }}
                  transition={{ duration: mode === 'full' ? 0.22 : 0, ease: 'easeOut' }}>
                  {isDark ? <Moon className="size-5" /> : <Sun className="size-5" />}
                </motion.span>
              </AnimatePresence>
            </span>
            {faculty && <span>{isDark ? 'Light mode' : 'Dark mode'}</span>}
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Portal>
      </Dropdown.Root>
    </nav>
    <MobileSearch {...searchProps} student={student} onNavigate={onNavigate}
      className={`${FLOATING_BUTTON} motion-safe:transition-[scale,background-color,color] motion-safe:duration-150 motion-safe:active:scale-95`}
      onOpenChange={changeSearchOpen} />
    </motion.div>
    <motion.button
      ref={expandButton}
      type="button"
      aria-label="Show navigation"
      aria-controls={navId}
      aria-expanded={folded ? false : true}
      inert={!folded}
      className={`${FLOATING_BUTTON} absolute left-0 top-1/2 -translate-y-1/2`}
      initial={false}
      animate={{ opacity: folded ? 1 : 0, scale: spatialMotion && !folded ? 0.78 : 1 }}
      transition={{ scale: spatialMotion ? DOCK_SPRING : { duration: 0 }, opacity: fade }}
      whileTap={spatialMotion ? { scale: 0.9 } : undefined}
      onFocus={() => { restoreNavFocus.current = true }}
      onBlur={event => {
        // History traversal can blur the button before popstate is dispatched.
        if (!event.currentTarget.inert && window.location.pathname + window.location.search === routeKey) {
          restoreNavFocus.current = false
        }
      }}
      onClick={event => {
        restoreNavFocus.current = event.detail === 0
        expandDock()
      }}
    >
      <PanelBottomOpen className="size-[22px] text-link-strong" aria-hidden="true" />
    </motion.button>
    </div>
  </div>
}
