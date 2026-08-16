'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'

// ============================================================
//  Client-side URL routing via the History API
// ============================================================
//  URL structure:
//
//    /portal/login                                    → login page
//    /portal/{branch}/student/{username}              → student dashboard
//    /portal/{branch}/student/{username}/profile      → student profile
//
//  The branch segment (e.g. "commonwealth") is detected from the
//  student's record at login and embedded in the URL so every
//  screen is branch-aware.
// ============================================================

type PortalRoute =
  | { view: 'login' }
  | { view: 'dashboard'; branch: string; username: string }
  | { view: 'profile'; branch: string; username: string }
  | { view: 'academics'; branch: string; username: string }
  | { view: 'events'; branch: string; username: string }
  | { view: 'professors'; branch: string; username: string }

/** Parse a URL pathname into a PortalRoute. */
function parsePath(path: string): PortalRoute {
  const parts = path.replace(/^\/+|\/+$/g, '').split('/')
  if (parts[0] !== 'portal') return { view: 'login' }
  if (parts[1] === 'login') return { view: 'login' }
  if (parts[2] === 'student' && parts[3]) {
    const branch = decodeURIComponent(parts[1])
    const username = decodeURIComponent(parts[3])
    if (parts[4] === 'profile') {
      return { view: 'profile', branch, username }
    }
    if (parts[4] === 'academics') {
      return { view: 'academics', branch, username }
    }
    if (parts[4] === 'events') {
      return { view: 'events', branch, username }
    }
    if (parts[4] === 'professors') {
      return { view: 'professors', branch, username }
    }
    return { view: 'dashboard', branch, username }
  }
  return { view: 'login' }
}

/** Convert a PortalRoute into a URL pathname. */
function routeToPath(route: PortalRoute): string {
  switch (route.view) {
    case 'login':
      return '/portal/login'
    case 'dashboard':
      return `/portal/${encodeURIComponent(route.branch)}/student/${encodeURIComponent(route.username)}`
    case 'profile':
      return `/portal/${encodeURIComponent(route.branch)}/student/${encodeURIComponent(route.username)}/profile`
    case 'academics':
      return `/portal/${encodeURIComponent(route.branch)}/student/${encodeURIComponent(route.username)}/academics`
    case 'events':
      return `/portal/${encodeURIComponent(route.branch)}/student/${encodeURIComponent(route.username)}/events`
    case 'professors':
      return `/portal/${encodeURIComponent(route.branch)}/student/${encodeURIComponent(route.username)}/professors`
  }
}

// ------------------------------------------------------------
//  useSyncExternalStore plumbing
// ------------------------------------------------------------

let cachedPath: string | null = null
let cachedPathKey = ''

function getSnapshot(): string {
  const path = window.location.pathname
  if (path !== cachedPathKey) {
    cachedPath = path
    cachedPathKey = path
  }
  return cachedPath!
}

function getServerSnapshot(): string {
  return '/'
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('popstate', callback)
  window.addEventListener('pushstate', callback)
  return () => {
    window.removeEventListener('popstate', callback)
    window.removeEventListener('pushstate', callback)
  }
}

/**
 * Hook that syncs the browser URL with the current portal screen.
 *
 * On mount, if the URL is `/` (root), it redirects to `/portal/login`
 * (the page.tsx auth guard will then redirect to the dashboard if the
 * user is already authenticated).
 */
export function usePortalRoute() {
  const path = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // If the app loaded at bare `/`, replace the URL with `/portal/login`.
  // The auth guard in page.tsx will redirect to the dashboard if the
  // user is already logged in.
  useEffect(() => {
    if (window.location.pathname === '/') {
      window.history.replaceState({ view: 'login' }, '', '/portal/login')
      window.dispatchEvent(new Event('pushstate'))
    }
  }, [])

  const route = parsePath(path)

  const navigate = useCallback((newRoute: PortalRoute) => {
    const newPath = routeToPath(newRoute)
    window.history.pushState(newRoute, '', newPath)
    window.dispatchEvent(new Event('pushstate'))
  }, [])

  return { route, navigate }
}
