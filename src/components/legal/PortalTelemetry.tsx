'use client'

import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { ConsentGate } from './ConsentGate'

function allowTelemetry(url: string) {
  try {
    const { pathname, search, hash } = new URL(url, window.location.origin)
    return !search && !hash && (pathname === '/' || pathname.startsWith('/legal/'))
  } catch {
    return false
  }
}

export function PortalTelemetry() {
  return (
    <ConsentGate>
      <Analytics beforeSend={(event) => allowTelemetry(event.url) ? event : null} />
      <SpeedInsights beforeSend={(event) => allowTelemetry(event.url) ? event : null} />
    </ConsentGate>
  )
}
