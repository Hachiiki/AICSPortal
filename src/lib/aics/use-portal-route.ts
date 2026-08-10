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

export type PortalRoute =
  | { view: 'login' }
  | { view: 'dashboard'; branch: string; username: string }
  | { view: 'profile'; branch: string; username: string }

/** Parse a URL pathname into a PortalRoute. */
function parsePath(path: string): PortalRoute {
  // Normalize: remove leading/trailing slashes, split into segments.
  const parts = path.replace(/^\/+|\/+$/g, '').split('/')
  // Expected shapes:
  //   portal / login
  //   portal / {branch} / student / :username
  //   portal / {branch} / student / :username / profile
  if (parts[0] !== 'portal') return { view: 'login' }
  if (parts[1] === 'login') return { view: 'login' }
  // parts[1] = branch, parts[2] = 'student', parts[3] = username
  if (parts[2] === 'student' && parts[3]) {
    const branch = decodeURIComponent(parts[1])
    const username = decodeURIComponent(parts[3])
    if (parts[4] === 'profile') {
      return { view: 'profile', branch, username }
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
 */
export function usePortalRoute() {
  const path = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // If the app loaded at bare `/`, replace the URL with `/portal/login`.
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
