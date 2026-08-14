'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ScanFace,
  Camera,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  User,
  Lock,
  CircleAlert,
  UserRound,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import type { AuthMode, FaceState } from '@/lib/aics/types'

interface LoginViewProps {
  onLogin: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>
}

// ---------------------------------------------------------------------------
//  Login-scoped institutional design tokens.
//  Scoped to this view so the dashboard / profile keep their existing palette.
//  Reference direction: real university IT portal — restrained, mature, clean.
// ---------------------------------------------------------------------------
const T = {
  white: '#FFFFFF',
  bg: '#F7F9FB', // page / help-box background
  border: '#D9E0E6',
  text: '#17324D', // primary text / headings
  muted: '#6B7785', // secondary text / icons
  primary: '#1769AA', // primary action blue
  primaryDark: '#124D7A', // hover / pressed
  accent: '#2F9ED8', // small accents, focus ring, scan line
} as const

// Whether to expose the demo / test-login shortcut (dev only).
const SHOW_DEMO_LOGIN = process.env.NODE_ENV === 'development'

// Dev-only demo credentials. These match the student record seeded in
// MongoDB (scripts/seed-mongodb.ts) and exist ONLY so developers can
// log in with one click during local development. They are NOT mock
// data — the auth still hits the real MongoDB via /api/auth/login.
const DEV_CREDENTIALS = { username: 'juan.santos', password: 'student123' } as const

// Gradient for the "AICS Portal." accent text — top (#4EA4D7) to bottom (#64BFE9)
const PORTAL_TEXT_GRADIENT = 'linear-gradient(to bottom, #4EA4D7 0%, #64BFE9 100%)'

/**
 * The AICS login page — a 60/40 split layout with the school image on
 * the left and a white login panel (with rounded left corners) on the
 * right. Supports two auth modes: Credentials (username/password) and
 * Face ID (webcam-based).
 *
 * Visual direction: institutional / professional university IT portal.
 */
