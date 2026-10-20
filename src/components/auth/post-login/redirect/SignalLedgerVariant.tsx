'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { useAuthSequence } from './use-auth-sequence'
import { T } from '../../login-tokens'
import type { AuthStageProps } from './types'

// ============================================================
//  Signal Ledger — sign-in review variant B.
//
//  An operator-style manifest: a progress dial with a counting
//  readout beside a ledger card whose rows print in and check off
//  as each stage lands. The dial deliberately stops short of 100%
//  and the last row keeps its spinner while the real initial-data
//  load is still in flight — the percentage completes only on real
//  readiness, exactly like the classic final checkmark.
//
//  Same sequence logic as the production default (useAuthSequence):
//  identical timers, floor, readiness gate, and exit — only the
//  look differs.
// ============================================================

const ROWS = [
  { label: 'Credentials verified', doneDetail: 'Accepted' },
  { label: 'Branch resolved', doneDetail: null }, // filled with the branch name
  { label: 'Portal data loading', doneDetail: 'Landed' },
] as const

// Dial readout — stops at 88% while the final row's load is still
// honest-pending; 100% only on real readiness.
function dialPct(step: number, finalChecked: boolean) {
  if (finalChecked) return 100
  if (step === 0) return 34
  if (step === 1) return 67
  return 88
}

const RING_R = 52
const RING_C = 2 * Math.PI * RING_R

export function SignalLedgerVariant({ branch, onComplete, readiness }: AuthStageProps) {
  const { step, finalChecked } = useAuthSequence({ readiness, onComplete })
  const branchDisplay = branch.charAt(0).toUpperCase() + branch.slice(1)

  const pct = dialPct(step, finalChecked)
  const rowsDone =
    (step > 0 ? 1 : 0) + (step > 1 ? 1 : 0) + (finalChecked ? 1 : 0)
  const holding = step >= 2 && !finalChecked

  const statusLabel = finalChecked ? 'Complete' : 'In progress'
  const footerNote = finalChecked
    ? 'Cleared — assembling your workspace'
    : holding
      ? 'Holding for portal data…'
      : 'Running sign-in checks…'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto py-10"
      style={{ background: T.bg }}
    >
      <span role="status" className="sr-only">
        {footerNote}
      </span>

      <div className="w-full max-w-2xl px-5 sm:px-8">
        {/* Header row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="mb-5 flex items-center gap-2.5"
        >
          <img src="/aics-logo.svg" alt="AICS" className="w-8 h-8 object-contain" />
          <span className="text-[15px] font-semibold" style={{ color: T.text }}>
            AICS Portal
          </span>
          {/* Live status chip */}
          <span
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{
              color: finalChecked ? '#15803D' : T.muted,
              borderColor: finalChecked ? '#BBF7D0' : T.border,
              background: T.white,
            }}
          >
            <motion.span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: finalChecked ? '#16A34A' : T.accent }}
              animate={
                finalChecked
                  ? { opacity: 1 }
                  : { opacity: [1, 0.35, 1], transition: { duration: 1.4, repeat: Infinity } }
              }
            />
            {statusLabel}
          </span>
        </motion.div>

        {/* Dial + ledger */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut', delay: 0.08 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          {/* Dial card */}
          <div
            className="w-full sm:w-[220px] flex-shrink-0 rounded-[12px] p-5 flex flex-col items-center justify-center"
            style={{ background: T.white, border: `1px solid ${T.border}` }}
          >
            <div className="relative w-[120px] h-[120px]">
              <svg viewBox="0 0 120 120" className="w-full h-full">
                <circle
                  cx="60"
                  cy="60"
                  r={RING_R}
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="8"
                />
                <motion.circle
                  cx="60"
                  cy="60"
                  r={RING_R}
                  fill="none"
                  stroke={T.primary}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  transform="rotate(-90 60 60)"
                  initial={{ strokeDashoffset: RING_C }}
                  animate={{ strokeDashoffset: RING_C * (1 - pct / 100) }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </svg>
              <img
                src="/aics-logo.svg"
                alt=""
                className="absolute inset-0 m-auto w-9 h-9 object-contain"
              />
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-[26px] font-bold tabular-nums leading-none" style={{ color: T.text }}>
                {pct}
              </span>
              <span className="text-[13px] font-semibold" style={{ color: T.muted }}>
                %
              </span>
            </div>
            <p className="mt-1 text-[11px]" style={{ color: T.muted }}>
              of sign-in sequence
            </p>
          </div>

          {/* Ledger card */}
          <div
            className="flex-1 rounded-[12px] flex flex-col overflow-hidden"
            style={{ background: T.white, border: `1px solid ${T.border}` }}
          >
            <div
              className="px-4 py-2.5 flex items-center justify-between border-b"
              style={{ borderColor: T.border }}
            >
              <p
                className="text-[11px] font-bold uppercase tracking-[0.12em]"
                style={{ color: T.muted }}
              >
                Sign-in manifest
              </p>
              <p className="text-[11px] font-semibold tabular-nums" style={{ color: T.muted }}>
                {rowsDone}/3
              </p>
            </div>

            <div className="flex-1">
              {ROWS.map((row, i) => {
                const visible = i <= step
                if (!visible) return null
                const done = i < step || (finalChecked && i === ROWS.length - 1)
                return (
                  <motion.div
                    key={row.label}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="px-4 py-[13px] flex items-center gap-3 border-b last:border-b-0"
                    style={{ borderColor: T.border }}
                  >
                    {done ? (
                      <CheckCircle2 className="w-[18px] h-[18px] flex-shrink-0 text-green-600" />
                    ) : (
                      <Loader2
                        className="w-[18px] h-[18px] flex-shrink-0 animate-spin"
                        style={{ color: T.primary }}
                      />
                    )}
                    <p
                      className="text-sm font-medium"
                      style={{ color: done ? T.text : T.muted }}
                    >
                      {row.label}
                    </p>
                    <span className="ml-auto text-[11px] font-semibold" style={{ color: done ? T.primary : T.muted }}>
                      {i === 1 && done ? branchDisplay : done ? row.doneDetail : '…'}
                    </span>
                  </motion.div>
                )
              })}
            </div>

            {/* Footer — progress bar + honest state note */}
            <div
              className="px-4 py-3 border-t"
              style={{ borderColor: T.border, background: 'rgba(247,249,251,0.7)' }}
            >
              <div
                className="h-1 rounded-full overflow-hidden"
                style={{ background: '#E2E8F0' }}
              >
                <motion.div
                  className="h-full w-full origin-left rounded-full"
                  style={{ background: finalChecked ? '#16A34A' : T.primary }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: rowsDone / 3 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                />
              </div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={footerNote}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-2 text-[11px] font-medium"
                  style={{ color: finalChecked ? '#15803D' : T.muted }}
                >
                  {footerNote}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
