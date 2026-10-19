'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import { RotateCcw, TriangleAlert, X } from 'lucide-react'
import { DashboardSkeleton } from '@/components/portal/Skeleton'
import { AssembleRevealProvider } from '@/components/portal/assemble-entrance'
import type { PostLoginVariant } from './variants'
import { VariantStage } from './VariantStage'
import { PostLoginTransition } from './PostLoginTransition'
import { PreviewReadySurface } from './PreviewReadySurface'
import { T } from '../login-tokens'

// ============================================================
//  PostLoginPreview — dev-only full sign-in preview harness.
//
//  Plays the ENTIRE post-login chain without signing in, so the
//  candidates can be evaluated against the real loading lifecycle
//  instead of in isolation. The simulated load stands in for the
//  /api/student fetch:
//
//  - Assemble (two-stage): the simulated arrival drives the same
//    readiness gate the real fetch drives at sign-in — the redirect
//    stage holds its final step until the data lands, then the SAME
//    reveal hook the page uses (onAssembleStart → AssembleReveal-
//    Provider) assembles the mock surface with the same entrance
//    choreography the real portal's chrome uses. The skeleton never
//    surfaces (in the real flow the overlay covers it until the
//    data is ready), so the chain is: gated redirect → real-UI
//    assembly → ready.
//  - Other candidates: the overlay completes on its own choreography,
//    the REAL DashboardSkeleton holds for the simulated load, then a
//    clearly-labeled mock of the assembled dashboard.
//
//  Phase transitions use the same AnimatePresence exit crossfade as
//  the real sign-in path in page.tsx. The amber strip mimics the
//  DevBanner the real page renders above its topbar, keeping skeleton
//  geometry honest.
//
//  Never rendered outside development builds (AnimationLab is behind
//  the SHOW_POST_LOGIN_PREVIEW gate) and it performs no auth calls —
//  it cannot weaken or bypass anything.
// ============================================================

export type PreviewLoadSim = 'fast' | 'typical' | 'slow'

const SIM_MS: Record<PreviewLoadSim, number> = {
  fast: 250,
  typical: 1500,
  slow: 4500,
}

const SIM_LABEL: Record<PreviewLoadSim, string> = {
  fast: 'fast · 0.25s',
  typical: 'typical · 1.5s',
  slow: 'slow · 4.5s',
}

type Phase = 'overlay' | 'skeleton' | 'ready'

const PHASE_LABEL: Record<Phase, string> = {
  overlay: '1/3 · sign-in animation',
  skeleton: '2/3 · real dashboard skeleton',
  ready: '3/3 · content ready (mock)',
}

const TWO_STAGE_PHASE_LABEL = {
  overlay: '1/2 · redirect stage (holds for data) → real-UI assembly',
  ready: '2/2 · portal assembled (mock surface)',
} as const

interface PostLoginPreviewProps {
  variant: PostLoginVariant
  sim: PreviewLoadSim
  onExit: () => void
}

export function PostLoginPreview({ variant, sim, onExit }: PostLoginPreviewProps) {
  const [phase, setPhase] = useState<Phase>('overlay')
  const [simDone, setSimDone] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [runKey, setRunKey] = useState(0)
  const twoStage = variant === 'assemble'

  // Simulated arrival of the portal's initial data. For the assemble
  // candidate it drives the readiness gate (the redirect stage holds
  // until it lands); for the others it holds the skeleton phase.
  useEffect(() => {
    if (twoStage) {
      if (phase !== 'overlay') return
      const t = setTimeout(() => setSimDone(true), SIM_MS[sim])
      return () => clearTimeout(t)
    }
    if (phase !== 'skeleton') return
    const t = setTimeout(() => setPhase('ready'), SIM_MS[sim])
    return () => clearTimeout(t)
  }, [phase, sim, twoStage])

  const replay = () => {
    setRunKey((k) => k + 1)
    setSimDone(false)
    setRevealed(false)
    setPhase('overlay')
  }

  const phaseLabel = twoStage
    ? phase === 'ready'
      ? TWO_STAGE_PHASE_LABEL.ready
      : TWO_STAGE_PHASE_LABEL.overlay
    : PHASE_LABEL[phase]

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-label="Post-login animation preview"
    >
      {/* Underlay — what the real flow mounts under the opaque
          overlay. Two-stage: once the simulated data has landed the
          (mock) portal is already there, staged by the same reveal
          context the real page uses, and assembles when the redirect
          overlay exits; after the coordinator completes (phase
          'ready') the context deactivates, mirroring the real
          teardown. Other candidates: the REAL DashboardSkeleton holds
          for the simulated load, then the mock ready surface fades up
          like the real shell's standard entrance. */}
      {(twoStage ? simDone : phase !== 'overlay') ? (
        <div className="absolute inset-0 overflow-y-auto">
          {/* DevBanner mimic — the real page renders the banner above
              its topbar; reproducing it keeps skeleton/ready geometry
              faithful to a real sign-in. */}
          <div className="h-[34px] sm:h-[38px] w-full bg-amber-400 border-b-2 border-black flex items-center justify-center gap-2 px-4">
            <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
            <p className="text-xs font-bold tracking-wide sm:text-sm text-black text-center">
              DEV LAB · banner mimic (layout reference)
            </p>
            <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
          </div>
          <MotionConfig reducedMotion="user">
            {twoStage ? (
              <AssembleRevealProvider
                revealing={phase === 'overlay' ? revealed : null}
              >
                <PreviewReadySurface />
              </AssembleRevealProvider>
            ) : phase === 'skeleton' ? (
              <DashboardSkeleton />
            ) : (
              <motion.div
                key={runKey}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <PreviewReadySurface />
              </motion.div>
            )}
          </MotionConfig>
        </div>
      ) : null}

      {/* Phase 1 — the candidate overlay. The assemble candidate uses
          the REAL PostLoginTransition two-stage orchestration with the
          simulated readiness and the same onAssembleStart reveal hook
          the page passes, so the preview matches sign-in behavior
          exactly; the others map straight to their overlay. */}
      <AnimatePresence>
        {phase === 'overlay' ? (
          twoStage ? (
            <PostLoginTransition
              key={`run-${runKey}`}
              forcedVariant="assemble"
              ignoreReducedMotion
              readiness={{ ready: simDone, error: false }}
              onAssembleStart={() => setRevealed(true)}
              branch="commonwealth"
              username="juan.santos"
              onComplete={() => setPhase('ready')}
            />
          ) : (
            <VariantStage
              key={`run-${runKey}`}
              variant={variant}
              branch="commonwealth"
              username="juan.santos"
              onComplete={() => setPhase('skeleton')}
            />
          )
        ) : null}
      </AnimatePresence>

      {/* Lab controls — always reachable, above every phase. */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 rounded-full border px-4 py-2 shadow-lg"
        style={{ background: 'rgba(255,255,255,0.92)', borderColor: T.border, backdropFilter: 'blur(4px)' }}
      >
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border"
          style={{ color: T.accent, borderColor: T.accent }}
        >
          DEV LAB
        </span>
        <span className="text-[11px] font-medium whitespace-nowrap" style={{ color: T.text }}>
          {phaseLabel} · load sim: {SIM_LABEL[sim]}
        </span>
        <button
          type="button"
          onClick={replay}
          className="inline-flex items-center gap-1 text-[11px] font-semibold"
          style={{ color: T.primary }}
        >
          <RotateCcw className="w-3 h-3" /> Replay
        </button>
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-1 text-[11px] font-semibold"
          style={{ color: T.muted }}
        >
          <X className="w-3 h-3" /> Close
        </button>
      </div>
    </div>
  )
}
