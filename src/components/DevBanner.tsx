import { TriangleAlert, FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AppEnv } from '@/lib/env'

// Environment banner — rendered by the server root layout on EVERY
// environment, in normal document flow (a plain block at the very top
// of <body>), so it pushes content down instead of covering it and
// scrolls away with the page like any other content. It has no state
// and no close button: the notice cannot be dismissed or removed.
//   development + production: amber "under development" banner — the
//     project ships new work continuously, so the notice stays true on
//     the live deployment for as long as development is active.
//   staging: sky banner naming the preview database.
export function DevBanner({ appEnv }: { appEnv: AppEnv }) {
  const isStaging = appEnv === 'staging'

  return (
    <div
      className={cn(
        'w-full border-b-2 border-black text-black',
        isStaging ? 'bg-sky-300' : 'bg-amber-400',
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center">
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
    </div>
  )
}
