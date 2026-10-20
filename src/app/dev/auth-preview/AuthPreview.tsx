'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { FlaskConical, RotateCcw, CircleAlert, LayoutDashboard } from 'lucide-react'
import { RouteTrailVariant } from '@/components/auth/post-login/redirect/RouteTrailVariant'
import type { AuthReadiness } from '@/components/auth/post-login/redirect/types'
import { T } from '@/components/auth/login-tokens'

// ============================================================
//  AuthPreview — the dev-only test surface for the sign-in
//  progress animation (/dev/auth-preview).
//
//  Plays Route Trail against a simulated initial-data load so the
//  motion can be judged without signing in: the readiness fed to
//  the stage is simulated HERE ONLY — real sign-ins keep gating on
//  the real fetch, untouched. Fast / typical / slow exercise the
//  honest-hold behavior (the 2.2s floor, and the portal fill
//  pacing itself to the load — crawling while the data is pending,
//  pouring the moment it lands, completing exactly with the
//  sequence); "failed load" shows the error exit over the portal's
//  existing error card.
//
//  When a run completes, the viewport swaps to the handoff note
//  that marks exactly where the existing workspace-assembly reveal
//  takes over in the real flow — that choreography is unchanged
//  and best judged with a real sign-in. Never rendered outside
//  development builds.
// ============================================================

type SimMode = 'fast' | 'typical' | 'slow' | 'fail'

const SIM_MS: Record<Exclude<SimMode, 'fail'>, number> = {
  fast: 300,
  typical: 1600,
  slow: 4500,
}

const SIM_CHOICES: { id: SimMode; label: string; note: string }[] = [
  { id: 'fast', label: 'Fast', note: 'data lands in 0.3s — the 2.2s floor holds; the trail completes at its natural length' },
  { id: 'typical', label: 'Typical', note: 'data lands in 1.6s — crawl, pour, and arrival all land with the sequence' },
  { id: 'slow', label: 'Slow', note: 'data lands in 4.5s — the portal fill crawls while pending, then pours on landing' },
  { id: 'fail', label: 'Failed load', note: 'error at 1.5s — exits over the error card, no assembly' },
]

// A real branch for the preview — the repo's own tenant.
const PREVIEW_BRANCH = 'commonwealth'

const INITIAL_READINESS: AuthReadiness = { ready: false, error: false }

export function AuthPreview() {
  const [sim, setSim] = useState<SimMode>('typical')
  const [runKey, setRunKey] = useState(0)
  const reducedMotion = useReducedMotion()

  const replay = () => setRunKey((k) => k + 1)
  const simNote = SIM_CHOICES.find((s) => s.id === sim)?.note

  return (
    <main className="min-h-dvh w-full px-4 sm:px-8 py-8 sm:py-12 mx-auto max-w-6xl" style={{ background: T.bg }}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5">
          <FlaskConical className="w-5 h-5 flex-shrink-0" style={{ color: T.accent }} />
          <h1 className="text-lg font-bold tracking-tight" style={{ color: T.text }}>
            Sign-in animation preview
          </h1>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border"
            style={{ color: T.accent, borderColor: T.accent, background: T.white }}
          >
            DEV
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed max-w-2xl" style={{ color: T.muted }}>
          Route Trail is the sign-in animation: one continuous journey — the dot glides the route,
          touches each checkpoint&apos;s outline and sinks in, the blue check fills through
          karaoke-style in step with the stage&apos;s real progress, and the dot emerges from the
          far side toward the next checkpoint, finally merging into the destination flag. Judge
          the motion with the simulated loads below; the readiness here is simulated for preview
          only, while real sign-ins keep gating on the real data fetch.
        </p>
      </div>

      {/* Simulation controls */}
      <div
        className="mb-6 rounded-[12px] p-4 flex flex-col sm:flex-row sm:items-center gap-3"
        style={{ background: T.white, border: `1px solid ${T.border}` }}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] flex-shrink-0" style={{ color: T.muted }}>
          Simulated load
        </p>
        <div className="flex flex-wrap gap-1 p-1 rounded-[10px]" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
          {SIM_CHOICES.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => {
                setSim(choice.id)
                replay()
              }}
              className="rounded-[8px] px-3 py-1.5 text-xs font-medium transition-all"
              style={
                sim === choice.id
                  ? { background: T.white, color: T.primary, boxShadow: '0 1px 2px rgba(23,50,77,0.08)' }
                  : { color: T.muted }
              }
            >
              {choice.label}
            </button>
          ))}
        </div>
        <div className="sm:ml-auto flex items-center gap-3">
          {simNote && (
            <p className="text-[11px] hidden md:block" style={{ color: T.muted }}>
              {simNote}
            </p>
          )}
          <button
            type="button"
            onClick={replay}
            className="inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{ background: T.primary, color: T.white }}
          >
            <RotateCcw className="w-3.5 h-3.5" /> Replay
          </button>
        </div>
      </div>

      {reducedMotion && (
        <div
          className="mb-6 rounded-[10px] px-4 py-3 text-xs leading-relaxed"
          style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#B45309' }}
        >
          Reduced motion is detected on this device — real sign-ins skip the animation entirely
          and go straight to the portal. The preview below still plays when replayed, since you
          trigger it explicitly.
        </div>
      )}

      {/* The animation card */}
      <section
        className="mx-auto max-w-xl rounded-[12px] overflow-hidden flex flex-col"
        style={{ background: T.white, border: `1px solid ${T.border}` }}
      >
        <div className="px-4 py-3 flex items-start gap-3 border-b" style={{ borderColor: T.border }}>
          <div className="min-w-0">
            <h2 className="text-sm font-bold" style={{ color: T.text }}>
              Route Trail
            </h2>
            <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: T.muted }}>
              Glide, merge, karaoke fill, emerge — paced by the sequence&apos;s steps and the real
              readiness of the initial-data load.
            </p>
          </div>
          <button
            type="button"
            onClick={replay}
            className="ml-auto flex-shrink-0 inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-xs font-semibold transition-colors"
            style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.text }}
          >
            <RotateCcw className="w-3.5 h-3.5" /> Replay
          </button>
        </div>

        {/* Stage viewport — the transform makes the stage's fixed
            inset-0 positioning fill this frame instead of the screen,
            exactly like it covers the app during a real sign-in. */}
        <div className="relative h-[420px] sm:h-[460px] overflow-hidden" style={{ transform: 'translateZ(0)' }}>
          <StageRun key={runKey} sim={sim} onReplay={replay} />
        </div>
      </section>

      {/* Real-flow note */}
      <div className="mt-6 mx-auto max-w-xl rounded-[12px] p-4 sm:p-5" style={{ background: T.white, border: `1px solid ${T.border}` }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-1" style={{ color: T.muted }}>
          Judging the full chain
        </p>
        <p className="text-xs leading-relaxed" style={{ color: T.muted }}>
          This animation now plays on every real sign-in. Sign in with the dev demo account to
          watch the full chain — this stage into the existing workspace-assembly reveal — exactly
          as users will see it.
        </p>
      </div>
    </main>
  )
}

