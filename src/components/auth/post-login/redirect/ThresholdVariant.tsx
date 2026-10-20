'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { MapPin } from 'lucide-react'
import { useAuthSequence } from './use-auth-sequence'
import { T } from '../../login-tokens'
import type { AuthStageProps } from './types'

// ============================================================
//  Threshold — sign-in review variant G.
//
//  The portal as a doorway: two panels stand almost closed on the
//  school navy with light bleeding through the gap between them.
//  Each stage that lands parts them a little further and the light
//  grows — and the doors only open wide on real readiness, exactly
//  like the classic final checkmark. The exit fade hands off into
//  the assembling workspace arriving behind it.
//
//  Same sequence logic as the production default (useAuthSequence):
//  identical timers, floor, readiness gate, and exit — only the
//  look differs.
// ============================================================

// Gap between the panels, in px, per sequence state.
const GAP = { stage0: 14, stage1: 34, stage2: 64, open: 210 } as const

// The shared parting ease — a confident architectural slide.
const PART_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export function ThresholdVariant({ branch, onComplete, readiness }: AuthStageProps) {
  const { step, finalChecked } = useAuthSequence({ readiness, onComplete })
  const branchDisplay = branch.charAt(0).toUpperCase() + branch.slice(1)

  const gap = finalChecked
    ? GAP.open
    : step === 0
      ? GAP.stage0
      : step === 1
        ? GAP.stage1
        : GAP.stage2
  const doorWidth = `calc(50% - ${gap / 2}px)`
  const lightOpacity = finalChecked ? 1 : step === 0 ? 0.55 : step === 1 ? 0.72 : 0.88

  const caption = finalChecked
    ? `The doors open — entering ${branchDisplay}`
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
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto py-10"
      style={{ background: 'linear-gradient(180deg, #12263C 0%, #17324D 55%, #10263F 100%)' }}
    >
      <span role="status" className="sr-only">
        {caption}
      </span>

      <div className="w-full max-w-md px-8 text-center">
        {/* Brand lockup */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="mb-8 flex items-center justify-center gap-2.5"
        >
          <img src="/aics-logo.svg" alt="AICS" className="w-9 h-9 object-contain" />
          <span className="text-[15px] font-semibold text-white/70">AICS Portal</span>
        </motion.div>

        {/* The doorway */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: 'easeOut', delay: 0.08 }}
          className="relative h-[192px] rounded-[14px] overflow-hidden border border-white/10"
          style={{ background: '#0E1F33' }}
        >
          {/* Left panel */}
          <motion.div
            initial={false}
            animate={{ width: doorWidth }}
            transition={{ duration: 0.7, ease: PART_EASE }}
            className="absolute left-0 top-0 bottom-0 overflow-hidden"
            style={{
              background:
                'linear-gradient(115deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 55%, rgba(255,255,255,0.05) 100%), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 16px)',
              borderRight: '1px solid rgba(78,164,215,0.55)',
            }}
          >
            <img
              src="/aics-logo.svg"
              alt=""
              className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 object-contain opacity-30"
            />
          </motion.div>

          {/* Right panel */}
          <motion.div
            initial={false}
            animate={{ width: doorWidth }}
            transition={{ duration: 0.7, ease: PART_EASE }}
            className="absolute right-0 top-0 bottom-0 overflow-hidden"
            style={{
              background:
                'linear-gradient(245deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 55%, rgba(255,255,255,0.05) 100%), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 16px)',
              borderLeft: '1px solid rgba(78,164,215,0.55)',
            }}
          >
            <img
              src="/aics-logo.svg"
              alt=""
              className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 object-contain opacity-30"
            />
          </motion.div>

          {/* Light spilling through the gap */}
          <motion.div
            initial={false}
            animate={{ width: gap * 2.4, opacity: lightOpacity * 0.5 }}
            transition={{ duration: 0.7, ease: PART_EASE }}
            className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 blur-[18px]"
            style={{ background: '#4EA4D7' }}
          />
          <motion.div
            initial={false}
            animate={{ width: gap, opacity: lightOpacity }}
            transition={{ duration: 0.7, ease: PART_EASE }}
            className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2"
            style={{
              background: 'linear-gradient(180deg, #FFFFFF 0%, #EAF5FD 45%, #4EA4D7 100%)',
            }}
          />
        </motion.div>

        {/* Branch — once the branch stage is underway */}
        <div className="h-5 mt-5 flex items-center justify-center">
          <AnimatePresence>
            {step >= 1 && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-white/65"
              >
                <MapPin className="w-3 h-3" style={{ color: '#4EA4D7' }} />
                {branchDisplay}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Stage ticks */}
        <div className="mt-5 flex items-center justify-center gap-2.5">
          {[0, 1, 2].map((i) => {
            const filled = i < step || (finalChecked && i === 2)
            return (
              <motion.span
                key={i}
                initial={false}
                animate={{
                  backgroundColor: filled ? '#FFFFFF' : 'rgba(255,255,255,0.22)',
                  scale: filled ? 1 : 0.85,
                }}
                transition={{ duration: 0.25 }}
                className="w-2.5 h-2.5 rounded-full"
              />
            )
          })}
        </div>

        {/* Stage caption */}
        <div className="h-5 mt-4 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={caption}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="text-sm text-white/70"
            >
              {caption}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
