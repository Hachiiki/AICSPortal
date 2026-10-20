'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { useAuthSequence } from './use-auth-sequence'
import { T } from '../../login-tokens'
import type { AuthStageProps } from './types'

// ============================================================
//  Hairline — sign-in review variant I.
//
//  The reductive one: a small brand mark, the stage word, a single
//  hairline, and a counter — nothing else. The hairline honestly
//  stops at 88% while the real initial-data load is still in
//  flight, and the leading edge softly pulses as the hold; the line
//  and the counter complete only on real readiness, exactly like
//  the classic final checkmark.
//
//  Same sequence logic as the production default (useAuthSequence):
//  identical timers, floor, readiness gate, and exit — only the
//  look differs.
// ============================================================

const WORDS = [
  'Verifying credentials',
  'Detecting branch',
  'Loading portal data',
] as const

// Counter — the honest-hold mapping shared by the family: 88% while
// the final load is still truly pending, 100% on real readiness.
function pctFor(step: number, finalChecked: boolean) {
  if (finalChecked) return 100
  if (step === 0) return 34
  if (step === 1) return 67
  return 88
}

export function HairlineVariant({ branch, onComplete, readiness }: AuthStageProps) {
  const { step, finalChecked } = useAuthSequence({ readiness, onComplete })
  const branchDisplay = branch.charAt(0).toUpperCase() + branch.slice(1)

  const pct = pctFor(step, finalChecked)
  const holding = step >= 2 && !finalChecked
  const word = finalChecked ? `Entering — ${branchDisplay}` : WORDS[Math.min(step, 2)]

  const caption = finalChecked
    ? `Entering your portal — ${branchDisplay}`
    : holding
      ? 'Waiting for your portal data…'
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

      <div className="w-full max-w-[280px] px-8">
        {/* Small brand mark */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="flex items-center justify-center gap-2"
        >
          <img src="/aics-logo.svg" alt="AICS" className="w-6 h-6 object-contain" />
          <span className="text-[13px] font-semibold" style={{ color: T.text }}>
            AICS Portal
          </span>
        </motion.div>

        {/* Stage word */}
        <div className="h-6 mt-12 flex items-center justify-center gap-1.5">
          <AnimatePresence mode="wait">
            <motion.p
              key={word}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.22 }}
              className="text-[13.5px] font-medium text-center"
              style={{ color: T.text }}
            >
              {word}
            </motion.p>
          </AnimatePresence>
          {finalChecked && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 18 }}
              className="w-4 h-4 rounded-full grid place-items-center"
              style={{ background: '#16A34A' }}
            >
              <Check className="w-2.5 h-2.5 text-white" strokeWidth={3.5} />
            </motion.span>
          )}
        </div>

        {/* The hairline */}
        <div className="relative mt-4 h-[2px] rounded-full" style={{ background: '#ECF1F5' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: T.primary }}
            initial={{ width: '0%' }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
          {/* Leading edge — softly pulses during the honest hold */}
          <motion.span
            className="absolute w-[7px] h-[7px] rounded-full -translate-y-[2.5px]"
            style={{ background: T.accent, boxShadow: '0 0 0 3px rgba(40,147,207,0.2)' }}
            initial={false}
            animate={{
              left: `calc(${pct}% - 3.5px)`,
              opacity: holding ? [1, 0.35, 1] : 0,
            }}
            transition={
              holding
                ? { opacity: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }, left: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
                : { duration: 0.3 }
            }
          />
        </div>

        {/* Counter */}
        <div className="mt-2.5 flex items-center justify-end">
          <p className="text-[11px] font-medium tabular-nums" style={{ color: T.muted }}>
            {pct}%
          </p>
        </div>
      </div>
    </motion.div>
  )
}
