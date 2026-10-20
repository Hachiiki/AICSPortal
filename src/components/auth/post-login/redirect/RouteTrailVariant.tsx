'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { KeyRound, MapPin, LayoutDashboard, CheckCircle2, Flag, Loader2 } from 'lucide-react'
import { useAuthSequence } from './use-auth-sequence'
import { T } from '../../login-tokens'
import type { AuthStageProps } from './types'

// ============================================================
//  Route Trail — sign-in review variant A.
//
//  The sign-in as a journey: an accent line leaves the sign-in
//  origin, travels past three waypoints — credentials, branch,
//  portal — and arrives at the branch destination. The fill and
//  the traveling token always move TO the active waypoint, so the
//  position on the line is the progress; the destination only
//  completes on real readiness, exactly like the classic final
//  checkmark.
//
//  Same sequence logic as the production default (useAuthSequence):
//  identical timers, floor, readiness gate, and exit — only the
//  look differs.
// ============================================================

const WAYPOINTS = [
  { icon: KeyRound, label: 'Credentials', caption: 'Authenticating your credentials…' },
  { icon: MapPin, label: 'Branch', caption: 'Detecting your branch…' },
  { icon: LayoutDashboard, label: 'Portal', caption: 'Loading your portal…' },
] as const

// Waypoint centers as fractions of the track (origin 0 → destination 1).
const WAYPOINT_X = [0.25, 0.5, 0.75]

export function RouteTrailVariant({ branch, onComplete, readiness }: AuthStageProps) {
  const { step, finalChecked } = useAuthSequence({ readiness, onComplete })
  const branchDisplay = branch.charAt(0).toUpperCase() + branch.slice(1)

  // The line and token travel to the active waypoint; only real
  // readiness carries them to the destination.
  const progress = finalChecked ? 1 : WAYPOINT_X[Math.min(step, WAYPOINT_X.length - 1)]

  const caption = finalChecked
    ? `Redirecting to your branch: ${branchDisplay}`
    : WAYPOINTS[Math.min(step, WAYPOINTS.length - 1)].caption

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-white py-10"
    >
      <span role="status" className="sr-only">
        {caption}
      </span>

      <div className="w-full max-w-md px-8 sm:px-10">
        {/* Brand lockup */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="mb-12 sm:mb-14 flex items-center justify-center gap-2.5"
        >
          <img src="/aics-logo.svg" alt="AICS" className="w-9 h-9 object-contain" />
          <span className="text-[15px] font-semibold" style={{ color: T.text }}>
            AICS Portal
          </span>
        </motion.div>

        {/* The route track */}
        <div className="relative h-[88px] mb-7 sm:mb-8">
          {/* Base line */}
          <div className="absolute left-0 right-0 top-[27px] h-[2px] rounded-full bg-slate-200" />
          {/* Progress fill */}
          <motion.div
            className="absolute left-0 top-[27px] h-[2px] w-full origin-left rounded-full"
            style={{ background: T.primary }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: progress }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          />
          {/* Origin */}
          <div className="absolute left-0 top-[23px] w-2.5 h-2.5 -translate-x-1/2 rounded-full bg-slate-300" />
          <span
            className="absolute left-0 top-[54px] -translate-x-1/2 text-[10px] font-medium whitespace-nowrap"
            style={{ color: T.muted }}
          >
            Sign-in
          </span>

          {/* Waypoints */}
          {WAYPOINTS.map((w, i) => {
            const done = i < step || (finalChecked && i === WAYPOINTS.length - 1)
            const active = i === step && !done
            const Icon = w.icon
            return (
              <div
                key={w.label}
                className="absolute top-[10px] -translate-x-1/2"
                style={{ left: `${WAYPOINT_X[i] * 100}%` }}
              >
                <div className="relative">
                  <motion.div
                    initial={false}
                    animate={{
                      backgroundColor: done ? T.primary : '#FFFFFF',
                      borderColor: done || active ? T.primary : '#CBD5E1',
                    }}
                    transition={{ duration: 0.25 }}
                    className="w-9 h-9 rounded-full grid place-items-center border-2"
                  >
                    {done ? (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    ) : (
                      <Icon className="w-4 h-4" style={{ color: active ? T.primary : '#94A3B8' }} />
                    )}
                  </motion.div>
                  {/* Active pulse */}
                  {active && (
                    <motion.span
                      className="absolute inset-0 rounded-full border-2"
                      style={{ borderColor: T.accent }}
                      animate={{ scale: [1, 1.35, 1], opacity: [0.55, 0, 0.55] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                </div>
                <span
                  className="absolute left-1/2 top-[44px] -translate-x-1/2 text-[10px] sm:text-[11px] font-medium whitespace-nowrap"
                  style={{ color: done || active ? T.text : T.muted }}
                >
                  {w.label}
                </span>
              </div>
            )
          })}

          {/* Destination */}
          <div className="absolute right-0 top-[8px] translate-x-1/2">
            <motion.div
              initial={false}
              animate={{
                scale: finalChecked ? 1 : 0.82,
                opacity: step >= 2 || finalChecked ? 1 : 0.55,
              }}
              transition={
                finalChecked ? { type: 'spring', stiffness: 380, damping: 16 } : { duration: 0.25 }
              }
              className="w-10 h-10 rounded-full grid place-items-center shadow-md"
              style={{ background: finalChecked ? T.primary : '#FFFFFF' }}
            >
              {finalChecked ? (
                <Flag className="text-white" style={{ width: 18, height: 18 }} />
              ) : (
                <Loader2
                  className="animate-spin"
                  style={{ width: 16, height: 16, color: T.primary }}
                />
              )}
            </motion.div>
          </div>
          {/* Destination label — the branch, once detected */}
          <AnimatePresence>
            {step >= 1 && (
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute right-0 top-[54px] translate-x-1/2 text-[10px] sm:text-[11px] font-semibold whitespace-nowrap"
                style={{ color: T.primary }}
              >
                {branchDisplay}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Traveling token */}
          <motion.div
            className="absolute top-[22px] -translate-x-1/2 w-3 h-3 rounded-full"
            style={{ background: T.accent, boxShadow: '0 0 0 3px rgba(41,147,207,0.25)' }}
            initial={{ left: '0%' }}
            animate={{ left: `${progress * 100}%` }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          />
        </div>

        {/* Stage caption */}
        <div className="h-5 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={caption}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="text-sm text-center"
              style={{ color: T.muted }}
            >
              {caption}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
