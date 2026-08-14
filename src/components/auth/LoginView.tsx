'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ScanFace,
  ShieldCheck,
  Lock,
  CircleAlert,
} from 'lucide-react'
import type { AuthMode } from '@/lib/aics/types'
import { T, PORTAL_TEXT_GRADIENT } from './login-tokens'
import { CredentialsForm } from './CredentialsForm'
import { FaceIdPanel } from './FaceIdPanel'

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

interface LoginViewProps {
  onLogin: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>
}

export function LoginView({ onLogin }: LoginViewProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('credentials')

  return (
    <main
      className="w-full min-h-dvh flex flex-col lg:flex-row font-sans"
      style={{ background: T.white, color: T.text }}
    >
      {/* ===================== LEFT 60% ===================== */}
      <section
        className="relative lg:w-[60%] w-full h-[42vh] lg:h-auto lg:min-h-dvh overflow-hidden flex-shrink-0"
        style={{ background: T.text }}
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

        {/* Top brand row — logo + institution name */}
        <div className="absolute top-0 left-0 right-0 px-6 sm:px-10 lg:px-14 py-7 flex items-center gap-4 text-white">
          <img
            src="/aics-logo.svg"
            alt="AICS logo"
            className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 object-contain"
          />
          <div className="leading-tight">
            <p className="text-base sm:text-lg font-semibold">Asian Institute</p>
            <p className="text-base sm:text-lg font-semibold">of Computer Studies</p>
          </div>
        </div>

        {/* Welcome section — vertically centered */}
        <div className="absolute inset-0 flex flex-col items-start justify-center px-6 sm:px-10 lg:px-14 text-white">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <p className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold leading-tight text-white">
              Welcome to your
            </p>
            <h1
              className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold leading-tight"
              style={{
                backgroundImage: PORTAL_TEXT_GRADIENT,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent',
              }}
            >
              AICS Portal.
            </h1>
            <p className="mt-4 text-sm sm:text-[15px] text-white max-w-md leading-relaxed">
              Access your academic resources, schedules, grades, and enrollment information in one
              place.
            </p>
          </motion.div>
        </div>

        {/* Footer notice */}
        <div className="absolute bottom-0 left-0 right-0 px-6 sm:px-10 lg:px-14 pb-10 lg:pb-14 flex items-center gap-2 text-[11px] text-white/45">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Protected by AICS Information Technology Services</span>
        </div>
      </section>

      {/* ===================== RIGHT 40% — Login panel ===================== */}
      <section
        className="relative z-10 lg:w-[calc(40%+3rem)] w-full flex-1 flex items-center justify-center px-6 sm:px-10 py-12 lg:min-h-dvh lg:-ml-12 rounded-l-[40px]"
        style={{ background: T.white }}
      >
        <div className="relative w-full max-w-sm py-4">
          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-[22px] font-bold tracking-tight leading-snug" style={{ color: T.text }}>
              Sign in to AICS Portal
            </h2>
            <p className="text-sm mt-2" style={{ color: T.muted }}>
              Use your AICS credentials to access your student or staff portal.
            </p>
          </div>

          {/* Auth method switcher (Credentials / Face ID) */}
          <div
            className="grid grid-cols-2 gap-1 p-1 rounded-[10px] mb-6"
            style={{ background: T.bg, border: `1px solid ${T.border}` }}
          >
            <button
              type="button"
              onClick={() => setAuthMode('credentials')}
              className="rounded-[8px] py-2 text-xs font-medium transition-all inline-flex items-center justify-center gap-1.5"
              style={
                authMode === 'credentials'
                  ? { background: T.white, color: T.primary, boxShadow: '0 1px 2px rgba(23,50,77,0.08)' }
                  : { color: T.muted }
              }
            >
              <Lock className="w-3.5 h-3.5" /> Credentials
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('face')}
              className="rounded-[8px] py-2 text-xs font-medium transition-all inline-flex items-center justify-center gap-1.5"
              style={
                authMode === 'face'
                  ? { background: T.white, color: T.primary, boxShadow: '0 1px 2px rgba(23,50,77,0.08)' }
                  : { color: T.muted }
              }
            >
              <ScanFace className="w-3.5 h-3.5" /> Face ID
            </button>
          </div>

          <AnimatePresence mode="wait">
            {authMode === 'credentials' ? (
              <CredentialsForm key="cred" onLogin={onLogin} />
            ) : (
              <FaceIdPanel key="face" onLogin={onLogin} />
            )}
          </AnimatePresence>

          {/* IT support notice */}
          <div
            className="mt-6 rounded-[10px] p-4"
            style={{ background: T.bg, border: `1px solid ${T.border}` }}
          >
            <div className="flex items-start gap-3">
              <CircleAlert
                className="w-4 h-4 flex-shrink-0 mt-0.5"
                style={{ color: T.muted }}
              />
              <div className="text-xs leading-relaxed">
                <p className="font-semibold" style={{ color: T.text }}>
                  Need help signing in?
                </p>
                <p className="mt-0.5" style={{ color: T.muted }}>
                  Contact AICS IT Support at{' '}
                  <a
                    href="mailto:it-support@aics.edu.ph"
                    className="font-medium transition-colors hover:underline"
                    style={{ color: T.primary }}
                  >
                    it-support@aics.edu.ph
                  </a>{' '}
                  or call <span className="font-medium" style={{ color: T.text }}>(02) 8XXX-XXXX</span>.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-[11px]" style={{ color: '#9aa5b1' }}>
            &copy; {new Date().getFullYear()} Asian Institute of Computer Studies. All rights reserved.
          </p>
        </div>
      </section>
    </main>
  )
}
