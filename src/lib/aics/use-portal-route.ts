'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'

// ============================================================
//  Client-side URL routing via the History API
// ============================================================
//  The Next.js app only has a single route (`/` in src/app/page.tsx),
//  but we want the browser address bar to reflect the current screen:
//
//    /portal/login                         → login page
//    /portal/student/:username             → student dashboard
//    /portal/student/:username/profile     → student profile
//
//  We achieve this with `history.pushState` / `popstate` so that
//  in-app navigation, the back button, and the forward button all
//  work. Direct URL access (typing the URL or refreshing) will hit
//  Next.js's single-route setup — that's fine for a demo; a real
//  deployment would add catch-all routes or middleware.
// ============================================================

export type PortalRoute =
  | { view: 'login' }
  | { view: 'dashboard'; username: string }
  | { view: 'profile'; username: string }

/** Parse a URL pathname into a PortalRoute. */
function parsePath(path: string): PortalRoute {
  // Normalize: remove leading/trailing slashes, split into segments.
  const parts = path.replace(/^\/+|\/+$/g, '').split('/')
  // Expected shapes:
  //   portal / login
  //   portal / student / :username
  //   portal / student / :username / profile
  if (parts[0] !== 'portal') return { view: 'login' }
  if (parts[1] === 'login') return { view: 'login' }
  if (parts[1] === 'student' && parts[2]) {
    if (parts[3] === 'profile') {
      return { view: 'profile', username: decodeURIComponent(parts[2]) }
    }
    return { view: 'dashboard', username: decodeURIComponent(parts[2]) }
  }
  return { view: 'login' }
}

/** Convert a PortalRoute into a URL pathname. */
function routeToPath(route: PortalRoute): string {
  switch (route.view) {
    case 'login':
      return '/portal/login'
    case 'dashboard':
      return `/portal/student/${encodeURIComponent(route.username)}`
    case 'profile':
      return `/portal/student/${encodeURIComponent(route.username)}/profile`
  }
}

// ------------------------------------------------------------
//  useSyncExternalStore plumbing
// ------------------------------------------------------------
//  We treat `window.location.pathname` as an external store. On the
//  server we return '/' (→ login). On the client we return the real
//  path. The subscribe function listens for `popstate` (back/forward)
//  and `pushstate` (our custom event fired by `navigate()`).

let cachedPath: string | null = null
let cachedPathKey = ''

function getSnapshot(): string {
  const path = window.location.pathname
  // Cache by path string so React doesn't loop on referential inequality.
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
 * - `route` reflects the current URL (parsed into a PortalRoute).
 * - `navigate()` pushes a new URL via `history.pushState` and
 *   dispatches a `pushstate` event so the hook updates.
 * - The browser back/forward buttons work via the `popstate` listener.
 * - If the app loads at `/`, the URL is replaced with `/portal/login`.
 */
export function usePortalRoute() {
  const path = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // If the app loaded at bare `/`, replace the URL with `/portal/login`
  // so the address bar shows the right URL from the start.
  // This is a side-effect on an external system (browser history), not
  // React state, so it's safe to do in an effect without setState.
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
    // Fire a custom event so useSyncExternalStore's subscribe callback runs.
    window.dispatchEvent(new Event('pushstate'))
  }, [])

  return { route, navigate }
}
