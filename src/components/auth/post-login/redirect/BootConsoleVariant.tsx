'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useAuthSequence } from './use-auth-sequence'
import { T } from '../../login-tokens'
import type { AuthStageProps } from './types'

// ============================================================
//  Boot Console — sign-in review variant E.
//
//  The sign-in as a quiet terminal session: lines print onto a
//  small console as each stage runs, checked lines confirm the
//  stages that landed, and a block cursor marks whatever is still
//  in flight. The console deliberately keeps its percentage short
//  of 100 and its last line open while the real initial-data load
//  is still in flight — the log only closes on real readiness,
//  exactly like the classic final checkmark.
//
//  Same sequence logic as the production default (useAuthSequence):
//  identical timers, floor, readiness gate, and exit — only the
//  look differs.
// ============================================================

// Console accent — the login hero gradient's brighter blue, chosen
// for legibility on the school navy.
const CONSOLE_ACCENT = '#4EA4D7'

const STAGE_LOG = [
  { run: 'verifying credentials', ok: 'credentials verified' },
  { run: 'resolving branch', ok: 'branch resolved' },
  { run: 'loading portal data', ok: 'portal data loaded' },
] as const

// Percentage readout — mirrors the honest-hold semantics of the
// other variants: 88% while the final load is still truly pending,
// 100% only on real readiness.
function pctFor(step: number, finalChecked: boolean) {
  if (finalChecked) return 100
  if (step === 0) return 34
  if (step === 1) return 67
  return 88
}

type LogLine = { key: string; text: string; tone: 'cmd' | 'run' | 'ok'; cursor?: boolean }

export function BootConsoleVariant({ branch, onComplete, readiness }: AuthStageProps) {
  const { step, finalChecked } = useAuthSequence({ readiness, onComplete })
  const branchDisplay = branch.charAt(0).toUpperCase() + branch.slice(1)

  const pct = pctFor(step, finalChecked)
  const holding = step >= 2 && !finalChecked

  const statusWord = finalChecked ? 'DONE' : holding ? 'HOLDING' : 'RUNNING'
  const statusColor = finalChecked ? '#4ADE80' : holding ? '#FBBF24' : CONSOLE_ACCENT

  const caption = finalChecked
    ? `Entering your portal — ${branchDisplay}`
    : holding
      ? 'Waiting for your portal data…'
      : step === 0
        ? 'Authenticating your credentials…'
        : 'Detecting your branch…'

  // The log: the command, then a run line for the active stage and
  // ok lines for the landed ones — the same rhythm as the classic
  // rows, expressed as a boot sequence.
  const lines: LogLine[] = [{ key: 'cmd', text: '$ aics-auth --login', tone: 'cmd' }]
  STAGE_LOG.forEach((stage, i) => {
    const done = i < step || (finalChecked && i === STAGE_LOG.length - 1)
    if (done) {
      lines.push({
        key: `ok-${i}`,
        text: i === 1 ? `ok  ${stage.ok}: ${branchDisplay}` : `ok  ${stage.ok}`,
        tone: 'ok',
      })
    } else if (i === step) {
      lines.push({ key: `run-${i}`, text: `> ${stage.run} ...`, tone: 'run', cursor: true })
    }
  })
  if (finalChecked) {
    lines.push({ key: 'ok-session', text: 'ok  session established', tone: 'ok' })
    lines.push({ key: 'run-launch', text: '> launching workspace ...', tone: 'run', cursor: true })
  }

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
        {caption}
      </span>

      <div className="w-full max-w-xl px-6 sm:px-8">
        {/* Brand lockup */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="mb-6 flex items-center justify-center gap-2.5"
        >
          <img src="/aics-logo.svg" alt="AICS" className="w-9 h-9 object-contain" />
          <span className="text-[15px] font-semibold" style={{ color: T.text }}>
            AICS Portal
          </span>
        </motion.div>

        {/* The console */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut', delay: 0.08 }}
          className="rounded-[12px] overflow-hidden"
          style={{
            background: T.text,
            border: `1px solid ${T.border}`,
            boxShadow: '0 14px 34px rgba(23,50,77,0.20)',
          }}
        >
          {/* Console chrome */}
          <div
            className="px-4 h-10 flex items-center gap-2 border-b"
            style={{ borderColor: 'rgba(255,255,255,0.10)' }}
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#F87171' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FBBF24' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#34D399' }} />
            <p className="ml-2 font-mono text-[11px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
              aics-portal — sign-in
            </p>
            <motion.p
              className="ml-auto font-mono text-[10px] font-bold tracking-[0.14em]"
              style={{ color: statusColor }}
              initial={false}
              animate={{ opacity: finalChecked ? 1 : [1, 0.5, 1] }}
              transition={
                finalChecked
                  ? { duration: 0.2 }
                  : { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
              }
            >
              {statusWord}
            </motion.p>
          </div>

          {/* Log body */}
          <div className="px-4 sm:px-5 py-4 min-h-[188px] flex flex-col">
            <div className="font-mono text-[12px] sm:text-[13px] leading-[24px]">
              {lines.map((line) => (
                <motion.div
                  key={line.key}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="flex items-center whitespace-pre"
                  style={{
                    color:
                      line.tone === 'ok'
                        ? '#4ADE80'
                        : line.tone === 'cmd'
                          ? 'rgba(255,255,255,0.55)'
                          : '#CBD5E1',
                  }}
                >
                  <span>{line.text}</span>
                  {line.cursor && (
                    <motion.span
                      className="ml-1.5 inline-block w-[7px] h-[13px] flex-shrink-0"
                      style={{ background: CONSOLE_ACCENT }}
                      animate={{ opacity: [1, 0.1, 1] }}
                      transition={{ duration: 1.05, repeat: Infinity, ease: 'linear' }}
                    />
                  )}
                </motion.div>
              ))}
            </div>

            {/* Progress footer */}
            <div
              className="mt-auto pt-3 border-t"
              style={{ borderColor: 'rgba(255,255,255,0.10)' }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <p
                  className="font-mono text-[10px] uppercase tracking-[0.16em]"
                  style={{ color: 'rgba(255,255,255,0.45)' }}
                >
                  sign-in sequence
                </p>
                <p
                  className="font-mono text-[10px] tabular-nums"
                  style={{ color: 'rgba(255,255,255,0.55)' }}
                >
                  {pct}%
                </p>
              </div>
              <div
                className="h-1 rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.14)' }}
              >
                <motion.div
                  className="h-full w-full origin-left rounded-full"
                  style={{ background: finalChecked ? '#4ADE80' : CONSOLE_ACCENT }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: pct / 100 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stage caption */}
        <div className="h-5 mt-5 flex items-center justify-center">
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
