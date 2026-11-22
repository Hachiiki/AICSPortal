'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { useAnimationPreferences } from '@/components/AnimationPreferences'
import {
  X,
  ChevronRight,
  Moon,
  Sun,
  LogOut,
  User,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { quickToggleTheme } from '@/lib/aics/theme-palette'
import { useMounted } from '@/lib/aics/use-mounted'
import type { Student, View } from '@/lib/aics/types'
import { getInitials } from '@/lib/aics/format'
import { usePortalRoute } from '@/lib/aics/use-portal-route'
import {
  SECONDARY_NAV,
  getMobileNav,
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

const PROFILE_SPRING = { type: 'spring', stiffness: 350, damping: 28, mass: 0.84 } as const
const PROFILE_ROW: Variants = {
  closed: { opacity: 0, x: -12 },
  open: { opacity: 1, x: 0, transition: { x: PROFILE_SPRING, opacity: { duration: 0.17 } } },
}
const PROFILE_ACTION = 'flex min-h-12 w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left text-sm font-medium text-ink hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-link'
const PROFILE_ICON = 'grid size-9 shrink-0 place-items-center rounded-[10px] bg-slate-100 text-muted-fg group-hover:bg-surface'
const PROFILE_DRAWER_WIDTH = 'min(21rem, calc(100% - max(64px, env(safe-area-inset-right))))'

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
  profile?: Student
  onLogout?: () => void
}

function NavButton({
  item,
  active,
  onClick,
  mobileProfile,
}: {
  item: NavItem
  active: boolean
  onClick: () => void
  mobileProfile?: boolean
}) {
  const Icon = item.icon
  const onboarding = useStudentOnboarding()
  const pendingUpdate = item.view === 'help' && onboarding && getStudentTourUpdate(onboarding.state).pending
  const animateRow = useAnimationPreferences().mode === 'full' && mobileProfile

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
    <motion.button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      aria-label={pendingUpdate ? `${item.label}, student tour update available` : undefined}
      data-tour={`nav-${item.view}`}
      variants={animateRow ? PROFILE_ROW : undefined}
      whileTap={animateRow ? { scale: 0.97 } : undefined}
      className={mobileProfile ? `group ${PROFILE_ACTION} ${active ? 'bg-blue-50 font-semibold text-link-strong' : ''}` : `w-full min-h-11 lg:min-h-0 flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        active
          ? 'bg-blue-800 text-white'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <span className={mobileProfile ? `${PROFILE_ICON} ${active ? 'bg-blue-100 text-link-strong' : ''}` : 'shrink-0'}><Icon className="size-4" aria-hidden="true" /></span>
      <span className={mobileProfile ? 'min-w-0 flex-1 [overflow-wrap:anywhere]' : 'truncate'}>{item.label}</span>
      {pendingUpdate && <span aria-hidden="true" className="ml-auto size-2 rounded-full bg-current" />}
      {mobileProfile && <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-fg" />}
    </motion.button>
  )
}

function SidebarContent({ active, onNavigate, role = 'student', profile, onLogout, onAppearance }: {
  active: View; onNavigate: (v: View) => void; role?: string; profile?: Student; onLogout?: () => void; onAppearance?: () => void
}) {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useMounted()
  const dark = mounted && resolvedTheme === 'dark'
  const primaryNav = getPrimaryNav(role)
  const portalLabel = getPortalLabel(role)
  const scrollBody = !!profile
  const phoneDestinations = scrollBody && role !== 'admin' ? getMobileNav(role === 'faculty' ? 'faculty' : 'student') : []
  const animateProfile = useAnimationPreferences().mode === 'full' && scrollBody
  const profileRow = animateProfile ? PROFILE_ROW : undefined
  return (
    <div className={`flex min-h-0 flex-col ${scrollBody ? '' : 'h-full'}`}>
      {/* Brand */}
      {!profile ? <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-5 pr-12 lg:pr-4">
        <img src="/aics-logo.svg" alt="" aria-hidden="true" className="w-10 h-10 flex-shrink-0" />
        <div className="leading-tight min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-link-strong">
            {portalLabel}
          </p>
          <p className="text-sm font-bold text-slate-900 leading-snug">
            Asian Institute of Computer Studies
          </p>
        </div>
      </div> : <motion.div className="relative isolate mx-3 mt-2 flex items-center gap-3 overflow-hidden rounded-[20px] border border-blue-100 bg-blue-50 px-3 py-4" variants={profileRow}>
        <span className="pointer-events-none absolute -right-4 -top-12 -z-10 size-40 rounded-full border border-blue-100" aria-hidden="true" />
        <motion.span aria-hidden="true" className="grid size-[50px] shrink-0 place-items-center overflow-hidden rounded-full bg-blue-700 font-semibold text-white ring-2 ring-surface"
          variants={animateProfile ? { closed: { scale: 0.85, rotate: -8 }, open: { scale: 1, rotate: 0, transition: PROFILE_SPRING } } : undefined}>
          {profile.photoUrl ? <img src={profile.photoUrl} alt="" className="size-full object-cover" /> : getInitials(profile.fullName)}
        </motion.span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold leading-tight tracking-tight text-ink [overflow-wrap:anywhere]">{profile.fullName}</h2>
          <p className="mt-1 text-xs tabular-nums text-muted-fg [overflow-wrap:anywhere]">{role === 'faculty' && 'Faculty · '}{profile.studentNumber || profile.username}</p>
        </div>
      </motion.div>}

      {/* Navigation */}
        <motion.nav className={`px-3 ${scrollBody ? 'space-y-0.5 py-3' : 'flex-1 space-y-1 overflow-y-auto py-4'}`} aria-label={getPortalAria(role)}
          variants={animateProfile ? { open: { transition: { delayChildren: 0.04, staggerChildren: 0.024 } } } : undefined}>
        {profile && <NavButton mobileProfile item={{ view: 'profile', label: 'Profile', icon: User, enabled: true }} active={active === 'profile'} onClick={() => onNavigate('profile')} />}
        {primaryNav.filter(item => !phoneDestinations.some(destination => destination.view === item.view)).map((item) => (
          <NavButton
            key={item.view}
            item={item}
            mobileProfile={scrollBody}
            active={active === item.view}
            onClick={() => onNavigate(item.view)}
          />
        ))}

        <div className={`${scrollBody ? 'mx-2 my-2 border-line' : 'my-4 border-slate-100'} border-t`} />

        {SECONDARY_NAV.map((item) => (
          <NavButton
            key={item.view}
            item={item}
            mobileProfile={scrollBody}
            active={active === item.view}
            onClick={() => onNavigate(item.view)}
          />
        ))}
        {profile && <motion.button type="button" variants={profileRow} whileTap={animateProfile ? { scale: 0.97 } : undefined}
          className={`group ${PROFILE_ACTION}`} onClick={onAppearance}>
          <span className={PROFILE_ICON}><Sun className="size-4" aria-hidden="true" /></span>
          <span className="flex-1">Theme settings</span>
          <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-fg" />
        </motion.button>}
        {role === 'student' && !profile && <button type="button"
          className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link sm:hidden"
          onClick={() => quickToggleTheme(resolvedTheme, setTheme)}>
          <span className="shrink-0">
            {dark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
          </span>
          <span>{dark ? 'Switch to light theme' : 'Switch to dark theme'}</span>
        </button>}
        {profile && <motion.button type="button" variants={profileRow} whileTap={animateProfile ? { scale: 0.97 } : undefined}
          className={`group !mt-2 ${PROFILE_ACTION} !text-red-700 dark:!text-red-300`} onClick={onLogout}>
          <span className={`${PROFILE_ICON} !bg-red-50 !text-inherit dark:!bg-red-950`}><LogOut className="size-4" aria-hidden="true" /></span>
          <span>Sign out</span>
        </motion.button>}
      </motion.nav>

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

export function Sidebar({ active, onNavigate, mobileOpen, mobileActive = mobileOpen, onMobileClose, onMobileExitComplete, role, profile, onLogout }: SidebarProps) {
  const { navigate } = usePortalRoute()
  const { mode } = useAnimationPreferences()
  const drawerOffset = profile ? '-100%' : -264
  const springDrawer = !!profile && mode === 'full'
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
    const desktop = window.matchMedia(profile ? '(min-width: 640px)' : '(min-width: 1024px)')
    const closeOnDesktop = () => {
      if (desktop.matches) onMobileClose()
    }
    desktop.addEventListener('change', closeOnDesktop)
    return () => {
      document.body.style.overflow = previousOverflow
      desktop.removeEventListener('change', closeOnDesktop)
    }
  }, [mobileActive, onMobileClose, profile])

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
              transition={{ duration: mode === 'off' ? 0 : 0.18 }}
              className={`fixed inset-0 bg-scrim/40 z-40 ${profile ? 'sm:hidden' : 'lg:hidden'}`}
              onClick={onMobileClose}
              aria-hidden="true"
            >
              {profile && (
                <div className="pointer-events-none absolute right-0 top-[38%] grid -translate-y-1/2 justify-items-center px-1" style={{ left: PROFILE_DRAWER_WIDTH }}>
                  <span className="rounded-lg bg-black/55 px-1 py-1.5 text-center text-[0.6875rem] font-medium leading-tight text-white/95">Tap here<br />to close</span>
                </div>
              )}
            </motion.div>
            {/* Drawer */}
            <DialogPanel
              id={profile ? 'mobile-profile' : 'mobile-navigation'}
              onClose={onMobileClose}
              initial={mode === 'off' ? false : 'closed'}
              animate="open"
              exit="exit"
              variants={{
                closed: { x: mode === 'full' ? drawerOffset : 0, opacity: mode === 'reduced' ? 0 : 1 },
                open: { x: springDrawer ? '0%' : 0, opacity: 1, transition: springDrawer ? PROFILE_SPRING : { duration: mode === 'full' ? 0.27 : mode === 'reduced' ? 0.12 : 0, ease: [0.22, 1, 0.36, 1] } },
                exit: { x: mode === 'full' ? drawerOffset : 0, opacity: mode === 'full' ? 1 : 0, transition: { duration: mode === 'full' ? 0.21 : mode === 'reduced' ? 0.12 : 0, ease: 'easeInOut' } },
              }}
              onPanEnd={profile ? (event, info) => {
                if (event.pointerType === 'touch' && info.offset.x < -72 && Math.abs(info.offset.x) > Math.abs(info.offset.y)) onMobileClose()
              } : undefined}
              style={profile ? { width: PROFILE_DRAWER_WIDTH } : undefined}
              className={`portal-mobile-drawer fixed left-0 top-0 z-50 flex h-dvh max-w-[calc(100vw-32px)] flex-col border-r border-line bg-surface pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] outline-none ${profile ? 'overflow-hidden rounded-r-[26px] shadow-[12px_0_48px_rgb(2_6_23/0.22)] sm:hidden' : 'w-72 lg:hidden'}`}
              aria-label={profile ? 'Profile menu' : 'Navigation menu'}
            >
              {profile ? (
                <button type="button" className="sr-only focus:not-sr-only focus:absolute focus:right-3 focus:top-[calc(0.75rem+env(safe-area-inset-top))] focus:z-10 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-ink focus:ring-2 focus:ring-link" onClick={onMobileClose}>
                  Close profile menu
                </button>
              ) : <button
                type="button"
                onClick={onMobileClose}
                aria-label="Close navigation menu"
                className="absolute right-2 top-[calc(0.75rem+env(safe-area-inset-top))] z-10 grid size-11 place-items-center rounded-md text-muted-fg hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-link"
              >
                <X className="w-5 h-5" />
              </button>}
              <div className={`min-h-0 flex-1 ${profile ? 'overflow-y-auto overscroll-contain [touch-action:pan-y_pinch-zoom]' : ''}`}>
                <SidebarContent
                  active={active}
                  onNavigate={(v) => {
                    onNavigate(v)
                    onMobileClose()
                  }}
                  role={role}
                  profile={profile}
                  onLogout={onLogout}
                  onAppearance={profile ? () => {
                    navigate({ view: 'settings', role: 'student', branch: profile.branch, username: profile.username, section: 'appearance' })
                    onMobileClose()
                  } : undefined}
                />
              </div>
            </DialogPanel>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
