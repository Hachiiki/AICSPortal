'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'
import { useAuthSequence } from './use-auth-sequence'
import { T } from '../../login-tokens'
import type { AuthStageProps } from './types'

// ============================================================
//  Inline Button — sign-in review variant K.
//
//  Continuity with the press that started it: the sign-in button
//  the user just clicked remains on stage and becomes the progress
//  itself. Its label trades for the running stage, a quiet fill
//  sweeps the button as the sequence advances, and the fill —
//  like every variant's final element — honestly stops at 88%
//  while the real initial-data load is still in flight. The check
//  and the full sweep land only on real readiness, exactly like
//  the classic final checkmark.
//
//  Same sequence logic as the production default (useAuthSequence):
//  identical timers, floor, readiness gate, and exit — only the
//  look differs.
// ============================================================

const WORDS = [
  'Verifying credentials…',
  'Detecting your branch…',
  'Loading your portal…',
] as const

// Fill — the honest-hold mapping shared by the family: 88% while
// the final load is still truly pending, 100% on real readiness.
function pctFor(step: number, finalChecked: boolean) {
  if (finalChecked) return 100
  if (step === 0) return 34
  if (step === 1) return 67
  return 88
}

export function InlineButtonVariant({ branch, onComplete, readiness }: AuthStageProps) {
  const { step, finalChecked } = useAuthSequence({ readiness, onComplete })
  const branchDisplay = branch.charAt(0).toUpperCase() + branch.slice(1)

  const pct = pctFor(step, finalChecked)
  const word = finalChecked ? 'Entering your portal' : WORDS[Math.min(step, 2)]
  const caption = finalChecked
    ? `Entering your portal — ${branchDisplay}`
    : WORDS[Math.min(step, 2)]

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

      <div className="w-full max-w-[300px] px-8">
        {/* Brand lockup */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="flex items-center justify-center gap-2.5"
        >
          <img src="/aics-logo.svg" alt="AICS" className="w-8 h-8 object-contain" />
          <span className="text-[15px] font-semibold" style={{ color: T.text }}>
            AICS Portal
          </span>
        </motion.div>

        {/* The button — still on stage from the press that started
            this; now it carries the progress itself. */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.08 }}
          className="relative mt-10 h-[46px] rounded-[10px] overflow-hidden"
          style={{
            background: finalChecked ? T.primaryDark : T.primary,
            boxShadow: '0 6px 16px rgba(23,105,170,0.28)',
          }}
        >
          {/* The quiet fill sweeping behind the label — honest at
              88% while the real load is still in flight. */}
          <motion.div
            className="absolute inset-0 origin-left"
            style={{ background: 'rgba(255,255,255,0.16)' }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: pct / 100 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* Label row — spinner while work is underway, check on
              real readiness only. */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 px-4">
            <span className="w-4 h-4 flex-shrink-0 grid place-items-center">
              {finalChecked ? (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                  className="w-4 h-4 rounded-full bg-white/20 grid place-items-center"
                >
                  <Check className="w-2.5 h-2.5 text-white" strokeWidth={3.5} />
                </motion.span>
              ) : (
                <Loader2 className="w-4 h-4 animate-spin text-white/90" />
              )}
            </span>
            <AnimatePresence mode="wait">
              <motion.span
                key={word}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
                className="text-[13.5px] font-medium text-white truncate"
              >
                {word}
              </motion.span>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Branch line — once detection lands */}
        <div className="h-4 mt-4 flex items-center justify-center">
          <AnimatePresence>
            {step >= 1 && (
              <motion.p
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="text-[12px] font-medium"
                style={{ color: T.muted }}
              >
                {branchDisplay}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* A whisper of what comes next — the portal's own muted
            tone, so the handoff into the assemble reads as one
            continuous quiet surface. */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: finalChecked ? 0.9 : 0.5 }}
          transition={{ duration: 0.4 }}
          className="mt-8 text-center text-[11px]"
          style={{ color: T.muted }}
        >
          {finalChecked ? 'Taking you in…' : 'Preparing your workspace'}
        </motion.p>
      </div>
    </motion.div>
  )
}