// ============================================================
//  One run of the stage against the simulated load. Mounted fresh
//  per run (keyed), so state starts clean; the only effect is the
//  simulation timer itself — preview only, the real flow's
//  readiness comes from the actual fetch (see page.tsx).
// ============================================================
function StageRun({ sim, onReplay }: { sim: SimMode; onReplay: () => void }) {
  const [readiness, setReadiness] = useState<AuthReadiness>(INITIAL_READINESS)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (sim === 'fail') {
      const t = setTimeout(() => setReadiness({ ready: false, error: true }), 1500)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setReadiness({ ready: true, error: false }), SIM_MS[sim])
    return () => clearTimeout(t)
  }, [sim])

  return done ? (
    <HandoffNote failed={readiness.error} onReplay={onReplay} />
  ) : (
    <RouteTrailVariant
      branch={PREVIEW_BRANCH}
      readiness={readiness}
      onComplete={() => setDone(true)}
    />
  )
}

// ============================================================
//  The end-of-run note — where the existing handoff takes over.
//  Clearly a marker, not a mock dashboard: the real workspace
//  assembly is unchanged and best judged with a real sign-in.
// ============================================================
function HandoffNote({ failed, onReplay }: { failed: boolean; onReplay: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 grid place-items-center px-6"
      style={{ background: T.bg }}
    >
      <div className="max-w-xs rounded-[12px] p-5 text-center" style={{ background: T.white, border: `1px solid ${T.border}` }}>
        <div
          className="w-10 h-10 rounded-full mx-auto mb-3 grid place-items-center"
          style={{ background: failed ? '#FEF2F2' : '#EFF6FF' }}
        >
          {failed ? (
            <CircleAlert className="w-5 h-5" style={{ color: '#DC2626' }} />
          ) : (
            <LayoutDashboard className="w-5 h-5" style={{ color: T.primary }} />
          )}
        </div>
        <p className="text-sm font-bold" style={{ color: T.text }}>
          {failed ? 'Load failed — exiting to the error card' : 'Overlay exits — workspace assemble begins'}
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: T.muted }}>
          {failed
            ? 'A failed initial load never plays the assembly: the overlay fades over the portal’s existing error card, exactly as in the real flow.'
            : 'In the real flow the portal’s chrome — sidebar, topbar, content — animates into place right here while this overlay fades. Sign in to judge the full chain.'}
        </p>
        <button
          type="button"
          onClick={onReplay}
          className="mt-4 inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-semibold"
          style={{ background: T.primary, color: T.white }}
        >
          <RotateCcw className="w-3.5 h-3.5" /> Replay stage
        </button>
      </div>
    </motion.div>
  )
}
