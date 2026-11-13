'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence, useDragControls, useReducedMotion } from 'framer-motion'
import {
  X,
  Moon,
  Sun,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { quickToggleTheme } from '@/lib/aics/theme-palette'
import { useMounted } from '@/lib/aics/use-mounted'
import type { View } from '@/lib/aics/types'
import {
  SECONDARY_NAV,
  STUDENT_MOBILE_NAV,
  getPortalAria,
  getPortalLabel,
  getPrimaryNav,
  type NavItem,
} from '@/lib/aics/nav-config'
import { assembleEntrance, useAssembleReveal } from './assemble-entrance'
import { CookieSettingsButton } from '@/components/legal/CookieSettingsButton'
import { LEGAL, POLICY_PAGES } from '@/lib/legal/site'
import { useStudentOnboarding } from '@/components/onboarding/StudentOnboarding'
import { getStudentTourUpdate } from '@/lib/onboarding/student-client'
import { DialogPanel } from './DialogPanel'
import { usePhoneViewport } from '@/lib/aics/use-phone-viewport'

interface SidebarProps {
  active: View
  onNavigate: (view: View) => void
  /** Mobile drawer open state (below lg) */
  mobileOpen: boolean
  mobileActive?: boolean
  onMobileClose: () => void
  onMobileExitComplete?: () => void
  /** When 'faculty', shows faculty nav items instead of student ones. */
  role?: 'student' | 'faculty' | 'admin'
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: NavItem
  active: boolean
  onClick: () => void
}) {
  const Icon = item.icon
  const onboarding = useStudentOnboarding()
  const pendingUpdate = item.view === 'help' && onboarding && getStudentTourUpdate(onboarding.state).pending

  // --- Disabled / "coming soon" state ---
  // Colors keep the exact pre-Stage-2B light values (v3 hex literals:
  // v4 oklch palette shades render differently, so the fg stays an
  // arbitrary value like the LoginView footer precedent) while the
  // dark: variants re-theme through the palette bridge.
  if (!item.enabled) {
    return (
      <div
        aria-disabled="true"
        className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium cursor-not-allowed select-none bg-slate-100 text-[#64748b] dark:text-slate-500"
        title="Coming soon"
      >
        <Icon className="w-4 h-4 flex-shrink-0 opacity-50" />
        <span className="truncate flex-1">{item.label}</span>
        <span
          className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-[#64748b] dark:text-slate-500"
        >
          Soon
        </span>
      </div>
    )
  }

  // --- Enabled / clickable state ---
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      aria-label={pendingUpdate ? `${item.label}, student tour update available` : undefined}
      data-tour={`nav-${item.view}`}
      className={`w-full min-h-11 lg:min-h-0 flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        active
          ? 'bg-blue-800 text-white'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="truncate">{item.label}</span>
      {pendingUpdate && <span aria-hidden="true" className="ml-auto size-2 rounded-full bg-current" />}
    </button>
  )
}

function SidebarContent({ active, onNavigate, role = 'student', scrollBody = false }: { active: View; onNavigate: (v: View) => void; role?: string; scrollBody?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useMounted()
  const dark = mounted && resolvedTheme === 'dark'
  const primaryNav = getPrimaryNav(role)
  const portalLabel = getPortalLabel(role)
  return (
    <div className={`flex min-h-0 flex-col ${scrollBody ? '' : 'h-full'}`}>
      {/* Brand */}
      {!scrollBody && <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-5 pr-12 lg:pr-4">
        <img src="/aics-logo.svg" alt="" aria-hidden="true" className="w-10 h-10 flex-shrink-0" />
        <div className="leading-tight min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-link-strong">
            {portalLabel}
          </p>
          <p className="text-sm font-bold text-slate-900 leading-snug">
            Asian Institute of Computer Studies
          </p>
        </div>
      </div>}

      {/* Navigation */}
        <nav className={`px-3 ${scrollBody ? 'py-[2px]' : 'flex-1 space-y-1 overflow-y-auto py-4'}`} aria-label={getPortalAria(role)}>
        {primaryNav.filter(item => !scrollBody || !STUDENT_MOBILE_NAV.some(destination => destination.view === item.view)).map((item) => (
          <NavButton
            key={item.view}
            item={item}
            active={active === item.view}
            onClick={() => onNavigate(item.view)}
          />
        ))}

        <div className={`${scrollBody ? 'my-[2px]' : 'my-4'} border-t border-slate-100`} />

        {SECONDARY_NAV.map((item) => (
          <NavButton
            key={item.view}
            item={item}
            active={active === item.view}
            onClick={() => onNavigate(item.view)}
          />
        ))}
        {role === 'student' && <button type="button" className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link sm:hidden" onClick={() => quickToggleTheme(resolvedTheme, setTheme)}>
          {dark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}<span>{dark ? 'Switch to light theme' : 'Switch to dark theme'}</span>
        </button>}
      </nav>

      {/* Footer — matches the repository's documented licensing
          (LICENSE / README: All Rights Reserved, proprietary) and links
          the legal pages required in-app. Opens in a new tab so the SPA
          session is not unmounted. */}
      <footer className="px-4 py-4 border-t border-slate-100">
        <p className={`${scrollBody ? 'text-xs text-muted-fg' : 'text-[11px] text-slate-500'} leading-relaxed`}>
          &copy; {new Date().getFullYear()} {LEGAL.operatorName} · All Rights Reserved.
        </p>
        <nav aria-label="Legal" className={`mt-2 flex flex-wrap gap-x-2.5 gap-y-1 ${scrollBody ? '[&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_button]:min-h-11' : ''}`}>
          {POLICY_PAGES.map((p) => (
            <a
              key={p.href}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`${scrollBody ? 'text-xs text-muted-fg' : 'text-[11px] text-slate-500'} underline underline-offset-2 hover:text-slate-700`}
            >
              {p.label}
            </a>
          ))}
          <CookieSettingsButton className={`${scrollBody ? 'text-xs text-muted-fg' : 'text-[11px] text-slate-500'} underline underline-offset-2 hover:text-slate-700`} />
        </nav>
      </footer>
    </div>
  )
}

export function Sidebar({ active, onNavigate, mobileOpen, mobileActive = mobileOpen, onMobileClose, onMobileExitComplete, role }: SidebarProps) {
  const phone = usePhoneViewport()
  const phoneSheet = role === 'student' && phone
  const sheetDrag = useDragControls()
  const reducedMotion = useReducedMotion()
  const sheetTransition = {
    duration: reducedMotion ? 0 : 0.28,
    ease: [0.22, 1, 0.36, 1] as const,
  }
  // Workspace-assembly entrance (assemble candidate only): the real
  // rail slides in from the left when the reveal flips. Inactive —
  // including normal navigation — the aside mounts at rest, exactly
  // the element it was before (initial: false renders no entrance).
  const assembleReveal = useAssembleReveal()
  const entrance = assembleEntrance('sidebar', assembleReveal)
  // The shared DialogPanel owns focus entry, Tab trapping and restoration.
  useEffect(() => {
    if (!mobileActive) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const desktop = window.matchMedia('(min-width: 1024px)')
    const closeOnDesktop = () => {
      if (desktop.matches) onMobileClose()
    }
    desktop.addEventListener('change', closeOnDesktop)
    return () => {
      document.body.style.overflow = previousOverflow
      desktop.removeEventListener('change', closeOnDesktop)
    }
  }, [mobileActive, onMobileClose])

  return (
    <>
      {/* Desktop sidebar — fixed, 240px. Always a motion element so
          the assembly entrance never remounts the rail: the reveal
          flips animate targets in place. The mobile drawer below is
          untouched by the entrance. */}
      <motion.aside
        className="hidden lg:flex flex-col fixed top-0 left-0 h-screen w-60 bg-surface border-r border-slate-200 z-30"
        aria-label="Primary"
        initial={entrance.initial}
        animate={entrance.animate}
        transition={entrance.transition}
      >
        <SidebarContent active={active} onNavigate={onNavigate} role={role} />
      </motion.aside>

      {/* Mobile drawer — slide-in below lg */}
      <AnimatePresence onExitComplete={onMobileExitComplete}>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.22 }}
              className="fixed inset-0 bg-scrim/40 z-40 lg:hidden"
              onClick={onMobileClose}
              aria-hidden="true"
            />
            {/* Drawer */}
            <DialogPanel
              id="mobile-navigation"
              onClose={onMobileClose}
              initial={phoneSheet ? { y: '100%', opacity: 0.8 } : { x: -264 }}
              animate={{ x: 0, y: 0, opacity: 1 }}
              exit={phoneSheet ? { y: '100%', opacity: 0.8 } : { x: -264 }}
              transition={phoneSheet ? sheetTransition : { duration: reducedMotion ? 0 : 0.25, ease: 'easeOut' }}
              drag={phoneSheet ? 'y' : false}
              dragControls={sheetDrag}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.65 }}
              dragMomentum={false}
              onDragEnd={(_, info) => {
                if (info.offset.y >= 80 || (info.offset.y >= 30 && info.velocity.y > 600)) onMobileClose()
              }}
              className={`fixed z-50 flex flex-col bg-surface outline-none pb-[env(safe-area-inset-bottom)] lg:hidden ${phoneSheet ? 'inset-x-0 bottom-0 max-h-[min(90dvh,42rem)] overflow-hidden rounded-t-2xl border-t border-line' : 'left-0 top-0 h-dvh w-72 max-w-[calc(100vw-32px)] border-r border-slate-200'}`}
              aria-label="Navigation menu"
            >
              {/* Close button */}
              {!phoneSheet && <button
                type="button"
                onClick={onMobileClose}
                aria-label="Close navigation menu"
                className="absolute top-3 right-2 size-11 grid place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <X className="w-5 h-5" />
              </button>}
              {phoneSheet && (
                <div data-student-sheet-handle="" className="shrink-0 touch-none select-none cursor-grab border-b border-line px-5 pb-[6px] pt-[6px] active:cursor-grabbing"
                  onPointerDown={event => sheetDrag.start(event)}>
                  <span aria-hidden="true" className="mx-auto mb-[3px] block h-[4px] w-[32px] rounded-full bg-slate-300" />
                  <h2 className="text-lg font-bold tracking-tight text-ink">More</h2>
                </div>
              )}
              <div className={`min-h-0 flex-1 ${phoneSheet ? 'overflow-y-auto overscroll-contain' : ''}`}>
                <SidebarContent
                  active={active}
                  onNavigate={(v) => {
                    onNavigate(v)
                    onMobileClose()
                  }}
                  role={role}
                  scrollBody={phoneSheet}
                />
              </div>
              {phoneSheet && (
                <div className="shrink-0 border-t border-line px-[8px] py-[4px]">
                  <button type="button" aria-label="Close navigation menu" onClick={onMobileClose}
                    className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-blue-50 px-3 py-1 text-sm font-semibold text-link-strong focus-visible:outline-2 focus-visible:outline-link">
                    <X className="size-5 shrink-0" aria-hidden="true" /> Close menu
                  </button>
                </div>
              )}
            </DialogPanel>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
