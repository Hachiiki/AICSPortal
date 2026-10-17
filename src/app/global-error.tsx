'use client'

// Last-resort boundary (Next.js convention: global-error.tsx).
//
// Catches errors thrown by the ROOT LAYOUT itself — including
// DevBanner/Toaster providers — where error.tsx cannot help because
// the layout's <body> never rendered. Must render its own <html> and
// <body> tags. Inline styles only: globals.css may be what crashed.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  if (typeof console !== 'undefined') {
    console.error('[global] render error:', error)
  }

  return (
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: '#f8fafc' }}>
        <div
          role="alert"
          style={{
            maxWidth: '26rem',
            margin: '10vh auto 0',
            padding: '2rem',
            backgroundColor: '#ffffff',
            border: '1px solid #fecdd3',
            borderRadius: '16px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            textAlign: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', color: '#0f172a' }}>
            The portal could not start
          </h1>
          <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: '#475569' }}>
            A critical error occurred while loading the application. Reload to try again.
          </p>
          {error.digest ? (
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              padding: '0.625rem 1rem',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  )
}
