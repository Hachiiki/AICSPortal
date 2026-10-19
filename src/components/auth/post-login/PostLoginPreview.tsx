'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RotateCcw, TriangleAlert, X } from 'lucide-react'
import { DashboardSkeleton } from '@/components/portal/Skeleton'
import type { PostLoginVariant } from './variants'
import { VariantStage } from './VariantStage'
import { PreviewReadySurface } from './PreviewReadySurface'
import { T } from '../login-tokens'

// ============================================================
//  PostLoginPreview — dev-only full sign-in preview harness.
//
//  Plays the ENTIRE post-login chain without signing in, so the
//  candidates can be evaluated against the real loading lifecycle
//  instead of in isolation:
//
//    phase 1  "overlay"   the candidate overlay, exactly as it renders
//                         during a real sign-in
//    phase 2  "skeleton"  the REAL DashboardSkeleton — the same
//                         component the portal shows while data loads —
//                         held for the simulated load duration
//    phase 3  "ready"     a clearly-labeled mock of the assembled
//                         dashboard (never mistaken for live data)
//
//  The phase 1 → 2 handoff uses the same AnimatePresence exit
//  crossfade as the real sign-in path in page.tsx, so what the lab
//  shows is what a real sign-in does. The amber strip mimics the
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

interface PostLoginPreviewProps {
  variant: PostLoginVariant
  sim: PreviewLoadSim
  onExit: () => void
}

export function PostLoginPreview({ variant, sim, onExit }: PostLoginPreviewProps) {
  const [phase, setPhase] = useState<Phase>('overlay')
  const [runKey, setRunKey] = useState(0)

  // Hold the skeleton phase for the simulated content-load time.
  useEffect(() => {
    if (phase !== 'skeleton') return
    const t = setTimeout(() => setPhase('ready'), SIM_MS[sim])
    return () => clearTimeout(t)
  }, [phase, sim])

  const replay = () => {
    setRunKey((k) => k + 1)
    setPhase('overlay')
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-label="Post-login animation preview"
    >
      {phase !== 'overlay' ? (
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
          {phase === 'skeleton' ? (
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
        </div>
      ) : null}

      {/* Phase 1 — the candidate overlay, crossfading out over the
          skeleton exactly like the real sign-in path. */}
      <AnimatePresence>
        {phase === 'overlay' ? (
          <VariantStage
            key={`run-${runKey}`}
            variant={variant}
            branch="commonwealth"
            username="juan.santos"
            onComplete={() => setPhase('skeleton')}
          />
        ) : null}
      </AnimatePresence>

      {/* Lab controls — always reachable, above every phase. */}
      <div
        className="absolute bottom-4 left-1/2 z-[60] flex items-center gap-3 rounded-full border px-4 py-2 shadow-lg"
        style={{ background: 'rgba(255,255,255,0.92)', borderColor: T.border, backdropFilter: 'blur(4px)' }}
      >
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border"
          style={{ color: T.accent, borderColor: T.accent }}
        >
          DEV LAB
        </span>
        <span className="text-[11px] font-medium whitespace-nowrap" style={{ color: T.text }}>
          {PHASE_LABEL[phase]} · load sim: {SIM_LABEL[sim]}
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