export function LoginView({ onLogin }: LoginViewProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('credentials')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [faceState, setFaceState] = useState<FaceState>('idle')
  const [faceProgress, setFaceProgress] = useState(0)
  const [streamError, setStreamError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current)
      scanTimerRef.current = null
    }
  }, [])

  useEffect(() => () => stopStream(), [stopStream])

  const startFaceScan = useCallback(async () => {
    setStreamError(null)
    setFaceProgress(0)
    setFaceState('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setFaceState('scanning')
      let p = 0
      scanTimerRef.current = setInterval(() => {
        p += Math.random() * 7 + 3
        if (p >= 100) {
          p = 100
          if (scanTimerRef.current) clearInterval(scanTimerRef.current)
          setFaceProgress(100)
          setFaceState('verifying')
          setTimeout(() => {
            setFaceState('success')
            toast.success('Face verified. Welcome back to AICS Portal.')
            // Face ID is a mock — log in with the dev demo credentials
            setTimeout(() => {
              onLogin(DEV_CREDENTIALS.username, DEV_CREDENTIALS.password)
            }, 1200)
          }, 1100)
        } else {
          setFaceProgress(p)
        }
      }, 220)
    } catch (err) {
      const e = err as DOMException
      setStreamError(
        e?.name === 'NotAllowedError'
          ? 'Camera access was denied. Please enable camera permissions in your browser.'
          : 'Unable to access camera. Please check your device and try again.'
      )
      setFaceState('error')
      stopStream()
    }
  }, [stopStream, onLogin])

  const cancelFaceScan = useCallback(() => {
    stopStream()
    setFaceState('idle')
    setFaceProgress(0)
    setStreamError(null)
  }, [stopStream])

  const retryFaceScan = useCallback(() => {
    cancelFaceScan()
    setTimeout(() => startFaceScan(), 50)
  }, [cancelFaceScan, startFaceScan])

  const handleCredentialSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!username.trim() || !password.trim()) {
        toast.error('Please enter both your username and password.')
        return
      }
      setSubmitting(true)
      try {
        const result = await onLogin(username.trim(), password)
        if (!result.ok) {
          setSubmitting(false)
          toast.error(result.error || 'Invalid username or password.')
          return
        }
        toast.success('Signed in. Redirecting to your AICS dashboard...')
      } catch {
        setSubmitting(false)
        toast.error('Network error. Please try again.')
      }
    },
    [username, password, onLogin]
  )

  const handleTestLogin = useCallback(async () => {
    setUsername(DEV_CREDENTIALS.username)
    setPassword(DEV_CREDENTIALS.password)
    setSubmitting(true)
    try {
      const result = await onLogin(DEV_CREDENTIALS.username, DEV_CREDENTIALS.password)
      if (!result.ok) {
        setSubmitting(false)
        toast.error(result.error || 'Test login failed.')
        return
      }
      toast.success('Test login successful. Welcome, Juan!')
    } catch {
      setSubmitting(false)
      toast.error('Network error. Please try again.')
    }
  }, [onLogin])

  return (
    <main
      className="w-full min-h-dvh flex flex-col lg:flex-row font-sans"
      style={{ background: T.white, color: T.text }}
    >
      {/* ===================== LEFT 60% ===================== */}
      {/*
        Left panel: uses min-height (not fixed height) on large screens so it
        can grow taller than the viewport when the browser is zoomed and the
        right panel needs more room (flex stretches both columns to the same
        height). On mobile it has a fixed hero height (42vh).
        overflow-hidden only clips the decorative background image / overlay.
      */}
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
        {/* Restrained dark navy overlay — ensures text readability without saturation */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(160deg, rgba(23,50,77,0.78) 0%, rgba(18,77,122,0.92) 100%)',
          }}
        />

        {/* Top brand row — logo (2x) + institution name on two lines */}
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

        {/* Welcome section — vertically centered in the left panel */}
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

        {/* Footer notice — kept anchored at the bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-6 sm:px-10 lg:px-14 pb-10 lg:pb-14 flex items-center gap-2 text-[11px] text-white/45">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Protected by AICS Information Technology Services</span>
        </div>
      </section>

      {/* ===================== RIGHT 40% — Login panel ===================== */}
      {/*
        Right panel: uses min-height (100dvh) instead of fixed height (100vh)
        so the panel can grow taller than the viewport when the browser is
        zoomed and the form needs more room. items-center centers the form
        vertically when there's space; when the form is taller than the
        viewport, the section grows and the page scrolls naturally instead
        of clipping. Vertical padding is always on (py-12) so content has
        breathing room from the top/bottom edges even when scrolling.
      */}
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
              onClick={() => {
                setAuthMode('credentials')
                if (faceState !== 'idle') cancelFaceScan()
              }}
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
              <motion.form
                key="cred"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleCredentialSubmit}
                className="space-y-4"
              >
                {/* Username */}
                <div className="space-y-1.5">
                  <label htmlFor="username" className="block text-xs font-medium" style={{ color: T.text }}>
                    Username
                  </label>
                  <div className="relative">
                    <User
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      style={{ color: T.muted }}
                    />
                    <input
                      id="username"
                      type="text"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. juan.delacruz"
                      className="w-full h-11 pl-10 pr-3 rounded-[8px] text-sm bg-white border outline-none transition-colors"
                      style={{ borderColor: T.border, color: T.text }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = T.primary
                        e.currentTarget.style.boxShadow = `0 0 0 3px ${T.accent}26`
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = T.border
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label htmlFor="password" className="block text-xs font-medium" style={{ color: T.text }}>
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      style={{ color: T.muted }}
                    />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full h-11 pl-10 pr-10 rounded-[8px] text-sm bg-white border outline-none transition-colors"
                      style={{ borderColor: T.border, color: T.text }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = T.primary
                        e.currentTarget.style.boxShadow = `0 0 0 3px ${T.accent}26`
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = T.border
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors hover:bg-gray-50"
                      style={{ color: T.muted }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember me + Forgot password */}
                <div className="flex items-center justify-between pt-1">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={remember}
                      onClick={() => setRemember((r) => !r)}
                      className="w-4 h-4 rounded-[4px] flex items-center justify-center flex-shrink-0 transition-colors"
                      style={
                        remember
                          ? { background: T.primary, border: `1.5px solid ${T.primary}` }
                          : { background: T.white, border: `1.5px solid ${T.border}` }
                      }
                    >
                      {remember && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </button>
                    <span className="text-xs" style={{ color: T.muted }}>
                      Remember me
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => toast.info('Contact the AICS IT Office to reset your password.')}
                    className="text-xs font-medium transition-colors hover:underline"
                    style={{ color: T.primary }}
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Sign In — primary action */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 rounded-[8px] font-semibold text-sm text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-1"
                  style={{ background: T.primary }}
                  onMouseEnter={(e) => {
                    if (!submitting) e.currentTarget.style.background = T.primaryDark
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = T.primary
                  }}
                >
                  {submitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </button>

                {/* Demo / test login — development only, visually unobtrusive */}
                {SHOW_DEMO_LOGIN && (
                  <>
                    <div className="flex items-center gap-3 pt-3">
                      <div className="flex-1 h-px" style={{ background: T.border }} />
                      <span className="text-[10px] uppercase tracking-wider" style={{ color: T.muted }}>
                        Demo
                      </span>
                      <div className="flex-1 h-px" style={{ background: T.border }} />
                    </div>
                    <button
                      type="button"
                      onClick={handleTestLogin}
                      disabled={submitting}
                      className="w-full h-10 rounded-[8px] text-xs font-medium flex items-center justify-center gap-2 transition-colors hover:bg-gray-50"
                      style={{ background: T.white, border: `1px dashed ${T.border}`, color: T.muted }}
                    >
                      <UserRound className="w-3.5 h-3.5" /> Test Student Login
                    </button>
                    <p className="text-center text-[10px]" style={{ color: T.muted }}>
                      <span className="font-mono">{DEV_CREDENTIALS.username}</span>
                      {' / '}
                      <span className="font-mono">{DEV_CREDENTIALS.password}</span>
                    </p>
                  </>
                )}
              </motion.form>
            ) : (
              <motion.div
                key="face"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Face video area */}
                <div
                  className="relative aspect-square w-full rounded-[12px] overflow-hidden flex items-center justify-center"
                  style={{ background: T.text, border: `1px solid ${T.border}` }}
                >
                  {(faceState === 'starting' ||
                    faceState === 'scanning' ||
                    faceState === 'verifying' ||
                    faceState === 'success') && (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ transform: 'scaleX(-1)' }}
                    />
                  )}

                  {faceState === 'idle' && (
                    <div className="text-center px-6">
                      <div
                        className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-3"
                        style={{ background: 'rgba(255,255,255,0.08)' }}
                      >
                        <ScanFace className="w-8 h-8" style={{ color: T.accent }} />
                      </div>
                      <p className="text-white text-sm font-medium">Face Recognition</p>
                      <p className="text-white/50 text-xs mt-1 max-w-[220px] mx-auto leading-relaxed">
                        Click start and look directly at the camera. Your face is your password.
                      </p>
                    </div>
                  )}

                  {(faceState === 'scanning' || faceState === 'verifying') && (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div
                          className="relative w-[56%] aspect-[3/4] rounded-[40%]"
                          style={{
                            border: `2px solid ${T.accent}`,
                            boxShadow: `0 0 0 3px ${T.accent}22`,
                          }}
                        >
                          {[
                            '-top-1 -left-1 border-t-2 border-l-2',
                            '-top-1 -right-1 border-t-2 border-r-2',
                            '-bottom-1 -left-1 border-b-2 border-l-2',
                            '-bottom-1 -right-1 border-b-2 border-r-2',
                          ].map((pos) => (
                            <span
                              key={pos}
                              className={`absolute ${pos} w-3.5 h-3.5 rounded-sm`}
                              style={{ borderColor: T.accent }}
                            />
                          ))}
                        </div>
                      </div>
                      <motion.div
                        className="absolute left-0 right-0 h-[2px]"
                        style={{
                          background: `linear-gradient(90deg, transparent, ${T.accent}, transparent)`,
                        }}
                        initial={{ top: '12%' }}
                        animate={{ top: ['12%', '86%', '12%'] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                      />
                      <div className="absolute bottom-3 left-3 right-3">
                        <div className="flex items-center justify-between text-[10px] text-white/75 mb-1.5">
                          <span className="inline-flex items-center gap-1">
                            <Camera className="w-3 h-3" />
                            {faceState === 'verifying' ? 'Verifying identity...' : 'Scanning face...'}
                          </span>
                          <span>{Math.round(faceProgress)}%</span>
                        </div>
                        <div
                          className="h-1.5 rounded-full overflow-hidden"
                          style={{ background: 'rgba(255,255,255,0.15)' }}
                        >
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${faceProgress}%`,
                              background: T.primary,
                            }}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {faceState === 'success' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
                      style={{ background: `${T.text}E6` }}
                    >
                      <motion.div
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 220, damping: 16 }}
                        className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                        style={{ background: T.primary }}
                      >
                        <ShieldCheck className="w-8 h-8 text-white" />
                      </motion.div>
                      <p className="text-white font-semibold text-sm">Identity Verified</p>
                      <p className="text-white/55 text-xs mt-1">Redirecting to portal...</p>
                    </motion.div>
                  )}

                  {faceState === 'error' && (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
                      style={{ background: T.text }}
                    >
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
                        style={{ background: 'rgba(220,38,38,0.16)' }}
                      >
                        <AlertTriangle className="w-7 h-7 text-red-400" />
                      </div>
                      <p className="text-white text-sm font-medium">Camera Unavailable</p>
                      <p className="text-white/50 text-xs mt-1 max-w-[220px] leading-relaxed">
                        {streamError || 'Please check your camera and try again.'}
                      </p>
                    </div>
                  )}
                </div>

                {faceState === 'idle' && (
                  <button
                    type="button"
                    onClick={startFaceScan}
                    className="w-full h-11 rounded-[8px] font-semibold text-sm text-white transition-colors"
                    style={{ background: T.primary }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = T.primaryDark)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = T.primary)}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Camera className="w-4 h-4" /> Start Face Recognition
                    </span>
                  </button>
                )}

                {(faceState === 'scanning' || faceState === 'verifying' || faceState === 'starting') && (
                  <button
                    type="button"
                    onClick={cancelFaceScan}
                    className="w-full h-11 rounded-[8px] font-medium text-sm transition-colors hover:bg-gray-50"
                    style={{ background: T.white, border: `1px solid ${T.border}`, color: T.text }}
                  >
                    Cancel
                  </button>
                )}

                {faceState === 'error' && (
                  <button
                    type="button"
                    onClick={retryFaceScan}
                    className="w-full h-11 rounded-[8px] font-semibold text-sm text-white transition-colors"
                    style={{ background: T.primary }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = T.primaryDark)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = T.primary)}
                  >
                    <span className="inline-flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" /> Try Again
                    </span>
                  </button>
                )}

                {faceState === 'success' && (
                  <button
                    type="button"
                    onClick={cancelFaceScan}
                    className="w-full h-11 rounded-[8px] font-medium text-sm transition-colors hover:bg-gray-50"
                    style={{ background: T.white, border: `1px solid ${T.border}`, color: T.text }}
                  >
                    Reset
                  </button>
                )}
              </motion.div>
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
