'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, MapPin, CheckCircle2 } from 'lucide-react'

interface BranchRedirectProps {
  branch: string
  onComplete: () => void
  /**
   * Real readiness of the portal's initial data: the final step —
   * and completion — holds until the data has actually landed
   * (ready) or failed (error). The visual presentation is the
   * original sequence; only completion and the final checkmark are
   * gated on real readiness.
   */
  readiness: { ready: boolean; error: boolean }
}

const STEPS = [
  'Authenticating credentials…',
  'Detecting branch…',
  'Loading your portal…',
]

// Step rhythm — the original animation's pacing: steps at
// 600/1300 ms.
const STEP_MS = [600, 1300]
// The sequence may complete only after this natural-length floor AND
// real readiness — a fast login finishes exactly when the original
// animation would, while a slow one holds the final step's spinner
// for as long as the load really takes. The final checkmark appears
// the moment the data lands, never on a timer.
const SEQUENCE_FLOOR_MS = 2200
const READY_SETTLE_MS = 200
const ERROR_EXIT_MS = 400

/**
 * Full-screen redirect animation shown after a successful login.
 * Displays a sequence of steps that culminates in "Redirecting to
 * your branch: {branch}" before navigating to the dashboard.
 *
 * The step rhythm is readability pacing for facts that are already
 * true at mount — the login API verified the credentials and resolved
 * the branch before this overlay appears. The final step's completion
 * reflects the real initial-data load: it never checks off or
 * completes on a timer alone, and a failed load exits promptly so the
 * existing error card takes over.
 */
export function BranchRedirect({ branch, onComplete, readiness }: BranchRedirectProps) {
  const [step, setStep] = useState(0)
  const [floorDone, setFloorDone] = useState(false)
  // Capitalize the branch name for display
  const branchDisplay = branch.charAt(0).toUpperCase() + branch.slice(1)

  // Step pacing plus the natural-length floor flag used by gated
  // completion. These timers only advance internal state, so callback
  // identity is deliberately not a dependency.
  useEffect(() => {
    const timers = STEP_MS.map((ms, i) => setTimeout(() => setStep(i + 1), ms))
    const floor = setTimeout(() => setFloorDone(true), SEQUENCE_FLOOR_MS)
    return () => {
      timers.forEach(clearTimeout)
      clearTimeout(floor)
    }
  }, [])

  // Completion: only once the sequence has played out at least at its
  // natural length AND the initial data truly landed — or promptly
  // when it failed, so the existing error card (never a fake
  // workspace) takes over.
  useEffect(() => {
    if (readiness.error) {
      const t = setTimeout(onComplete, ERROR_EXIT_MS)
      return () => clearTimeout(t)
    }
    if (readiness.ready && floorDone) {
      const t = setTimeout(onComplete, READY_SETTLE_MS)
      return () => clearTimeout(t)
    }
  }, [readiness.ready, readiness.error, floorDone, onComplete])

  // The final step's checkmark appears only on real readiness, and
  // only once the step itself is active (rows still check in order).
  const finalChecked = step >= STEPS.length - 1 && readiness.ready

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 grid place-items-center bg-white"
    >
      <div className="flex flex-col items-center text-center px-6">
        {/* Branch badge */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-700">
              AICS {branchDisplay} Branch
            </span>
          </div>
        </motion.div>

        {/* Animated logo / spinner */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative mb-8"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-800 to-blue-600 grid place-items-center shadow-lg">
            <img src="/aics-logo.svg" alt="AICS" className="w-12 h-12" />
          </div>
          {/* Pulsing ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-blue-400"
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>

        {/* Steps */}
        <div className="space-y-2.5 mb-6 w-64">
          {STEPS.map((label, i) => {
            const done = i < step || (finalChecked && i === STEPS.length - 1)
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{
                  opacity: i <= step ? 1 : 0.3,
                  x: 0,
                }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                className="flex items-center gap-2.5 text-sm"
              >
                {done ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                ) : i === step ? (
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300 flex-shrink-0" />
                )}
                <span className={i <= step ? 'text-slate-700 font-medium' : 'text-slate-500'}>
                  {label}
                </span>
              </motion.div>
            )
          })}
        </div>

        {/* Branch detection message */}
        <AnimatePresence>
          {step >= 1 && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-sm text-slate-500"
            >
              Redirecting to your branch:{' '}
              <span className="font-semibold text-blue-700">{branchDisplay}</span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
