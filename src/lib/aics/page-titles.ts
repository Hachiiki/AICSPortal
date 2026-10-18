'use client'

// ============================================================
//  Page titles — the single owner of the browser tab title
// ============================================================
//
//  Every title flows through here in the form "<Page> | AICS Portal"
//  so no route or page ever hand-builds one. Two layers, most
//  specific wins:
//
//  1. ROUTE titles (VIEW_TITLES + usePortalPageTitle). The manager
//     hook in the root page listens to the same pushstate/popstate
//     events the router dispatches, so the title updates at the
//     moment navigation happens — client-side routing, back/forward,
//     direct URLs, refreshes, and logout redirects all land here
//     without any per-page wiring.
//
//  2. PAGE titles (setPageTitle). Pages with meaningful internal
//     tabs (Academics → Grades / Subjects / Student Academic Tasks /
//     Materials) override the route title while their tab is active.
//     Because child mount effects run before the root's, and the
//     manager's initial apply defers one tick and respects an active
//     override, a refreshed /academics?tab=tasks keeps its specific
//     title instead of flashing the generic route one.
//
//  There is no conflicting prior system — this is the first (and
//  only) document.title owner. layout.tsx just sets the SSR default
//  ("Login | AICS Portal") that logged-out users see before any
//  client code runs.
// ============================================================

import { useEffect } from 'react'
import { parsePath, type PortalRoute } from '@/lib/aics/use-portal-route'

const APP_NAME = 'AICS Portal'

/** Route-level page names, one per routable view. Mirrors the nav
 *  labels in nav-config.ts — the sidebar and the tab title can never
 *  disagree about what to call a page. */
export const VIEW_TITLES: Record<PortalRoute['view'], string> = {
  login: 'Login',
  dashboard: 'Dashboard',
  profile: 'Profile',
  academics: 'Academics',
  events: 'Events',
  professors: 'Professors',
  enrollment: 'Enrollment',
  settings: 'Settings',
  'my-students': 'My Students',
  'grade-encoding': 'Grade Encoding',
  'previous-records': 'Previous Records',
  announcements: 'Announcements',
  schedule: 'Schedule',
  tasks: 'Tasks',
  help: 'Help & Support',
  'release-queue': 'Release Queue',
  'admin-events': 'Events',
  'admin-announcements': 'Announcements',
  'admin-professors': 'Professors',
  'admin-people': 'Students & Faculty',
  'admin-enrollment': 'Enrollment',
}

/** The Academics page renders real sub-screens behind one route; the
 *  tab title should say which one is showing. */
export const ACADEMICS_TAB_TITLES: Record<'grades' | 'subjects' | 'tasks' | 'materials', string> = {
  grades: 'Grades',
  subjects: 'Subjects',
  tasks: 'Student Academic Tasks',
  materials: 'Materials',
}

/** Full tab-title text for a page name. */
export function portalTitle(page: string): string {
  return `${page} | ${APP_NAME}`
}

// ---- Override slot ------------------------------------------------
// The single page-level override currently in force (only pages with
// internal tabs set one). Module state is fine: there is exactly one
// document and one title.

let pageTitleOverride: string | null = null

/** Route-level title (manager only). Clears any stale page override —
 *  a new route means the old page's tab context is gone. */
function setRouteTitle(page: string) {
  pageTitleOverride = null
  document.title = portalTitle(page)
}

/** Page-level title (pages with internal tabs). Wins over the route
 *  title until the next route change clears it. */
export function setPageTitle(page: string) {
  pageTitleOverride = page
  document.title = portalTitle(page)
}

function hasPageTitleOverride(): boolean {
  return pageTitleOverride !== null
}

/** Route title for a parsed route. Kept role-agnostic on purpose:
 *  the sidebar already scopes by role, the tab just names the page. */
export function titleForRoute(route: PortalRoute): string {
  return VIEW_TITLES[route.view] ?? 'Portal'
}

/** Route title for a raw pathname (parses with the router's own logic). */
export function titleForPath(path: string): string {
  return titleForRoute(parsePath(path))
}

// ---- Manager hook --------------------------------------------------

/**
 * Keeps document.title in sync with portal navigation.
 *
 * `enabled` should be `!authLoading && !!username` — while auth is
 * resolving the SSR default ("Login | AICS Portal") stays up, and
 * logged-out users keep it too (their guard redirects fire pushstate
 * anyway). Once enabled, the initial title applies deferred by one
 * tick so page-level overrides set during child mount effects win
 * over the generic route title.
 */
export function usePortalPageTitle(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    const apply = () => setRouteTitle(titleForPath(window.location.pathname))
    // Route changes (pushstate/popstate) apply synchronously — the
    // event fires before React commits the new page, so a mounting
    // page's tab-level effect always lands after it.
    window.addEventListener('pushstate', apply)
    window.addEventListener('popstate', apply)

    // Initial load / refresh: deferred one tick, and skipped entirely
    // when a page-level override is already active (child effects ran
    // first — e.g. Academics restored its focused tab).
    const initial = window.setTimeout(() => {
      if (!hasPageTitleOverride()) apply()
    }, 0)

    return () => {
      window.clearTimeout(initial)
      window.removeEventListener('pushstate', apply)
      window.removeEventListener('popstate', apply)
    }
  }, [enabled])
}
