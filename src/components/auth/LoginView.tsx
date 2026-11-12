'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import {
  ScanFace,
  ShieldCheck,
  Lock,
  CircleAlert,
  Sun,
  Moon,
} from 'lucide-react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useMounted } from '@/lib/aics/use-mounted'
import { quickToggleTheme } from '@/lib/aics/theme-palette'
import type { AuthMode } from '@/lib/aics/types'
import { T, PORTAL_TEXT_GRADIENT, SHOW_DEMO_LOGIN } from './login-tokens'
import { CredentialsForm } from './CredentialsForm'
import { FaceIdPanel } from './FaceIdPanel'
import { CookieSettingsButton } from '@/components/legal/CookieSettingsButton'
import { LEGAL, POLICY_PAGES } from '@/lib/legal/site'

// ============================================================
//  LoginView — the AICS login page.
//  A 60/40 split layout with the school image on the left and a
//  white login panel (with rounded left corners) on the right.
//  Supports two auth modes: Credentials (username/password) and
//  Face ID (webcam-based).
//
//  The credential form and face ID panel are now extracted into
//  separate components (CredentialsForm.tsx, FaceIdPanel.tsx) to
//  keep this file focused on layout + mode switching.
// ============================================================

const INDEPENDENT_NOTICE = 'An independent student project. Not affiliated with or endorsed by AICS.'

interface LoginViewProps {
  onLogin: (
    username: string,
    password: string,
    remember: boolean
  ) => Promise<{ ok: boolean; error?: string }>
  onDemoLogin: () => Promise<{ ok: boolean; error?: string }>
}

