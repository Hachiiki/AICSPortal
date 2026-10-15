'use client'

import { useState } from 'react'
import { TriangleAlert, FlaskConical, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AppEnv } from '@/lib/env'

// Environment banner. The server layout computes the app environment
// (src/lib/env.ts) and passes it down — the client must not guess.
//   development: amber "under development" banner (the classic one)
//   staging:     sky banner naming the preview database
//   production:  no banner at all
export function DevBanner({ appEnv }: { appEnv: AppEnv }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed || appEnv === 'production') return null

  const isStaging = appEnv === 'staging'

  return (
    <div
      role="alert"
      className={cn(
        // z-40 per PortalShell z-scale: above Topbar (z-20), below the
        // mobile drawer (z-50) so it never blocks the drawer's close
        // button. Backdrop (also z-40, later in DOM) dims the banner
        // while the drawer is open.
        'fixed inset-x-0 top-0 z-40',
        'border-b-2 border-black text-black',
        isStaging ? 'bg-sky-300' : 'bg-amber-400',
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-10 py-2 text-center">
        {isStaging ? (
          <FlaskConical className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
        )}
        <p className="text-xs font-bold tracking-wide sm:text-sm">
          {isStaging
            ? 'STAGING PREVIEW — test data only. Changes here do not affect production.'
            : 'UNDER DEVELOPMENT — Built by Willard. Expect bugs and future changes.'}
        </p>
        {isStaging ? (
          <FlaskConical className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
        )}
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={isStaging ? 'Dismiss staging notice' : 'Dismiss development warning'}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-black/10"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}
