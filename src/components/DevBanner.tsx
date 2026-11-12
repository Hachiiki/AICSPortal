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
        'w-full border-b border-amber-200 text-amber-950 sm:border-b-2 sm:border-black sm:text-black',
        // Stage 2C: the bridged dark amber-400 (oklch 0.55) drops black
        // text to 4.27:1; the dark amber-500 rung (0.66) restores 6.6:1
        // while light mode keeps amber-400 exactly.
        isStaging ? 'border-sky-200 bg-sky-100 text-sky-950 sm:bg-sky-300' : 'bg-amber-50 sm:bg-amber-400 dark:border-[#6f4c16] dark:bg-[#382709] dark:text-[#ffe4ab] dark:sm:border-black dark:sm:bg-amber-500 dark:sm:text-black',
      )}
    >
      <div className="mx-auto flex max-w-7xl items-start gap-[8px] px-[16px] py-[6px] sm:items-center sm:justify-center sm:py-2 sm:text-center">
        {isStaging ? (
          <FlaskConical className="mt-0.5 size-[16px] shrink-0 sm:mt-0" aria-hidden />
        ) : (
          <TriangleAlert className="mt-0.5 size-[16px] shrink-0 sm:mt-0" aria-hidden />
        )}
        <p className="text-xs leading-snug sm:hidden">
          {isStaging ? <><strong>Staging preview.</strong> Test data only.</> : <><strong>In development.</strong> Student project by Willard, unaffiliated with AICS.</>}
        </p>
        <p className="hidden text-sm font-bold tracking-wide sm:block">
          {isStaging
            ? 'STAGING PREVIEW: test data only. Changes here do not affect production.'
            : 'UNDER DEVELOPMENT: independent student project by Willard. Not affiliated with or endorsed by AICS. Expect bugs and future changes.'}
        </p>
        {isStaging ? (
          <FlaskConical className="hidden size-4 shrink-0 sm:block" aria-hidden />
        ) : (
          <TriangleAlert className="hidden size-4 shrink-0 sm:block" aria-hidden />
        )}
      </div>
    </div>
  )
}
