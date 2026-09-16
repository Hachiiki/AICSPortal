'use client'

import { useState } from 'react'
import { TriangleAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DevBanner() {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div
      role="alert"
      className={cn(
        'fixed inset-x-0 top-0 z-[100]',
        'border-b-2 border-black bg-amber-400 text-black',
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-10 py-2 text-center">
        <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
        <p className="text-xs font-bold tracking-wide sm:text-sm">
          UNDER DEVELOPMENT — Built by Willard. Expect bugs and future changes.
        </p>
        <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss development warning"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-black/10"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}
