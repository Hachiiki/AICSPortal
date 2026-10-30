'use client'

// Dev-only mount for the synthetic onboarding tour (onboarding plan,
// Phase 2; criterion A1).
//
// PortalShell renders this unconditionally so the app tree stays the
// same in every environment, but the engine itself loads only in
// development: the NODE_ENV early return runs before the dynamic
// import is ever touched, and the bundler's dead-code elimination drops
// the unreachable import from the production build (verified by the
// A1 gate script, which greps the emitted chunks for onboarding
// markers). In production this renders nothing: no bytes of engine,
// no bytes of synthetic content, no onboarding render path at all.

import { useEffect, useState, type ComponentType } from 'react'

export function OnboardingDevMount() {
  const [Dev, setDev] = useState<ComponentType | null>(null)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    let cancelled = false
    void import('./OnboardingDev').then((m) => {
      if (!cancelled) setDev(() => m.OnboardingDev)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!Dev) return null
  return <Dev />
}
