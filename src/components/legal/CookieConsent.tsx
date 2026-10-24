'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Cookie } from 'lucide-react'
import {
  CONSENT_RESET_EVENT,
  CONSENT_STORAGE_KEY,
  type ConsentChoice,
} from '@/lib/legal/site'

// ============================================================
//  CookieConsent — the consent banner for the cookie policy.
//
//  Facts that drive the design (see /legal/cookies):
//  - The app itself sets exactly one cookie (`aics_session`),
//    which is strictly necessary for signing in and is exempt
//    from consent requirements.
//  - Vercel Analytics / Speed Insights beacons are cookieless but
//    still send usage events to a US processor, so they stay OFF
//    until the visitor explicitly opts in. Opt-in is the default
//    everywhere: no choice yet = essential only.
//
//  The banner is a labelled region in normal focus order (not a
//  modal dialog), so keyboard and screen-reader users reach it by
//  tabbing without a focus trap.
// ============================================================

function readConsent(): ConsentChoice | null {
  try {
    const v = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    return v === 'essential' || v === 'analytics' ? v : null
  } catch {
    return null
  }
}

export function CookieConsent() {
  const [choice, setChoice] = useState<ConsentChoice | null | 'undecided'>('undecided')

  useEffect(() => {
    setChoice(readConsent())
    // Same event carries two meanings: a decision (detail set — the
    // banner hides and reflects the stored choice) and a reset from
    // Cookie settings (no detail — the banner reopens for a new choice).
    const onReset = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setChoice(detail === 'essential' || detail === 'analytics' ? detail : null)
    }
    window.addEventListener(CONSENT_RESET_EVENT, onReset)
    return () => window.removeEventListener(CONSENT_RESET_EVENT, onReset)
  }, [])

  const decide = useCallback((value: ConsentChoice) => {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, value)
    } catch {
      // Private modes may block storage — the session still works and
      // the banner simply reappears next visit. No analytics without
      // a readable choice either way.
    }
    setChoice(value)
    window.dispatchEvent(new CustomEvent(CONSENT_RESET_EVENT, { detail: value }))
  }, [])

  if (choice !== null) return null

  return (
    <section
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex items-start gap-3 text-sm leading-relaxed text-slate-700">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden />
          <p>
            This portal uses one strictly necessary sign-in cookie. Optional,
            cookieless usage analytics stay off unless you allow them.{' '}
            <Link
              href="/legal/cookies"
              className="font-medium text-[#1769AA] underline decoration-[#1769AA]/40 underline-offset-2 hover:decoration-[#1769AA]"
            >
              Read the Cookie Policy
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => decide('essential')}
            className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={() => decide('analytics')}
            className="h-10 rounded-lg bg-[#1769AA] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#124D7A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            Allow analytics
          </button>
        </div>
      </div>
    </section>
  )
}
