'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
} from 'lucide-react'
import type { View } from '@/lib/aics/types'
import {
  SECONDARY_NAV,
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

interface SidebarProps {
  active: View
  onNavigate: (view: View) => void
  /** Mobile drawer open state (below lg) */
  mobileOpen: boolean
  onMobileClose: () => void
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

function SidebarContent({ active, onNavigate, role = 'student' }: { active: View; onNavigate: (v: View) => void; role?: string }) {
  const primaryNav = getPrimaryNav(role)
  const portalLabel = getPortalLabel(role)
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Brand */}
      <div className="px-4 py-5 pr-12 lg:pr-4 flex items-center gap-3 border-b border-slate-100">
        <img src="/aics-logo.svg" alt="" aria-hidden="true" className="w-10 h-10 flex-shrink-0" />
        <div className="leading-tight min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-link-strong">
            {portalLabel}
          </p>
          <p className="text-sm font-bold text-slate-900 leading-snug">
            Asian Institute of Computer Studies
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label={getPortalAria(role)}>
        {primaryNav.map((item) => (
          <NavButton
            key={item.view}
            item={item}
            active={active === item.view}
            onClick={() => onNavigate(item.view)}
          />
        ))}

        <div className="my-4 border-t border-slate-100" />

        {SECONDARY_NAV.map((item) => (
          <NavButton
            key={item.view}
            item={item}
            active={active === item.view}
            onClick={() => onNavigate(item.view)}
          />
        ))}
      </nav>

      {/* Footer — matches the repository's documented licensing
          (LICENSE / README: All Rights Reserved, proprietary) and links
          the legal pages required in-app. Opens in a new tab so the SPA
          session is not unmounted. */}
      <footer className="px-4 py-4 border-t border-slate-100">
        <p className="text-[11px] text-slate-500 leading-relaxed">
          &copy; {new Date().getFullYear()} {LEGAL.operatorName} · All Rights Reserved.
        </p>
        <nav aria-label="Legal" className="mt-2 flex flex-wrap gap-x-2.5 gap-y-1">
          {POLICY_PAGES.map((p) => (
            <a
              key={p.href}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-slate-500 underline underline-offset-2 hover:text-slate-700"
            >
              {p.label}
            </a>
          ))}
          <CookieSettingsButton className="text-[11px] text-slate-500 underline underline-offset-2 hover:text-slate-700" />
        </nav>
      </footer>
    </div>
  )
}

export function Sidebar({ active, onNavigate, mobileOpen, onMobileClose, role }: SidebarProps) {
  // Workspace-assembly entrance (assemble candidate only): the real
  // rail slides in from the left when the reveal flips. Inactive —
  // including normal navigation — the aside mounts at rest, exactly
  // the element it was before (initial: false renders no entrance).
  const assembleReveal = useAssembleReveal()
  const entrance = assembleEntrance('sidebar', assembleReveal)
  // The shared DialogPanel owns focus entry, Tab trapping and restoration.
  useEffect(() => {
    if (!mobileOpen) return
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
  }, [mobileOpen, onMobileClose])

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
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-scrim/40 z-40 lg:hidden"
              onClick={onMobileClose}
              aria-hidden="true"
            />
            {/* Drawer */}
            <DialogPanel
              id="mobile-navigation"
              onClose={onMobileClose}
              initial={{ x: -264 }}
              animate={{ x: 0 }}
              exit={{ x: -264 }}
              transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
              className="fixed top-0 left-0 h-dvh w-72 max-w-[calc(100vw-32px)] bg-surface border-r border-slate-200 z-50 lg:hidden flex flex-col outline-none pb-[env(safe-area-inset-bottom)]"
              aria-label="Navigation menu"
            >
              {/* Close button */}
              <button
                type="button"
                onClick={onMobileClose}
                aria-label="Close navigation menu"
                className="absolute top-3 right-2 size-11 grid place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <X className="w-5 h-5" />
              </button>
              <SidebarContent
                active={active}
                onNavigate={(v) => {
                  onNavigate(v)
                  onMobileClose()
                }}
                role={role}
              />
            </DialogPanel>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
