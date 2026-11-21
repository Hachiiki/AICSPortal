'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAnimationPreferences } from '@/components/AnimationPreferences'
import { usePhoneViewport } from '@/lib/aics/use-phone-viewport'
import { T } from '../login-tokens'
import { RouteTrailVariant } from './redirect/RouteTrailVariant'
import { WorkspaceAssemble } from './WorkspaceAssemble'

interface PostLoginTransitionProps {
  branch: string
  onComplete: () => void
  /** Real readiness of the portal's initial data. Stage one holds
      the journey's final checkpoint until the data has actually
      landed, and a failed load skips the assembly entirely — the
      overlay exits over the existing error card. */
  readiness: { ready: boolean; error: boolean }
  /** Fired the moment stage two begins, in the same commit the
      redirect overlay starts its exit fade. The page flips the
      workspace-assembly reveal so the REAL portal chrome animates
      into place underneath (portal/assemble-entrance.tsx). */
  onAssembleStart?: () => void
}

function MobilePortalLoading() {
  return (
    <motion.div
      initial={false}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto px-6 py-6"
      style={{ background: T.white }}
    >
      <div className="flex max-w-full flex-col items-center gap-5 text-center">
        <motion.div
          aria-hidden="true"
          initial={{ scale: 0.92, y: 6 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 27 }}
          className="grid size-16 place-items-center rounded-2xl border"
          style={{ background: T.bg, borderColor: T.border }}
        >
          <img src="/aics-logo.svg" alt="" className="size-10 object-contain" />
        </motion.div>
        <p role="status" className="text-sm font-medium" style={{ color: T.text }}>Opening your portal…</p>
        <div aria-hidden="true" className="h-1 w-24 max-w-full overflow-hidden rounded-full" style={{ background: T.accentSoft }}>
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '300%' }}
            transition={{ duration: 1.05, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
            className="h-full w-1/3 rounded-full"
            style={{ background: T.primary }}
          />
        </div>
      </div>
    </motion.div>
  )
}

/**
 * The post-login redirect overlay — the production two-stage flow.
 *
 * On desktop, stage one is the Route Trail journey (redirect/RouteTrailVariant):
 * the traveling dot carries the sign-in's progress along the route
 * through the credential, branch, and portal checkpoints, with every
 * fill paced by the shared sequence and gated on real readiness — the
 * final checkpoint never completes on a bare timer, and a failed load
 * exits promptly so the existing error card takes over. On phones, a compact
 * loader hands off as soon as the initial data is ready. Stage two is
 * the workspace assembly of the REAL portal: onAssembleStart flips
 * the reveal so the actual dashboard chrome animates into its final
 * positions while the redirect overlay exits over it — nothing is
 * replaced at the end; the components the user lands on are the ones
 * that animated in.
 *
 * Reduced motion: the choreography is skipped entirely — the user
 * goes straight to the portal, whose own skeleton handles loading
 * honestly.
 */
export function PostLoginTransition({
  branch,
  onComplete,
  readiness,
  onAssembleStart,
}: PostLoginTransitionProps) {
  const reduced = useAnimationPreferences().mode !== 'full'
  const phone = usePhoneViewport()
  const [stage, setStage] = useState<'auth' | 'assemble'>('auth')
  const doneRef = useRef(false)
  // Latest readiness for stable callbacks — timers can fire after a
  // prop change, and the readiness object's identity is not stable.
  const readinessRef = useRef(readiness)
  // Same pattern for the reveal hook: handleStageDone stays identity-
  // stable (the stage's completion effect re-arms on onComplete
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

  // Stage handoff: the gated journey completed. On a failed load,
  // exit immediately; otherwise trigger the reveal in the same commit
  // as the stage flip — the real portal's entrance starts exactly as
  // the redirect overlay begins its exit fade — and let the assembly
  // coordinator hold the transition open.
  const handleStageDone = useCallback(() => {
    if (doneRef.current) return
    if (readinessRef.current.error) {
      finish()
      return
    }
    onAssembleStartRef.current?.()
    setStage('assemble')
  }, [finish])

  useEffect(() => {
    if (!phone || reduced || stage !== 'auth' || !readiness.ready || readiness.error) return
    const frame = requestAnimationFrame(handleStageDone)
    return () => cancelAnimationFrame(frame)
  }, [handleStageDone, phone, readiness.error, readiness.ready, reduced, stage])

  if (reduced) return null

  return (
    <AnimatePresence>
      {stage === 'auth' ? (
        phone ? <MobilePortalLoading key="stage-mobile" /> : <RouteTrailVariant
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
