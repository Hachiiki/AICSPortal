'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Users,
  GraduationCap,
  Megaphone,
  CalendarDays,
  Settings,
  CircleHelp,
  X,
  type LucideIcon,
} from 'lucide-react'
import type { View } from '@/lib/aics/types'

// ============================================================
//  FacultySidebar
// ============================================================
//  Mirrors the student Sidebar.tsx (240px fixed desktop aside
//  + slide-in mobile drawer) but with faculty-flavored nav
//  items. Only "Dashboard" is functional right now — the rest
//  are "coming soon" placeholders (rendered grayed out with a
//  "Soon" badge, non-interactive).
//
//  Same NavButton / brand header / footer pattern as the
//  student sidebar so the visual chrome stays consistent
//  across both portals.
// ============================================================

interface FacultySidebarProps {
  active: View
  onNavigate: (view: View) => void
  /** Mobile drawer open state (below lg) */
  mobileOpen: boolean
  onMobileClose: () => void
}

interface NavItem {
  view: View
  label: string
  icon: LucideIcon
  /** When false, the item is grayed out, shows a "Soon" badge, and cannot be clicked. */
  enabled: boolean
}

// Dashboard is functional. My Students, Grade Encoding,
// Announcements, and Schedule are "coming soon" — rendered
// grayed out with a "Soon" badge and made non-interactive.
// (The `view` value for "Announcements" reuses the existing
// 'events' View since announcements are not yet a standalone
// route; it's never reached because the item is disabled.)
const PRIMARY_NAV: NavItem[] = [
  { view: 'dashboard', label: 'Dashboard', icon: Home, enabled: true },
  { view: 'subjects', label: 'My Students', icon: Users, enabled: false },
  { view: 'grades', label: 'Grade Encoding', icon: GraduationCap, enabled: false },
  { view: 'events', label: 'Announcements', icon: Megaphone, enabled: false },
  { view: 'schedule', label: 'Schedule', icon: CalendarDays, enabled: false },
]

const SECONDARY_NAV: NavItem[] = [
  { view: 'settings', label: 'Settings', icon: Settings, enabled: true },
  { view: 'help', label: 'Help & Support', icon: CircleHelp, enabled: false },
]

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

  // --- Disabled / "coming soon" state ---
  if (!item.enabled) {
    return (
      <div
        aria-disabled="true"
        className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium cursor-not-allowed select-none"
        style={{ color: '#cbd5e1' }}
        title="Coming soon"
      >
        <Icon className="w-4 h-4 flex-shrink-0 opacity-50" />
        <span className="truncate flex-1">{item.label}</span>
        <span
          className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
          style={{ background: '#f1f5f9', color: '#94a3b8' }}
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
      className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      style={
        active
          ? { background: '#1e40af', color: '#ffffff' }
          : { color: '#475569' }
      }
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = '#f1f5f9'
          e.currentTarget.style.color = '#0f172a'
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = '#475569'
        }
      }}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="truncate">{item.label}</span>
    </button>
  )
}

function SidebarContent({
  active,
  onNavigate,
}: {
  active: View
  onNavigate: (v: View) => void
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-5 flex items-center gap-3 border-b border-slate-100">
        <img src="/aics-logo.svg" alt="AICS" className="w-10 h-10 flex-shrink-0" />
        <div className="leading-tight min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-blue-700">
            Faculty Portal
          </p>
          <p className="text-sm font-bold text-slate-900 leading-snug">
            Asian Institute of Computer Studies
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Faculty navigation">
        {PRIMARY_NAV.map((item) => (
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

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-100">
        <p className="text-[11px] text-slate-400 leading-relaxed">
          &copy; 2026 Asian Institute of Computer Studies
          <br />
          All rights reserved.
        </p>
      </div>
    </div>
  )
}

export function FacultySidebar({
  active,
  onNavigate,
  mobileOpen,
  onMobileClose,
}: FacultySidebarProps) {
  // Close the mobile drawer on Escape key
  useEffect(() => {
    if (!mobileOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onMobileClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [mobileOpen, onMobileClose])

  return (
    <>
      {/* Desktop sidebar — fixed, 240px */}
      <aside
        className="hidden lg:flex flex-col fixed top-0 left-0 h-screen w-60 bg-white border-r border-slate-200 z-30"
        aria-label="Faculty"
      >
        <SidebarContent active={active} onNavigate={onNavigate} />
      </aside>

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
              className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden"
              onClick={onMobileClose}
              aria-hidden="true"
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: -264 }}
              animate={{ x: 0 }}
              exit={{ x: -264 }}
              transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
              className="fixed top-0 left-0 h-screen w-64 bg-white border-r border-slate-200 z-50 lg:hidden flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label="Faculty navigation menu"
            >
              {/* Close button */}
              <button
                type="button"
                onClick={onMobileClose}
                aria-label="Close navigation menu"
                className="absolute top-4 right-3 p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <X className="w-5 h-5" />
              </button>
              <SidebarContent
                active={active}
                onNavigate={(v) => {
                  onNavigate(v)
                  onMobileClose()
                }}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
