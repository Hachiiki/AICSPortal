import Link from 'next/link'

// 404 for any URL outside the portal's catch-all (Next.js convention:
// not-found.tsx). Plain server component — no data, no client JS.

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 font-sans">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-5xl font-bold tracking-tight text-slate-900">404</p>
        <h1 className="mt-3 text-lg font-semibold text-slate-900">Page not found</h1>
        <p className="mt-2 text-sm text-slate-600">
          The page you are looking for does not exist or may have moved.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Back to login
        </Link>
      </div>
    </div>
  )
}
