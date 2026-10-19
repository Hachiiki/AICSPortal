'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, useReducedMotion } from 'framer-motion'
import { SHOW_POST_LOGIN_PREVIEW } from '../login-tokens'
import { BranchRedirect } from '../BranchRedirect'
import { WorkspaceAssemble } from './WorkspaceAssemble'
import { VariantStage } from './VariantStage'
import { readStoredVariant, type PostLoginVariant } from './variants'

interface PostLoginTransitionProps {
  branch: string
  username: string
  onComplete: () => void
  /** Dev-lab override: force a candidate instead of reading the
      persisted selection (the preview harness uses this). */
  forcedVariant?: PostLoginVariant
  /** Real readiness of the portal's initial data. Only the assemble
      candidate consumes it: its first stage holds the redirect
      sequence's final step until the data lands, and a failed load
      skips the assembly entirely. The other candidates complete on
      their own choreography and crossfade out over whatever the real
      state underneath is. */
  readiness?: { ready: boolean; error: boolean }
  /** Preview-only: play the candidates even under reduced motion (the
      lab's override checkbox). Real sign-ins never pass this. */
  ignoreReducedMotion?: boolean
  /** Assemble candidate only: fired the moment stage two begins, in
      the same commit the redirect overlay starts its exit fade. The
      page flips the workspace-assembly reveal so the REAL portal
      chrome animates into place underneath (portal/
      assemble-entrance.tsx). The preview harness uses the same hook
      to drive its mock surface. */
  onAssembleStart?: () => void
}

/**
 * The post-login redirect overlay — a drop-in replacement for the old
 * direct <BranchRedirect> render in page.tsx.
 *
 * Production always renders the original BranchRedirect: the dev gate
 * (SHOW_POST_LOGIN_PREVIEW) compiles to a constant false there. In
 * development the animation-lab selection picks a candidate.
 *
 * The assemble candidate runs as TWO stages, gated on real readiness:
 * stage one is the preserved BranchRedirect sequence (its final step
 * holds until the portal's initial data has actually landed — the
 * overlay never claims completion on a bare timer), and stage two is
 * the workspace assembly of the REAL portal: onAssembleStart flips
 * the reveal so the actual dashboard chrome animates into its final
 * positions while the redirect overlay exits over it. A failed load
 * skips the assembly and exits over the existing error card. The
 * other candidates remain single-stage overlays; the owner has not
 * chosen a winner yet, so 'default' remains the behavior unless a
 * candidate is selected.
 *
 * Reduced motion: the alternatives are skipped entirely — the user
 * goes straight to the portal, whose own skeleton handles loading
 * honestly. (The default BranchRedirect keeps its existing behavior.)
 */
export function PostLoginTransition({
  branch,
  username,
  onComplete,
  forcedVariant,
  readiness,
  ignoreReducedMotion,
  onAssembleStart,
}: PostLoginTransitionProps) {
  const reduced = !!useReducedMotion() && !ignoreReducedMotion
  const [variant] = useState<PostLoginVariant>(
    () => forcedVariant ?? (SHOW_POST_LOGIN_PREVIEW ? readStoredVariant() : 'default')
  )
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

  // Reduced motion: skip the alternatives entirely — straight to the
  // portal, whose own skeleton handles loading honestly.
  useEffect(() => {
    if (variant !== 'default' && reduced) finish()
  }, [variant, reduced, finish])

  // A failed initial load never plays the assembly — exit over the
  // existing error card, from either stage.
  useEffect(() => {
    if (variant === 'assemble' && readiness?.error) finish()
  }, [variant, readiness?.error, finish])

  // Stage handoff: the gated redirect sequence completed. On a failed
  // load exit immediately; otherwise trigger the reveal in the same
  // commit as the stage flip — the real portal's entrance starts
  // exactly as the redirect overlay begins its exit fade — and let
  // the assembly coordinator hold the transition open.
  const handleStageDone = useCallback(() => {
    if (doneRef.current) return
    if (readinessRef.current?.error) {
      finish()
      return
    }
    onAssembleStartRef.current?.()
    setStage('assemble')
  }, [finish])

  if (variant !== 'default' && reduced) return null

  if (variant !== 'assemble') {
    return (
      <VariantStage variant={variant} branch={branch} username={username} onComplete={finish} />
    )
  }

  // Two-stage assemble candidate: the preserved redirect sequence,
  // gated on real readiness, handing off to the assembly of the
  // real portal underneath.
  return (
    <AnimatePresence>
      {stage === 'auth' ? (
        <BranchRedirect
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
