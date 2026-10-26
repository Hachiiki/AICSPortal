'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ScanFace,
  Camera,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import type { FaceState } from '@/lib/aics/types'
import { T } from './login-tokens'

// ============================================================
//  FaceIdPanel — the Face ID webcam panel (DEVELOPMENT ONLY).
//  Extracted from LoginView.tsx to reduce its size and complexity
//  (was 670 lines / CRAP 812).
//
//  This is a MOCK face recognition: it starts the webcam, shows a
//  scanning animation, then "verifies" and calls onDemoLogin, which
//  issues a real server session for the demo student. No biometric
//  matching happens and no image or video ever leaves the browser —
//  the tab itself only renders in development builds
//  (SHOW_DEMO_LOGIN gate in LoginView), and startFaceScan refuses to
//  touch the camera outside development as defense in depth.
// ============================================================

interface FaceIdPanelProps {
  onDemoLogin: () => Promise<{ ok: boolean; error?: string }>
}

export function FaceIdPanel({ onDemoLogin }: FaceIdPanelProps) {
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

  // Cleanup on unmount
  useEffect(() => () => stopStream(), [stopStream])

  const startFaceScan = useCallback(async () => {
    // Defense in depth: even if this panel is ever rendered outside a
    // development build, never request the camera there.
    if (process.env.NODE_ENV !== 'development') {
      setStreamError('The Face ID demo is disabled in this build. Use your credentials instead.')
      setFaceState('error')
      return
    }
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
            toast.success('Demo login starting. No face data was collected or stored.')
            // Face ID is a MOCK (no biometric matching) — dev-only demo login.
            // Phase 6: the server issues the demo session; no creds in the bundle.
            if (process.env.NODE_ENV !== 'development') {
              toast.error('Face ID demo is disabled in this build.')
              return
            }
            setTimeout(async () => {
              const result = await onDemoLogin()
              if (!result.ok) toast.error(result.error || 'Demo login failed.')
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
  }, [stopStream, onDemoLogin])

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

  return (
    <motion.div
      key="face"
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {/* Face video area: navy backdrop like the brand panel
          (brand-constant across themes, plan §2). */}
      <div
        className="relative aspect-square w-full rounded-[12px] overflow-hidden flex items-center justify-center"
        style={{ background: T.navy, border: `1px solid ${T.border}` }}
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
              <ScanFace className="w-8 h-8" style={{ color: T.accent }} aria-hidden />
            </div>
            <p className="text-white text-sm font-medium">Face Recognition (demo)</p>
            <p className="text-white/70 text-xs mt-1 max-w-[240px] mx-auto leading-relaxed">
              Development demo — the camera stream stays on this device and nothing is
              recorded or uploaded. No biometric verification takes place.
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
                  boxShadow: `0 0 0 3px ${T.accentSoft}`,
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
                  <Camera className="w-3 h-3" aria-hidden />
                  {faceState === 'verifying' ? 'Simulating verification...' : 'Scanning (demo)...'}
                </span>
                <span>{Math.round(faceProgress)}%</span>
              </div>
              <div
                role="progressbar"
                aria-label="Face scan progress"
                aria-valuenow={Math.round(faceProgress)}
                aria-valuemin={0}
                aria-valuemax={100}
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
            style={{ background: T.navyVeil }}
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
            <p className="text-white font-semibold text-sm">Scan complete</p>
            <p className="text-white/70 text-xs mt-1">Signing in to the demo session…</p>
          </motion.div>
        )}

        {faceState === 'error' && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
            style={{ background: T.navy }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
              style={{ background: 'rgba(220,38,38,0.16)' }}
            >
              <AlertTriangle className="w-7 h-7 text-red-600" />
            </div>
            <p className="text-white text-sm font-medium">Camera Unavailable</p>
            <p className="text-white/70 text-xs mt-1 max-w-[240px] mx-auto leading-relaxed">
              {streamError || 'Please check your camera and try again.'}
            </p>
          </div>
        )}
      </div>

      {faceState === 'idle' && (
        <button
          type="button"
          onClick={startFaceScan}
          className="w-full h-11 rounded-[8px] font-semibold text-sm text-white bg-[#1769AA] hover:bg-[#124D7A] active:scale-[0.99] transition-all"
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
          className="w-full h-11 rounded-[8px] font-semibold text-sm text-white bg-[#1769AA] hover:bg-[#124D7A] active:scale-[0.99] transition-all"
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
  )
}
