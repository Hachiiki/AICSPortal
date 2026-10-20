'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useAuthSequence } from './use-auth-sequence'
import { T } from '../../login-tokens'
import type { AuthStageProps } from './types'

// ============================================================
//  Wordmark — sign-in review variant J.
//
//  The brand itself is the progress: the "AICS PORTAL" wordmark
//  starts as quiet gray letterforms, and the letters settle into
//  the school navy as the stages land. The letter at the frontier
//  of the running stage softly breathes; the final letter keeps
//  breathing while the real initial-data load is still in flight;
//  every letter is navy only on real readiness — the typographic
//  counterpart of the classic final checkmark.
//
//  Same sequence logic as the production default (useAuthSequence):
//  identical timers, floor, readiness gate, and exit — only the
//  look differs.
// ============================================================

const LETTERS = ['A', 'I', 'C', 'S', ' ', 'P', 'O', 'R', 'T', 'A', 'L'] as const

// Non-space letter index per position (the space carries none).
const LETTER_INDEX = [0, 1, 2, 3, null, 4, 5, 6, 7, 8, 9]

// Letters settled per sequence state (of 10): 4 → 7 → 9 → 10.
function settledCount(step: number, finalChecked: boolean) {
  if (finalChecked) return 10
  if (step === 0) return 4
  if (step === 1) return 7
  return 9
}

const UNSETTLED = '#C9D2DB'

export function WordmarkVariant({ branch, onComplete, readiness }: AuthStageProps) {
  const { step, finalChecked } = useAuthSequence({ readiness, onComplete })
  const branchDisplay = branch.charAt(0).toUpperCase() + branch.slice(1)

  const settled = settledCount(step, finalChecked)

  const caption = finalChecked
    ? `Entering your portal — ${branchDisplay}`
    : step === 0
      ? 'Authenticating your credentials…'
      : step === 1
        ? 'Detecting your branch…'
        : 'Loading your portal…'

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

      <div className="w-full max-w-sm px-8 text-center">
        {/* The wordmark — letters settle into navy as stages land */}
        <div className="flex items-baseline justify-center select-none" aria-hidden="true">
          {LETTERS.map((char, i) => {
            const li = LETTER_INDEX[i]
            if (li === null) return <span key={i} className="w-2.5" />
            const isSettled = li < settled
            // The frontier letter — the one the running stage is
            // working toward — softly breathes until it settles.
            const isFrontier = li === settled
            return (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  color: isSettled ? T.text : UNSETTLED,
                }}
                transition={{
                  opacity: { duration: 0.4, delay: i * 0.04 },
                  y: { duration: 0.4, delay: i * 0.04 },
                  color: { duration: 0.4 },
                }}
                className="text-[28px] sm:text-[32px] font-bold tracking-[0.1em] leading-none"
                style={{ position: 'relative' }}
              >
                {char}
                {/* Frontier breathing — the honest-hold pulse lives
                    on the letter the current stage is arriving at */}
                {isFrontier && (
                  <motion.span
                    className="absolute inset-0 rounded-[3px]"
                    style={{ background: T.text, opacity: 0 }}
                    initial={false}
                    animate={{ opacity: [0.06, 0.16, 0.06] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
              </motion.span>
            )
          })}
        </div>

        {/* A tiny mark below for brand balance — the wordmark
            itself carries the composition. */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-5 flex items-center justify-center gap-1.5"
        >
          <img src="/aics-logo.svg" alt="" className="w-4 h-4 object-contain opacity-60" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: T.muted }}>
            Student Portal
          </span>
        </motion.div>

        {/* Branch — once detection lands */}
        <div className="h-4 mt-8 flex items-center justify-center">
          <AnimatePresence>
            {step >= 1 && (
              <motion.p
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="text-[12px] font-semibold"
                style={{ color: T.primary }}
              >
                {branchDisplay}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Stage caption */}
        <div className="h-5 mt-2 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={caption}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.22 }}
              className="text-[13px] text-center"
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
