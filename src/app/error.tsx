'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

// Root segment error boundary (Next.js convention: error.tsx).
//
// Catches render crashes outside /portal — today that is the login
// page and any future public pages. Without this file a crash there
// shows the default Next.js production error page; with it, users get
// the portal's own styling and a retry action.

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app] render error:', error)
  }, [error])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 font-sans">
      <div
        role="alert"
        className="w-full max-w-md rounded-2xl border border-red-200 bg-surface p-8 text-center shadow-sm"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-7 w-7 text-red-600" aria-hidden />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-600">
          The page failed to load. Retrying usually fixes it.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-slate-500">Reference: {error.digest}</p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Try again
        </button>
      </div>
    </div>
  )
}
