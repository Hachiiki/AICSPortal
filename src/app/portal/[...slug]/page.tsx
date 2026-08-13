'use client'

// This catch-all route renders the same root component for every
// /portal/* URL so that browser refreshes and direct navigation
// don't 404. The actual routing logic lives in src/app/page.tsx
// which reads window.location.pathname via the History API.
//
// We re-export the root page component so both `/` and `/portal/*`
// share the same client-side routing, auth, and view logic.

import RootPage from '@/app/page'

export default function PortalCatchAll() {
  return <RootPage />
}