export function LoginView({ onLogin, onDemoLogin }: LoginViewProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('credentials')

  // Login-page theme toggle (dark-theme plan §6, Phase 1 control 4):
  // functional before authentication, outside the portal shell. The
  // icon renders only after mount so SSR and the first client render
  // stay identical (resolvedTheme is undefined until then).
  const { resolvedTheme, setTheme } = useTheme()
  const themeMounted = useMounted()
  const isDark = themeMounted && resolvedTheme === 'dark'

  return (
    // reducedMotion="user" mirrors PortalShell's contract for the login
    // surface (slides, scanner sweep, mode transitions).
    <MotionConfig reducedMotion="user">
    <main
      className="relative w-full min-h-dvh flex flex-col lg:flex-row font-sans"
      style={{ background: T.white, color: T.text }}
    >
      <div className="absolute right-4 top-3 z-20 sm:right-5 lg:top-5">
        <button
          type="button"
          onClick={() => quickToggleTheme(resolvedTheme, setTheme)}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          className="inline-flex items-center justify-center size-11 lg:size-9 rounded-[10px] border border-white/45 bg-[#17324D] text-white transition-colors hover:border-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white lg:border-[var(--login-border)] lg:bg-[var(--login-bg)] lg:text-[var(--login-muted)] lg:hover:border-[var(--login-primary)] lg:hover:text-[var(--login-text)] lg:focus-visible:ring-[var(--login-accent)]/40"
        >
          {isDark ? <Sun className="w-4.5 h-4.5" aria-hidden /> : <Moon className="w-4.5 h-4.5" aria-hidden />}
        </button>
      </div>

      {/* ===================== LEFT 60% ===================== */}
      {/* Campus photograph + navy overlay. Brand-constant in both
          themes (plan §2): the navy panel and its white text never
          re-theme; the right-side form panel below does. */}
      <section
        className="relative lg:w-[60%] w-full lg:h-auto lg:min-h-dvh overflow-hidden flex-shrink-0"
        style={{ background: T.navy }}
      >
        {/* Campus photograph */}
        <img
          src="/aics-campus.jpg"
          alt="Asian Institute of Computer Studies campus"
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).style.display = 'none'
          }}
        />
        {/* Dark navy overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(160deg, rgba(23,50,77,0.78) 0%, rgba(18,77,122,0.92) 100%)',
          }}
        />

        <div className="relative flex min-h-16 items-center gap-3 px-4 py-4 pr-16 text-white sm:px-10 sm:pr-20 lg:hidden [@media(max-height:500px)]:py-2">
          <img src="/aics-logo.svg" alt="" aria-hidden="true" className="size-9 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold leading-tight text-white/85 [@media(max-height:500px)]:sr-only">Asian Institute of Computer Studies</p>
            <p className="text-lg font-bold leading-tight tracking-tight sm:text-2xl [@media(max-height:500px)]:text-base">Welcome to AICS Portal</p>
          </div>
        </div>

        {/* Top brand row — logo + institution name */}
        <div className="hidden lg:flex absolute top-0 left-0 right-0 px-6 sm:px-10 lg:px-14 py-7 items-center gap-4 text-white">
          <img
            src="/aics-logo.svg"
            alt=""
            aria-hidden="true"
            className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 object-contain"
          />
          <div className="leading-tight">
            <p className="text-base sm:text-lg font-semibold">Asian Institute</p>
            <p className="text-base sm:text-lg font-semibold">of Computer Studies</p>
          </div>
        </div>

        {/* Welcome section — vertically centered */}
        <div className="absolute inset-0 hidden flex-col items-start justify-center px-14 text-white lg:flex">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <p className="text-[2.75rem] font-bold leading-tight tracking-tight">
              <span className="lg:block">Welcome to your</span>{' '}
              <span
                className="inline-block max-w-full break-words lg:block"
                style={{
                  backgroundImage: PORTAL_TEXT_GRADIENT,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  color: 'transparent',
                }}
              >
                AICS Portal.
              </span>
            </p>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white">
              Access your academic resources, schedules, grades, and enrollment information in one
              place.
            </p>
          </motion.div>
        </div>

        {/* Footer notice — honest project status. The portal is an
            independent student project; it must never imply an official
            AICS IT department operates it. */}
        <div className="absolute inset-x-0 bottom-0 hidden items-center gap-2 px-14 pb-14 text-[11px] text-white/70 lg:flex">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden />
          <span>
            {INDEPENDENT_NOTICE}
          </span>
        </div>
      </section>
      {/* ===================== RIGHT 40% — Login panel ===================== */}
      <section
          className="relative z-10 flex w-full flex-1 items-start justify-center px-4 pb-6 pt-4 sm:px-10 max-lg:[@media(max-height:500px)]:pt-2 lg:-ml-12 lg:min-h-dvh lg:w-[calc(40%+3rem)] lg:items-center lg:rounded-l-[40px] lg:py-12"
        style={{ background: T.white }}
      >

        <div className="relative w-full max-w-sm lg:py-4">
          {/* Heading */}
          <div className="mb-3 max-lg:[@media(max-height:500px)]:mb-1 lg:mb-8">
            <div className="flex flex-wrap items-center justify-between gap-x-2">
              <h1 className="text-2xl font-bold leading-snug tracking-tight lg:text-[22px]" style={{ color: T.text }}>
                <span className="lg:hidden">Sign in</span><span className="hidden lg:inline">Sign in to AICS Portal</span>
              </h1>
              <a href="#signin-help" className="inline-flex min-h-11 items-center rounded-sm text-sm font-semibold text-link-strong focus-visible:outline-2 focus-visible:outline-link lg:hidden">Need help?</a>
            </div>
            <p className="mt-2 hidden text-sm lg:block" style={{ color: T.muted }}>
              Use your AICS credentials to access your student or staff portal.
            </p>
          </div>

          {/* Auth method switcher — credentials always; the mock Face ID
              tab is a development-only demo (camera + fake verification
              must never appear in production builds). */}
          {SHOW_DEMO_LOGIN && (
          <div
            className="grid grid-cols-2 gap-1 p-1 rounded-[10px] mb-6"
            style={{ background: T.bg, border: `1px solid ${T.border}` }}
            role="tablist"
            aria-label="Sign-in method"
          >
            <button
              type="button"
              role="tab"
              aria-selected={authMode === 'credentials'}
              onClick={() => setAuthMode('credentials')}
              className="rounded-[8px] py-2 text-xs font-medium transition-all inline-flex items-center justify-center gap-1.5"
              style={
                authMode === 'credentials'
                  ? { background: T.white, color: T.primary, boxShadow: '0 1px 2px rgba(23,50,77,0.08)' }
                  : { color: T.muted }
              }
            >
              <Lock className="w-3.5 h-3.5" aria-hidden /> Credentials
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={authMode === 'face'}
              onClick={() => setAuthMode('face')}
              className="rounded-[8px] py-2 text-xs font-medium transition-all inline-flex items-center justify-center gap-1.5"
              style={
                authMode === 'face'
                  ? { background: T.white, color: T.primary, boxShadow: '0 1px 2px rgba(23,50,77,0.08)' }
                  : { color: T.muted }
              }
            >
              <ScanFace className="w-3.5 h-3.5" aria-hidden /> Face ID
            </button>
          </div>
          )}

          <AnimatePresence mode="wait">
            {authMode === 'credentials' ? (
              <CredentialsForm key="cred" onLogin={onLogin} onDemoLogin={onDemoLogin} />
            ) : SHOW_DEMO_LOGIN ? (
              <FaceIdPanel key="face" onDemoLogin={onDemoLogin} />
            ) : null}
          </AnimatePresence>

          {/* Sign-in help notice. No in-house IT desk exists for this portal,
              password resets go through each branch's admin. */}
          <div
            id="signin-help"
            tabIndex={-1}
            className="mt-6 rounded-[10px] p-4"
            style={{ background: T.bg, border: `1px solid ${T.border}` }}
          >
            <div className="flex items-start gap-3">
              <CircleAlert
                className="w-4 h-4 flex-shrink-0 mt-0.5"
                style={{ color: T.muted }}
              />
              <div className="text-sm lg:text-xs leading-relaxed">
                <p className="font-semibold" style={{ color: T.text }}>
                  Need help signing in?
                </p>
                <p className="mt-0.5" style={{ color: T.muted }}>
                  Visit your branch admin or the registrar's office. They can reset your
                  password and get you back in.
                </p>
              </div>
            </div>
          </div>

          {/* Footer — matches the repository's documented licensing
              (LICENSE / README: All Rights Reserved, proprietary), plus the
              legal links required for the pre-auth surfaces. */}
          <div className="mt-6 text-center">
            {/* #64748B is the v3 slate-500 this line has always rendered;
                the v4 class would shift it by 1-3 channels (G4 parity
                caught exactly this), so the literal stays and only the
                dark variant maps onto the themed slate-500. */}
            <p className="text-xs lg:text-[11px] text-[#64748B] dark:text-slate-500">
              &copy; {new Date().getFullYear()} {LEGAL.operatorName} · All Rights Reserved
            </p>
            <nav aria-label="Legal" className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs lg:text-[11px]">
              {POLICY_PAGES.map((p) => (
                <Link
                  key={p.href}
                  href={p.href}
                  className="inline-flex min-h-11 items-center underline underline-offset-2 hover:text-slate-700 lg:min-h-0"
                  style={{ color: T.muted }}
                >
                  {p.label}
                </Link>
              ))}
              <CookieSettingsButton
                label="Cookie settings"
                className="min-h-11 text-xs lg:min-h-0 lg:text-[11px] text-slate-500 underline underline-offset-2 hover:text-slate-700"
              />
            </nav>
          </div>
        </div>
      </section>


    </main>
    </MotionConfig>
  )
}
