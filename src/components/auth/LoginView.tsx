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
import { TEST_CREDENTIALS } from '@/lib/aics/mock-data'

interface LoginViewProps {
  onLogin: () => void
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
            setTimeout(() => onLogin(), 1200)
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
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!username.trim() || !password.trim()) {
        toast.error('Please enter both your username and password.')
        return
      }
      setSubmitting(true)
      setTimeout(() => {
        setSubmitting(false)
        toast.success('Signed in. Redirecting to your AICS dashboard...')
        onLogin()
      }, 1200)
    },
    [username, password, onLogin]
  )

  const handleTestLogin = useCallback(() => {
    setUsername(TEST_CREDENTIALS.username)
    setPassword(TEST_CREDENTIALS.password)
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      toast.success('Test login successful. Welcome, Juan!')
      onLogin()
    }, 800)
  }, [onLogin])

  return (
    <main
      className="min-h-screen w-full flex flex-col lg:flex-row font-sans"
      style={{ background: T.white, color: T.text }}
    >
      {/* ===================== LEFT 60% ===================== */}
      <section
        className="relative lg:w-[60%] w-full h-[42vh] lg:h-screen overflow-hidden flex-shrink-0"
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

        {/* Top brand row — logo + institution name */}
        <div className="absolute top-0 left-0 right-0 px-6 sm:px-10 lg:px-14 py-7 flex items-center gap-3 text-white">
          <img
            src="/aics-logo.svg"
            alt="AICS logo"
            className="flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 object-contain"
          />
          <div className="leading-tight">
            <p className="text-[10px] tracking-[0.26em] uppercase text-white/55">Portal</p>
            <p className="text-[15px] sm:text-base font-semibold">
              Asian Institute of Computer Studies
            </p>
          </div>
        </div>

        {/* Welcome section — strong, restrained typography hierarchy */}
        <div className="absolute bottom-0 left-0 right-0 px-6 sm:px-10 lg:px-14 pb-10 lg:pb-14 text-white">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <p className="text-base sm:text-lg font-normal text-white/65">Welcome to your</p>
            <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold leading-tight mt-1">
              AICS Portal.
            </h1>
            <p className="mt-4 text-sm sm:text-[15px] text-white/70 max-w-md leading-relaxed">
              Access your academic resources, schedules, grades, and enrollment information in one
              place.
            </p>
          </motion.div>
          <div className="mt-6 flex items-center gap-2 text-[11px] text-white/45">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Protected by AICS Information Technology Services</span>
          </div>
        </div>
      </section>

      {/* ===================== RIGHT 40% — Login panel ===================== */}
      <section
        className="relative z-10 lg:w-[calc(40%+3rem)] w-full flex-1 lg:h-screen flex items-center justify-center px-6 sm:px-10 py-12 lg:py-0 lg:-ml-12 rounded-l-[40px]"
        style={{ background: T.white }}
      >
        <div className="relative w-full max-w-sm">
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
                      <span className="font-mono">{TEST_CREDENTIALS.username}</span>
                      {' / '}
                      <span className="font-mono">{TEST_CREDENTIALS.password}</span>
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
