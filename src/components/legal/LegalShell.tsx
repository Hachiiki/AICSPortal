import Link from 'next/link'
import { ArrowLeft, Mail } from 'lucide-react'
import { LEGAL, POLICY_PAGES } from '@/lib/legal/site'
import { CookieSettingsButton } from '@/components/legal/CookieSettingsButton'

// ============================================================
//  LegalShell — shared chrome for the four public policy pages
//  (/legal/privacy, /terms, /cookies, /refund). Server-rendered,
//  pre-auth (proxy gates only /api and /portal), crawlable.
// ============================================================

export function LegalShell({
  current,
  title,
  summary,
  children,
}: {
  current: string
  title: string
  summary: string
  children: React.ReactNode
}) {
  const year = new Date().getFullYear()
  return (
    <div className="flex min-h-dvh flex-col bg-white font-sans text-slate-900">
      <a
        href="#legal-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to content
      </a>

      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to sign in
          </Link>
          <span className="text-sm font-semibold tracking-tight">AICS Portal · Legal</span>
        </div>
      </header>

      {/* Independence notice — mirrors the README statement that this
          project is not a school initiative. Stated on every legal page
          because the UI carries the school's name and marks. */}
      <div className="border-b border-amber-200 bg-amber-50">
        <p className="mx-auto max-w-5xl px-5 py-2.5 text-center text-xs leading-relaxed text-amber-900 sm:text-left sm:text-[13px]">
          AICS Portal is an independent, student-built project. It is not affiliated with,
          sponsored by, or endorsed by the Asian Institute of Computer Studies.
        </p>
      </div>

      <nav aria-label="Legal documents" className="border-b border-slate-200">
        <ul className="mx-auto flex max-w-5xl flex-wrap gap-x-6 gap-y-1 px-5 py-3">
          {POLICY_PAGES.map((p) => (
            <li key={p.href}>
              <Link
                href={p.href}
                aria-current={p.href === current ? 'page' : undefined}
                className={
                  p.href === current
                    ? 'text-sm font-semibold text-[#1769AA] underline underline-offset-4'
                    : 'text-sm text-slate-600 transition-colors hover:text-slate-900'
                }
              >
                {p.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <main
        id="legal-content"
        className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:py-12"
      >
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">
          Last updated {LEGAL.lastUpdated} · {LEGAL.jurisdiction}
        </p>
        {/* Plain-language summary first — the detail sections follow. */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-slate-900">In brief</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{summary}</p>
        </div>
        <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-slate-700 [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-slate-900 [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-3 [&_td]:border [&_td]:border-slate-200 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_ul]:mt-3 [&_ul]:space-y-1.5 [&_table]:mt-4 [&_table]:w-full [&_table]:text-sm [&_table]:border-collapse">
          {children}
        </div>
      </main>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Questions?{' '}
            <a
              href={`mailto:${LEGAL.operatorEmail}?subject=AICS%20Portal%20legal%20question`}
              className="inline-flex items-center gap-1 font-medium text-[#1769AA] underline underline-offset-2"
            >
              <Mail className="h-3.5 w-3.5" aria-hidden />
              {LEGAL.operatorEmail}
            </a>
          </p>
          <CookieSettingsButton className="text-sm font-medium text-slate-600 hover:text-slate-900" />
        </div>
        <div className="mx-auto max-w-5xl px-5 pb-6">
          <p className="text-xs text-slate-500">
            &copy; {year} {LEGAL.operatorName} · AICS Portal is an independent project · All
            rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
