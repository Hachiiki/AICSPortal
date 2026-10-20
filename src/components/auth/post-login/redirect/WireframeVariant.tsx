'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { useAuthSequence } from './use-auth-sequence'
import { T } from '../../login-tokens'
import type { AuthStageProps } from './types'

// ============================================================
//  Wireframe — sign-in review variant H.
//
//  The portal itself is the progress: a quiet schematic of the
//  layout the user is about to land in — sidebar, topbar, content
//  blocks — sketches itself in as each stage lands. The block for
//  the running stage breathes; the content blocks keep breathing
//  while the real initial-data load is still in flight; the whole
//  frame only settles on real readiness, exactly like the classic
//  final checkmark. A minimal nod to the workspace assembly this
//  overlay hands off into.
//
//  Same sequence logic as the production default (useAuthSequence):
//  identical timers, floor, readiness gate, and exit — only the
//  look differs.
// ============================================================

const BLOCK = '#EDF1F6' // resting schematic blocks
const BLOCK_DONE = '#E2E8F0'
const BLOCK_FINAL = 'rgba(23,105,170,0.10)' // settled tint on readiness

// Content row positions inside the frame.
const ROW_TOPS = [58, 84, 110]

export function WireframeVariant({ branch, onComplete, readiness }: AuthStageProps) {
  const { step, finalChecked } = useAuthSequence({ readiness, onComplete })
  const branchDisplay = branch.charAt(0).toUpperCase() + branch.slice(1)

  const caption = finalChecked
    ? `Entering your portal — ${branchDisplay}`
    : step === 0
      ? 'Authenticating your credentials…'
      : step === 1
        ? 'Detecting your branch…'
        : 'Loading your portal…'

  // Which schematic element is the live frontier.
  const sidebarLive = step === 0 && !finalChecked
  const topbarLive = step === 1 && !finalChecked
  const contentLive = step === 2 && !finalChecked

  const settledFill = finalChecked ? BLOCK_FINAL : BLOCK_DONE

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

      <div className="w-full max-w-[320px] px-8 text-center">
        {/* Brand lockup */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="mb-9 flex items-center justify-center gap-2.5"
        >
          <img src="/aics-logo.svg" alt="AICS" className="w-9 h-9 object-contain" />
          <span className="text-[15px] font-semibold" style={{ color: T.text }}>
            AICS Portal
          </span>
        </motion.div>

        {/* The schematic frame */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{
            opacity: 1,
            scale: 1,
            borderColor: finalChecked ? '#A5C8E4' : T.border,
          }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="relative mx-auto w-full h-[148px] rounded-[12px] border"
        >
          {/* Sidebar block — the credentials stage */}
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{
              opacity: 1,
              x: 0,
              backgroundColor: finalChecked ? settledFill : sidebarLive ? BLOCK : settledFill,
            }}
            transition={{
              opacity: { duration: 0.4, delay: 0.15 },
              x: { duration: 0.4, delay: 0.15 },
              backgroundColor: { duration: 0.35 },
            }}
            className="absolute left-2.5 top-2.5 bottom-2.5 w-[66px] rounded-[8px]"
          >
            {/* Sidebar breathes only while its stage runs */}
            <motion.div
              className="absolute inset-0 rounded-[8px]"
              style={{ background: BLOCK }}
              initial={false}
              animate={{ opacity: sidebarLive ? [1, 0.45, 1] : 0 }}
              transition={
                sidebarLive
                  ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 0.3 }
              }
            />
          </motion.div>

          {/* Topbar block — the branch stage */}
          {step >= 1 && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{
                opacity: 1,
                y: 0,
                backgroundColor: finalChecked ? settledFill : topbarLive ? BLOCK : settledFill,
              }}
              transition={{
                opacity: { duration: 0.35 },
                y: { duration: 0.35 },
                backgroundColor: { duration: 0.35 },
              }}
              className="absolute left-[78px] right-2.5 top-2.5 h-[24px] rounded-[7px]"
            >
              <motion.div
                className="absolute inset-0 rounded-[7px]"
                style={{ background: BLOCK }}
                initial={false}
                animate={{ opacity: topbarLive ? [1, 0.45, 1] : 0 }}
                transition={
                  topbarLive
                    ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.3 }
                }
              />
            </motion.div>
          )}

          {/* Content rows — the portal stage; keep breathing while
              the real data load is still in flight. */}
          {step >= 2 &&
            ROW_TOPS.map((top, i) => (
              <motion.div
                key={top}
                initial={{ opacity: 0, y: 5 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  backgroundColor: finalChecked ? settledFill : BLOCK,
                }}
                transition={{
                  opacity: { duration: 0.35, delay: i * 0.08 },
                  y: { duration: 0.35, delay: i * 0.08 },
                  backgroundColor: { duration: 0.35 },
                }}
                className="absolute left-[78px] right-2.5 h-[14px] rounded-[5px]"
                style={{ top }}
              >
                <motion.div
                  className="absolute inset-0 rounded-[5px]"
                  style={{ background: BLOCK }}
                  initial={false}
                  animate={{ opacity: contentLive && !finalChecked ? [1, 0.4, 1] : 0 }}
                  transition={
                    contentLive && !finalChecked
                      ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: i * 0.12 }
                      : { duration: 0.3 }
                  }
                />
              </motion.div>
            ))}

          {/* Settled badge — only on real readiness */}
          <AnimatePresence>
            {finalChecked && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                className="absolute -right-1.5 -top-1.5 w-6 h-6 rounded-full grid place-items-center"
                style={{ background: '#16A34A' }}
              >
                <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Branch line — once detection lands */}
        <div className="h-4 mt-5 flex items-center justify-center">
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
        <div className="h-5 mt-1 flex items-center justify-center">
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
