'use client'

import { Component, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

// Class error boundary — the only React construct that can catch a
// render crash. PortalShell wraps each view in one of these so a
// crash in a single tab degrades to an inline "this section crashed"
// card with a retry button, instead of taking the whole page (and the
// sidebar/topbar navigation) down with it.

interface ErrorBoundaryProps {
  children: ReactNode
  /** Changing this value resets the boundary (e.g. the active view key), so navigating away remounts cleanly. */
  resetKey?: string | number
  title?: string
  description?: string
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: unknown) {
    // Full details stay in the console; the fallback UI never shows them.
    console.error('[ErrorBoundary]', this.props.resetKey ?? 'view', error, info)
  }

  componentDidUpdate(prev: ErrorBoundaryProps) {
    // Navigating to a different view resets a crashed boundary.
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="m-4 rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm sm:p-10"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            {this.props.title ?? 'This section hit an unexpected error'}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            {this.props.description ??
              'The rest of the portal is still working. Try this section again, or reload the page if it keeps failing.'}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
