'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, useReducedMotion } from 'framer-motion'
import { AuthStage } from './redirect/redirect-stage'
import { WorkspaceAssemble } from './WorkspaceAssemble'

interface PostLoginTransitionProps {
  branch: string
  onComplete: () => void
  /** Real readiness of the portal's initial data. Stage one holds
      the redirect sequence's final step until the data has actually
      landed, and a failed load skips the assembly entirely — the
      overlay exits over the existing error card. */
  readiness: { ready: boolean; error: boolean }
  /** Fired the moment stage two begins, in the same commit the
      redirect overlay starts its exit fade. The page flips the
      workspace-assembly reveal so the REAL portal chrome animates
      into place underneath (portal/assemble-entrance.tsx). */
  onAssembleStart?: () => void
}

/**
 * The post-login redirect overlay — the production two-stage flow.
 *
 * Stage one is the preserved BranchRedirect sequence, gated on real
 * readiness: its final step holds until the portal's initial data
 * has actually landed (the overlay never claims completion on a bare
 * timer), and a failed load exits promptly so the existing error
 * card takes over. While the variant review is open, a development
 * preview selection may render one of the review presentations
 * instead (redirect/redirect-stage.tsx) — same shared sequence
 * logic, production builds always keep the classic default. Stage
 * two is the workspace assembly of the REAL portal: onAssembleStart
 * flips the reveal so the actual dashboard chrome animates into its
 * final positions while the redirect overlay exits over it — nothing
 * is replaced at the end; the components the user lands on are the
 * ones that animated in.
 *
 * Reduced motion: the choreography is skipped entirely — the user
 * goes straight to the portal, whose own skeleton handles loading
 * honestly. (The shell's MotionConfig reducedMotion="user" would
 * degrade the entrance to opacity fades anyway; skipping it outright
 * is the conservative choice for the overlay's step choreography,
 * which lives outside that config.)
 */
export function PostLoginTransition({
  branch,
  onComplete,
  readiness,
  onAssembleStart,
}: PostLoginTransitionProps) {
  const reduced = !!useReducedMotion()
  const [stage, setStage] = useState<'auth' | 'assemble'>('auth')
  const doneRef = useRef(false)
  // Latest readiness for stable callbacks — timers can fire after a
  // prop change, and the readiness object's identity is not stable.
  const readinessRef = useRef(readiness)
  // Same pattern for the reveal hook: handleStageDone stays identity-
  // stable (BranchRedirect's completion effect re-arms on onComplete
  // changes), so the callback is read through a ref.
  const onAssembleStartRef = useRef(onAssembleStart)

  useEffect(() => {
    readinessRef.current = readiness
  }, [readiness])

  useEffect(() => {
    onAssembleStartRef.current = onAssembleStart
  }, [onAssembleStart])

  const finish = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    onComplete()
  }, [onComplete])

  // Reduced motion: skip the choreography entirely — straight to the
  // portal, whose own skeleton handles loading honestly.
  useEffect(() => {
    if (reduced) finish()
  }, [reduced, finish])

  // A failed initial load never plays the assembly — exit over the
  // existing error card, from either stage.
  useEffect(() => {
    if (readiness.error) finish()
  }, [readiness.error, finish])

  // Stage handoff: the gated redirect sequence completed. On a failed
  // load exit immediately; otherwise trigger the reveal in the same
  // commit as the stage flip — the real portal's entrance starts
  // exactly as the redirect overlay begins its exit fade — and let
  // the assembly coordinator hold the transition open.
  const handleStageDone = useCallback(() => {
    if (doneRef.current) return
    if (readinessRef.current.error) {
      finish()
      return
    }
    onAssembleStartRef.current?.()
    setStage('assemble')
  }, [finish])

  if (reduced) return null

  // Two-stage flow: the preserved redirect sequence, gated on real
  // readiness, handing off to the assembly of the real portal
  // underneath.
  return (
    <AnimatePresence>
      {stage === 'auth' ? (
        <AuthStage
          key="stage-auth"
          branch={branch}
          onComplete={handleStageDone}
          readiness={readiness}
        />
      ) : (
        <WorkspaceAssemble key="stage-assemble" onComplete={finish} />
      )}
    </AnimatePresence>
  )
}
