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
} from 'lucide-react'
import { toast } from 'sonner'
import type { AuthMode, FaceState } from '@/lib/aics/types'
import { PALETTE } from '@/lib/aics/palette'
import { TEST_CREDENTIALS } from '@/lib/aics/mock-data'

interface LoginViewProps {
  onLogin: () => void
}

/**
 * The AICS login page — a 60/40 split layout with the school image on
 * the left and a white login panel (with rounded left corners) on the
 * right. Supports two auth modes: Credentials (username/password) and
 * Face ID (webcam-based). Includes a "Test Student Login" shortcut.
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
      style={{ background: PALETTE.white, color: PALETTE.navy }}
    >
      {/* ============ LEFT 60% ============ */}
      <section
        className="relative lg:w-[60%] w-full h-[40vh] lg:h-screen overflow-hidden flex-shrink-0"
        style={{ background: PALETTE.navy }}
      >
        <img
          src="/aics-campus.jpg"
          alt="Asian Institute of Computer Studies campus"
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).style.display = 'none'
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${PALETTE.navy}E6 0%, ${PALETTE.ocean}B3 45%, ${PALETTE.azure}66 100%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.07] mix-blend-overlay"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Top brand row */}
        <div className="absolute top-0 left-0 right-0 px-6 sm:px-10 lg:px-14 py-7 flex items-center gap-3 text-white">
          <img
            src="/aics-logo.svg"
            alt="AICS logo"
            className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 object-contain"
          />
          <div className="leading-tight">
            <p className="text-[11px] tracking-[0.28em] uppercase text-white/70">Portal</p>
            <p className="text-base sm:text-lg font-semibold">
              Asian Institute of Computer Studies
            </p>
          </div>
        </div>

        {/* Hero text bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-6 sm:px-10 lg:px-14 pb-10 lg:pb-14 text-white">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight max-w-xl">
              Welcome to your <span style={{ color: PALETTE.sky }}>AICS Portal</span>.
            </h1>
            <p className="mt-4 text-sm sm:text-base text-white/80 max-w-md leading-relaxed">
              Secure access to your enrollment records, class schedules, grades, and academic
              resources — all in one place.
            </p>
          </motion.div>
          <div className="mt-6 flex items-center gap-2 text-[11px] text-white/55">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Protected by AICS Information Technology Services</span>
          </div>
        </div>
      </section>

      {/* ============ RIGHT 40% ============ */}
      <section
        className="relative z-10 lg:w-[calc(40%+3rem)] w-full flex-1 lg:h-screen flex items-center justify-center px-6 sm:px-10 py-12 lg:py-0 lg:-ml-12 rounded-l-[40px]"
        style={{ background: PALETTE.white }}
      >
        <div className="relative w-full max-w-sm">
          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: PALETTE.navy }}>
              {authMode === 'credentials' ? 'Account Login' : 'Face Recognition'}
            </h2>
            <p className="text-sm mt-1.5" style={{ color: '#6b7280' }}>
              {authMode === 'credentials'
                ? 'Enter your AICS credentials below to access your portal.'
                : 'Position your face within the frame for biometric verification.'}
            </p>
          </div>

          {/* Mode toggle */}
          <div
            className="grid grid-cols-2 gap-1 p-1 rounded-xl mb-6"
            style={{ background: PALETTE.mist + '55' }}
          >
            <button
              type="button"
              onClick={() => {
                setAuthMode('credentials')
                if (faceState !== 'idle') cancelFaceScan()
              }}
              className="text-xs font-semibold py-2.5 rounded-lg transition-all"
              style={
                authMode === 'credentials'
                  ? { background: PALETTE.white, color: PALETTE.navy, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                  : { color: PALETTE.ocean }
              }
            >
              <span className="inline-flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Credentials
              </span>
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('face')}
              className="text-xs font-semibold py-2.5 rounded-lg transition-all"
              style={
                authMode === 'face'
                  ? { background: PALETTE.white, color: PALETTE.navy, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                  : { color: PALETTE.ocean }
              }
            >
              <span className="inline-flex items-center gap-1.5">
                <ScanFace className="w-3.5 h-3.5" /> Face ID
              </span>
            </button>
          </div>

          <AnimatePresence mode="wait">
            {authMode === 'credentials' ? (
              <motion.form
                key="cred"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleCredentialSubmit}
                className="space-y-4"
              >
                {/* Username */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="username"
                    className="text-xs font-medium"
                    style={{ color: PALETTE.navy }}
                  >
                    Username
                  </label>
                  <div className="relative">
                    <User
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                      style={{ color: PALETTE.azure }}
                    />
                    <input
                      id="username"
                      type="text"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. juan.delacruz"
                      className="w-full pl-10 pr-3 py-2.5 rounded-lg text-sm bg-white border outline-none transition-all"
                      style={{ borderColor: PALETTE.mist, color: PALETTE.navy }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = PALETTE.azure
                        e.currentTarget.style.boxShadow = `0 0 0 3px ${PALETTE.sky}33`
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = PALETTE.mist
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="password"
                    className="text-xs font-medium"
                    style={{ color: PALETTE.navy }}
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                      style={{ color: PALETTE.azure }}
                    />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm bg-white border outline-none transition-all"
                      style={{ borderColor: PALETTE.mist, color: PALETTE.navy }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = PALETTE.azure
                        e.currentTarget.style.boxShadow = `0 0 0 3px ${PALETTE.sky}33`
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = PALETTE.mist
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-gray-100 transition-colors"
                      style={{ color: PALETTE.ocean }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember + forgot */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={remember}
                      onClick={() => setRemember((r) => !r)}
                      className="relative w-9 h-5 rounded-full transition-colors"
                      style={{ background: remember ? PALETTE.azure : PALETTE.mist }}
                    >
                      <span
                        className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm"
                        style={{ transform: remember ? 'translateX(16px)' : 'translateX(0)' }}
                      />
                    </button>
                    <span style={{ color: PALETTE.navy }}>Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => toast.info('Contact the AICS IT Office to reset your password.')}
                    className="font-medium hover:underline"
                    style={{ color: PALETTE.ocean }}
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-2 py-3 rounded-lg font-semibold text-sm text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg active:scale-[0.99]"
                  style={{
                    background: `linear-gradient(135deg, ${PALETTE.ocean} 0%, ${PALETTE.azure} 100%)`,
                    boxShadow: `0 6px 16px -6px ${PALETTE.ocean}88`,
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

                {/* Test login divider */}
                <div className="flex items-center gap-3 pt-2">
                  <div className="flex-1 h-px" style={{ background: PALETTE.mist }} />
                  <span
                    className="text-[10px] uppercase tracking-wider"
                    style={{ color: '#9ca3af' }}
                  >
                    or
                  </span>
                  <div className="flex-1 h-px" style={{ background: PALETTE.mist }} />
                </div>

                {/* Test Student Login */}
                <button
                  type="button"
                  onClick={handleTestLogin}
                  disabled={submitting}
                  className="w-full py-2.5 rounded-lg font-semibold text-sm transition-all hover:shadow-md active:scale-[0.99] flex items-center justify-center gap-2"
                  style={{
                    background: PALETTE.white,
                    border: `1.5px dashed ${PALETTE.azure}`,
                    color: PALETTE.ocean,
                  }}
                >
                  <UserRound className="w-4 h-4" />
                  Test Student Login
                </button>
                <p className="text-center text-[10px]" style={{ color: '#9ca3af' }}>
                  Demo account:{' '}
                  <span className="font-mono font-semibold" style={{ color: PALETTE.ocean }}>
                    {TEST_CREDENTIALS.username}
                  </span>{' '}
                  /{' '}
                  <span className="font-mono font-semibold" style={{ color: PALETTE.ocean }}>
                    {TEST_CREDENTIALS.password}
                  </span>
                </p>
              </motion.form>
            ) : (
              <motion.div
                key="face"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {/* Face video area */}
                <div
                  className="relative aspect-square w-full rounded-2xl overflow-hidden flex items-center justify-center"
                  style={{ background: PALETTE.navy, boxShadow: `inset 0 0 0 1px ${PALETTE.mist}` }}
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
                        className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-3"
                        style={{ background: 'rgba(255,255,255,0.08)' }}
                      >
                        <ScanFace className="w-10 h-10" style={{ color: PALETTE.sky }} />
                      </div>
                      <p className="text-white text-sm font-medium">Face Recognition</p>
                      <p className="text-white/55 text-xs mt-1 max-w-[220px] mx-auto">
                        Click start and look directly at the camera. Your face is your password.
                      </p>
                    </div>
                  )}

                  {(faceState === 'scanning' || faceState === 'verifying') && (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div
                          className="relative w-[58%] aspect-[3/4] rounded-[42%]"
                          style={{
                            border: `2px solid ${PALETTE.sky}`,
                            boxShadow: `0 0 0 4px ${PALETTE.sky}22, inset 0 0 30px ${PALETTE.sky}33`,
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
                              className={`absolute ${pos} w-4 h-4 rounded-sm`}
                              style={{ borderColor: PALETTE.sky }}
                            />
                          ))}
                        </div>
                      </div>
                      <motion.div
                        className="absolute left-0 right-0 h-[2px]"
                        style={{
                          background: `linear-gradient(90deg, transparent, ${PALETTE.sky}, transparent)`,
                          boxShadow: `0 0 12px ${PALETTE.sky}`,
                        }}
                        initial={{ top: '10%' }}
                        animate={{ top: ['10%', '88%', '10%'] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                      />
                      <div className="absolute bottom-3 left-3 right-3">
                        <div className="flex items-center justify-between text-[10px] text-white/80 mb-1.5">
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
                              background: `linear-gradient(90deg, ${PALETTE.sky}, ${PALETTE.azure})`,
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
                      style={{ background: `${PALETTE.navy}E6` }}
                    >
                      <motion.div
                        initial={{ scale: 0.4 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                        className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                        style={{ background: PALETTE.sky }}
                      >
                        <ShieldCheck className="w-10 h-10 text-white" />
                      </motion.div>
                      <p className="text-white font-semibold text-base">Identity Verified</p>
                      <p className="text-white/60 text-xs mt-1">Redirecting to portal...</p>
                    </motion.div>
                  )}

                  {faceState === 'error' && (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
                      style={{ background: PALETTE.navy }}
                    >
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                        style={{ background: 'rgba(220,38,38,0.18)' }}
                      >
                        <AlertTriangle className="w-8 h-8 text-red-400" />
                      </div>
                      <p className="text-white text-sm font-medium">Camera Unavailable</p>
                      <p className="text-white/55 text-xs mt-1 max-w-[220px]">
                        {streamError || 'Please check your camera and try again.'}
                      </p>
                    </div>
                  )}
                </div>

                {faceState === 'idle' && (
                  <button
                    type="button"
                    onClick={startFaceScan}
                    className="w-full py-3 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg active:scale-[0.99]"
                    style={{
                      background: `linear-gradient(135deg, ${PALETTE.ocean} 0%, ${PALETTE.azure} 100%)`,
                      boxShadow: `0 6px 16px -6px ${PALETTE.ocean}88`,
                    }}
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
                    className="w-full py-3 rounded-lg font-semibold text-sm transition-all hover:bg-gray-50 active:scale-[0.99]"
                    style={{
                      background: PALETTE.white,
                      border: `1px solid ${PALETTE.mist}`,
                      color: PALETTE.navy,
                    }}
                  >
                    Cancel
                  </button>
                )}

                {faceState === 'error' && (
                  <button
                    type="button"
                    onClick={retryFaceScan}
                    className="w-full py-3 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg active:scale-[0.99]"
                    style={{
                      background: `linear-gradient(135deg, ${PALETTE.ocean} 0%, ${PALETTE.azure} 100%)`,
                    }}
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
                    className="w-full py-3 rounded-lg font-semibold text-sm transition-all hover:bg-gray-50"
                    style={{
                      background: PALETTE.white,
                      border: `1px solid ${PALETTE.mist}`,
                      color: PALETTE.navy,
                    }}
                  >
                    Reset
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* IT support note */}
          <div
            className="mt-6 flex items-start gap-2.5 p-3.5 rounded-xl text-xs leading-relaxed"
            style={{
              background: `${PALETTE.sky}1A`,
              border: `1px solid ${PALETTE.sky}55`,
              color: PALETTE.navy,
            }}
          >
            <CircleAlert
              className="w-4 h-4 flex-shrink-0 mt-0.5"
              style={{ color: PALETTE.ocean }}
            />
            <p>
              <span className="font-semibold">Having trouble signing in?</span> Please contact the
              AICS IT Office at{' '}
              <a
                href="mailto:it-support@aics.edu.ph"
                className="font-medium underline decoration-dotted"
                style={{ color: PALETTE.ocean }}
              >
                it-support@aics.edu.ph
              </a>{' '}
              or call <span className="font-medium">(02) 8XXX-XXXX</span> for assistance.
            </p>
          </div>

          <p className="mt-6 text-center text-[11px]" style={{ color: '#9ca3af' }}>
            &copy; {new Date().getFullYear()} Asian Institute of Computer Studies. All rights
            reserved.
          </p>
        </div>
      </section>
    </main>
  )
}
