'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { KeyRound, MapPin, LayoutDashboard, CheckCircle2 } from 'lucide-react'
import { useAuthSequence } from './use-auth-sequence'
import { T, PORTAL_TEXT_GRADIENT } from '../../login-tokens'
import type { AuthStageProps } from './types'

// ============================================================
//  Focus Stages — sign-in review variant C.
//
//  The school navy from the login page's campus side carries the
//  moment: one stage at a time, in bold type, with its glyph and a
//  one-line caption, crossfading forward. A segmented bar tracks the
//  three stages; the last segment fills only on real readiness, and
//  the final stage's glyph breathes while it honestly holds for the
//  initial-data load — the dark counterpart of the classic final
//  spinner. The exit fade hands off into the assembling portal as
//  the white workspace arrives.
//
//  Same sequence logic as the production default (useAuthSequence):
//  identical timers, floor, readiness gate, and exit — only the
//  look differs.
// ============================================================

const STAGES = [
  {
    icon: KeyRound,
    title: 'Verifying your credentials',
    caption: 'Checking the credentials you entered.',
  },
  {
    icon: MapPin,
    title: 'Detecting your branch',
    caption: 'Locating your AICS branch.',
  },
  {
    icon: LayoutDashboard,
    title: 'Preparing your portal',
    caption: 'Waiting for your portal data to land.',
  },
] as const

export function FocusStagesVariant({ branch, onComplete, readiness }: AuthStageProps) {
  const { step, finalChecked } = useAuthSequence({ readiness, onComplete })
  const branchDisplay = branch.charAt(0).toUpperCase() + branch.slice(1)

  const stage = finalChecked
    ? {
        icon: CheckCircle2,
        title: 'Entering your portal',
        caption: `Redirecting to ${branchDisplay}.`,
      }
    : STAGES[Math.min(step, STAGES.length - 1)]

  const holding = step >= 2 && !finalChecked
  const StageIcon = stage.icon
  const stepLabel = finalChecked ? 'Complete' : `Step ${Math.min(step + 1, 3)} of 3`

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto py-10"
      style={{
        background: `linear-gradient(160deg, ${T.text} 0%, ${T.primaryDark} 100%)`,
      }}
    >
      <span role="status" className="sr-only">
        {stage.title}. {stage.caption}
      </span>

      <div className="w-full max-w-[340px] px-8 text-center">
        {/* Brand lockup */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="mb-12 flex items-center justify-center gap-2.5"
        >
          <img src="/aics-logo.svg" alt="AICS" className="w-9 h-9 object-contain" />
          <span className="text-[15px] font-semibold text-white/70">AICS Portal</span>
        </motion.div>

        {/* Stage glyph */}
        <div className="h-14 mb-6 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={stage.title}
              initial={{ opacity: 0, y: 10, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.94 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="w-14 h-14 rounded-2xl grid place-items-center border backdrop-blur-sm"
              style={{ background: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.20)' }}
            >
              {/* The final stage breathes while it honestly holds for
                  the real initial-data load — motion as waiting. */}
              <motion.div
                animate={holding ? { opacity: [1, 0.65, 1] } : { opacity: 1 }}
                transition={
                  holding
                    ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.2 }
                }
              >
                <StageIcon
                  className="w-6 h-6"
                  style={{ color: finalChecked ? '#4ADE80' : 'rgba(255,255,255,0.92)' }}
                />
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Eyebrow */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55 mb-3">
          Signing you in
        </p>

        {/* Stage title */}
        <div className="h-[34px] sm:h-[38px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.h2
              key={stage.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="text-[24px] sm:text-[27px] font-bold leading-tight text-white"
            >
              {stage.title}
            </motion.h2>
          </AnimatePresence>
        </div>

        {/* Caption */}
        <div className="h-5 mt-2 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={stage.caption}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="text-sm text-white/65"
            >
              {stage.caption}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Branch wordmark — the login hero's gradient, once detected */}
        <AnimatePresence>
          {step >= 1 && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="mt-4 text-sm font-semibold tracking-wide"
              style={{
                backgroundImage: PORTAL_TEXT_GRADIENT,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent',
              }}
            >
              AICS {branchDisplay}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Segmented progress */}
        <div className="mt-10">
          <div className="flex gap-2 max-w-[240px] mx-auto">
            {STAGES.map((s, i) => {
              const filled = i < step || (finalChecked && i === STAGES.length - 1)
              return (
                <div
                  key={s.title}
                  className="flex-1 h-[5px] rounded-full overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.16)' }}
                >
                  <motion.div
                    className="h-full w-full origin-left rounded-full"
                    style={{ background: 'rgba(255,255,255,0.92)' }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: filled ? 1 : 0 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                  />
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-[11px] font-medium tabular-nums text-white/45">
            {stepLabel}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
