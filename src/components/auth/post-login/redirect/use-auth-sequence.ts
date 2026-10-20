import { useEffect, useState } from 'react'
import type { AuthReadiness } from './types'

// Step rhythm — the pacing the reviewed animation established: steps
// advance at 600/1300 ms. The sequence may complete only after its
// natural-length floor AND real readiness — a fast login finishes
// exactly when the animation would at its natural length, while a slow
// one holds the final step's spinner for as long as the load really
// takes. A failed load exits promptly so the portal's existing error
// card takes over.
const STEP_MS = [600, 1300]
const SEQUENCE_FLOOR_MS = 2200
const READY_SETTLE_MS = 200
const ERROR_EXIT_MS = 400

const STEP_COUNT = 3

/**
 * The sign-in progress sequence every presentation shares — the
 * production BranchRedirect and the review variants alike. Owns the
 * step timers, the natural-length floor, and the readiness-gated
 * completion; presentations own only how it looks. Extracted verbatim
 * from BranchRedirect, whose behavior it reproduces exactly: rows
 * check in order, the final check appears only when the initial data
 * truly lands, and completion fires on readiness — never a bare timer.
 */
export function useAuthSequence({
  readiness,
  onComplete,
}: {
  readiness: AuthReadiness
  onComplete: () => void
}) {
  const [step, setStep] = useState(0)
  const [floorDone, setFloorDone] = useState(false)

  // Step pacing plus the floor flag used by gated completion. These
  // timers only advance internal state, so callback identity is
  // deliberately not a dependency.
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

  // The final step's check appears only on real readiness, and only
  // once the step itself is active (rows still check in order).
  const finalChecked = step >= STEP_COUNT - 1 && readiness.ready

  return { step, finalChecked }
}
