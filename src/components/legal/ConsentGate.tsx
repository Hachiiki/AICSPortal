'use client'

import { useEffect, useState } from 'react'
import { CONSENT_STORAGE_KEY, type ConsentChoice } from '@/lib/legal/site'

// ============================================================
//  ConsentGate — renders children only after the visitor opted
//  in to analytics. Wraps <Analytics /> and <SpeedInsights /> in
//  the root layout, so no beacon request leaves the browser
//  before an explicit "Allow analytics" click.
//
//  'undecided' (null in storage) renders nothing — opt-in is the
//  only path that loads the beacons. Revoking consent unmounts
//  the components AND strips any already-injected Vercel beacon
//  script tags from the live DOM (best effort — the next page
//  load is guaranteed clean either way).
// ============================================================

function stripBeaconScripts() {
  document
    .querySelectorAll('script[src*="va.vercel-scripts.com"]')
    .forEach((el) => el.remove())
}

export function ConsentGate({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<ConsentChoice | null>(null)

  useEffect(() => {
    const sync = () => {
      try {
        const v = window.localStorage.getItem(CONSENT_STORAGE_KEY)
        setConsent(v === 'analytics' || v === 'essential' ? v : null)
      } catch {
        setConsent(null)
      }
    }
    sync()
    const onReset = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setConsent(detail === 'analytics' || detail === 'essential' ? (detail as ConsentChoice) : null)
    }
    window.addEventListener('aics:cookie-consent-reset', onReset)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('aics:cookie-consent-reset', onReset)
      window.removeEventListener('storage', sync)
    }
  }, [])

  // Revocation cleanup: strip beacon script tags as soon as consent
  // drops below 'analytics' (also runs once on mount before any
  // script exists, which is a harmless no-op).
  useEffect(() => {
    if (consent !== 'analytics') stripBeaconScripts()
  }, [consent])

  if (consent !== 'analytics') return null
  return <>{children}</>
}
