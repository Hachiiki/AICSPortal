'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw, LogOut } from 'lucide-react'

// Portal segment error boundary (Next.js convention: error.tsx).
//
// PortalShell already wraps each view in an in-page ErrorBoundary, so
// normal tab crashes degrade to an inline card. This file is the net
// BELOW that: it catches failures in the portal page itself (shell
// mount, layout, session bootstrap) and renders a full standalone page
// instead of the default gray Next.js crash screen.

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[portal] render error:', error)
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
        <h1 className="mt-5 text-xl font-semibold text-slate-900">The portal hit an unexpected error</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your work is saved on the server. Retry the page, or sign out and back in if the problem repeats.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-slate-500">Reference: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-surface px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Back to login
          </a>
        </div>
      </div>
    </div>
  )
}
