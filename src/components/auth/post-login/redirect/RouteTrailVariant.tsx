'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { KeyRound, MapPin, LayoutDashboard, CheckCircle2, Flag, Loader2 } from 'lucide-react'
import { useAuthSequence } from './use-auth-sequence'
import { T } from '../../login-tokens'
import type { AuthStageProps } from './types'

// ============================================================
//  Route Trail — the sign-in progress review variant.
//
//  Sign-in as a journey: the line leaves the sign-in origin and the
//  traveling dot carries progress toward the branch destination.
//  The dot KISSES each waypoint's outer outline and parks there —
//  it never overlaps the symbol. From that kiss, the waypoint's
//  blue fill and its white check wipe in left-to-right, karaoke
//  style: the fill edge is scrubbed every frame by the stage's
//  actual progress, so it paces itself to the sequence — the
//  credential and branch fills ride their stage windows, and the
//  portal fill crawls honestly toward a 90% ceiling while the real
//  initial-data load is still in flight, then pours in at natural
//  velocity the moment the data lands. There are no fixed-duration
//  tweens anywhere in the progress path; the destination flag and
//  completion still key off the shared sequence's real readiness.
//
//  Same sequence logic as the production default (useAuthSequence):
//  identical timers, floor, readiness gate, and exit — only the
//  look differs.
// ============================================================

const WAYPOINTS = [
  { icon: KeyRound, label: 'Credentials', caption: 'Authenticating your credentials…' },
  { icon: MapPin, label: 'Branch', caption: 'Detecting your branch…' },
  { icon: LayoutDashboard, label: 'Portal', caption: 'Loading your portal…' },
] as const

// Waypoint centers as fractions of the track (origin 0 → destination 1).
const WAYPOINT_X = [0.25, 0.5, 0.75]

// Stage pacing mirrors use-auth-sequence (STEP_MS = [600, 1300]) so
// the presentation can never drift from the shared sequence.
const STAGE_MS = [600, 1300]

// The dot parks this far from a waypoint's center (the circle's
// 18px radius plus a breath), so its edge kisses the outline.
const DOT_GAP_PX = 26

// Motion constants — per-frame targets with exponential-follow
// smoothing, never fixed-duration tweens:
const ARRIVE_MS = 250 // dot arrival window (≈3× the follow constant)
const FOLLOW_TAU = 80 // ms — displayed values chase their targets
const HOLD_MAX = 0.9 // fill ceiling while the real load is pending
const HOLD_TAU = 2600 // ms — the pending crawl's time constant
const POUR_TAU = 70 // ms — the completion pour once data lands

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

export function RouteTrailVariant({ branch, onComplete, readiness }: AuthStageProps) {
  const { step, finalChecked } = useAuthSequence({ readiness, onComplete })
  const branchDisplay = branch.charAt(0).toUpperCase() + branch.slice(1)

  // ---- The trail's live values (MotionValues — no re-renders). ----
  const dotPct = useMotionValue(0) // dot center, % of track
  const linePct = useMotionValue(0) // line width, % of track
  const fill0 = useMotionValue(0)
  const fill1 = useMotionValue(0)
  const fill2 = useMotionValue(0)

  // Refs so the animation loop reads stable handles (the values
  // themselves are stable; the refs keep the effect dependency-free).
  const fillsRef = useRef([fill0, fill1, fill2])
  const trailRef = useRef({ dot: dotPct, line: linePct })
  const readinessRef = useRef(readiness)
  const trailDoneRef = useRef(false)
  const [trailDone, setTrailDone] = useState(false)

  useEffect(() => {
    readinessRef.current = readiness
  }, [readiness])

  // ---- The karaoke engine: one rAF loop computing pure targets
  //      from elapsed time + real readiness, then smoothing the
  //      displayed values toward them. Nothing here completes on a
  //      bare timer — the final fill only pours when the data has
  //      truly landed. ----
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const t0 = last
    let readyAt: number | null = null
    let readyBase = 0

    const tick = (now: number) => {
      const dt = Math.min(now - last, 100)
      last = now
      const t = now - t0
      const ready = readinessRef.current.ready
      const f2Start = STAGE_MS[1] + ARRIVE_MS

      // The ready moment — capture the crawl's current value so the
      // pour continues from exactly where the fill actually is.
      if (ready && readyAt === null && t >= f2Start) {
        readyAt = t
        readyBase = HOLD_MAX * (1 - Math.exp(-(readyAt - f2Start) / HOLD_TAU))
      }

      // ---- Targets: pure functions of elapsed time + readiness. ----
      const stage = t < STAGE_MS[0] ? 0 : t < STAGE_MS[1] ? 1 : 2
      const dotTarget = WAYPOINT_X[stage] * 100
      const f0t = clamp01((t - ARRIVE_MS) / (STAGE_MS[0] - ARRIVE_MS))
      const f1t =
        t < STAGE_MS[0]
          ? 0
          : clamp01(
              (t - STAGE_MS[0] - ARRIVE_MS) / (STAGE_MS[1] - STAGE_MS[0] - ARRIVE_MS),
            )
      let f2t = 0
      if (t > f2Start) {
        if (readyAt !== null) {
          f2t = readyBase + (1 - readyBase) * (1 - Math.exp(-(t - readyAt) / POUR_TAU))
          if (f2t > 0.995) f2t = 1
        } else {
          // Honest crawl while the load is still in flight —
          // asymptotic to HOLD_MAX, never a fake completion.
          f2t = HOLD_MAX * (1 - Math.exp(-(t - f2Start) / HOLD_TAU))
        }
      }

      // ---- Exponential-follow smoothing (the natural-motion core:
      //      displayed values accelerate and settle with their own
      //      velocity, in step with how the targets actually move). ----
      const k = 1 - Math.exp(-dt / FOLLOW_TAU)
      const [f0, f1, f2] = fillsRef.current
      f0.set(f0.get() + (f0t - f0.get()) * k)
      f1.set(f1.get() + (f1t - f1.get()) * k)
      f2.set(f2.get() + (f2t - f2.get()) * k)
      const lineTarget = trailDoneRef.current ? 100 : dotTarget
      const { dot, line } = trailRef.current
      dot.set(dot.get() + (dotTarget - dot.get()) * k)
      line.set(line.get() + (lineTarget - line.get()) * k)

      // The trail has fully poured — retire the dot, run the line home.
      if (!trailDoneRef.current && f2t === 1 && f2.get() > 0.98) {
        trailDoneRef.current = true
        setTrailDone(true)
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // ---- Rendered transforms (all driven by the loop's values). ----
  const dotLeft = useTransform(dotPct, (v) => `calc(${v}% - ${DOT_GAP_PX}px)`)
  const lineWidth = useTransform(linePct, (v) => `${v}%`)
  const wipe = (v: number) => `inset(0 ${((1 - v) * 100).toFixed(3)}% 0 0)`
  const clips = [
    useTransform(fill0, wipe),
    useTransform(fill1, wipe),
    useTransform(fill2, wipe),
  ]

  const caption = finalChecked
    ? `Redirecting to your branch: ${branchDisplay}`
    : WAYPOINTS[Math.min(step, WAYPOINTS.length - 1)].caption

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-white py-10"
    >
      <span role="status" className="sr-only">
        {caption}
      </span>

      <div className="w-full max-w-md px-8 sm:px-10">
        {/* Brand lockup */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="mb-12 sm:mb-14 flex items-center justify-center gap-2.5"
        >
          <img src="/aics-logo.svg" alt="AICS" className="w-9 h-9 object-contain" />
          <span className="text-[15px] font-semibold" style={{ color: T.text }}>
            AICS Portal
          </span>
        </motion.div>

        {/* The route track */}
        <div className="relative h-[88px] mb-7 sm:mb-8">
          {/* Base line */}
          <div className="absolute left-0 right-0 top-[27px] h-[2px] rounded-full bg-slate-200" />
          {/* Progress fill — width follows the dot exactly, so the
              line's tip is always where the dot actually is. */}
          <motion.div
            className="absolute left-0 top-[27px] h-[2px] rounded-full"
            style={{ width: lineWidth, background: T.primary }}
          />
          {/* Origin */}
          <div className="absolute left-0 top-[23px] w-2.5 h-2.5 -translate-x-1/2 rounded-full bg-slate-300" />
          <span
            className="absolute left-0 top-[54px] -translate-x-1/2 text-[10px] font-medium whitespace-nowrap"
            style={{ color: T.muted }}
          >
            Sign-in
          </span>

          {/* Waypoints — the dot kisses the outline; the blue and
              its white check wipe in with the stage's real progress. */}
          {WAYPOINTS.map((w, i) => {
            const done = i < step || (finalChecked && i === WAYPOINTS.length - 1)
            const active = i === step && !done
            const Icon = w.icon
            return (
              <div
                key={w.label}
                className="absolute top-[10px] -translate-x-1/2"
                style={{ left: `${WAYPOINT_X[i] * 100}%` }}
              >
                <div className="relative">
                  <motion.div
                    initial={false}
                    animate={{ borderColor: done || active ? T.primary : '#CBD5E1' }}
                    transition={{ duration: 0.25 }}
                    className="relative w-9 h-9 rounded-full grid place-items-center border-2 bg-white overflow-hidden"
                  >
                    {/* The stage's own symbol — never covered by the dot */}
                    <Icon className="w-4 h-4" style={{ color: active ? T.primary : '#94A3B8' }} />
                    {/* Karaoke fill — blue circle, border, and white
                        check wipe in together, scrubbed per frame by
                        the stage's actual progress. */}
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 grid place-items-center"
                      style={{ background: T.primary, borderColor: T.primary, clipPath: clips[i] }}
                    >
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </motion.div>
                  </motion.div>
                  {/* Active pulse */}
                  {active && (
                    <motion.span
                      className="absolute inset-0 rounded-full border-2"
                      style={{ borderColor: T.accent }}
                      animate={{ scale: [1, 1.35, 1], opacity: [0.55, 0, 0.55] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                </div>
                <span
                  className="absolute left-1/2 top-[44px] -translate-x-1/2 text-[10px] sm:text-[11px] font-medium whitespace-nowrap"
                  style={{ color: done || active ? T.text : T.muted }}
                >
                  {w.label}
                </span>
              </div>
            )
          })}

          {/* Destination */}
          <div className="absolute right-0 top-[8px] translate-x-1/2">
            <motion.div
              initial={false}
              animate={{
                scale: finalChecked ? 1 : 0.82,
                opacity: step >= 2 || finalChecked ? 1 : 0.55,
              }}
              transition={
                finalChecked ? { type: 'spring', stiffness: 380, damping: 16 } : { duration: 0.25 }
              }
              className="w-10 h-10 rounded-full grid place-items-center shadow-md"
              style={{ background: finalChecked ? T.primary : '#FFFFFF' }}
            >
              {finalChecked ? (
                <Flag className="text-white" style={{ width: 18, height: 18 }} />
              ) : (
                <Loader2
                  className="animate-spin"
                  style={{ width: 16, height: 16, color: T.primary }}
                />
              )}
            </motion.div>
          </div>
          {/* Destination label — the branch, once detected */}
          <AnimatePresence>
            {step >= 1 && (
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute right-0 top-[54px] translate-x-1/2 text-[10px] sm:text-[11px] font-semibold whitespace-nowrap"
                style={{ color: T.primary }}
              >
                {branchDisplay}
              </motion.span>
            )}
          </AnimatePresence>

          {/* The traveling dot — parks at each outline while that
              waypoint's fill scrub runs, and retires once the trail
              has fully poured. Never overlaps a symbol. */}
          <motion.div
            className="absolute top-[22px] -translate-x-1/2 w-3 h-3 rounded-full"
            style={{ left: dotLeft, background: T.accent, boxShadow: '0 0 0 3px rgba(41,147,207,0.25)' }}
            initial={false}
            animate={{ opacity: trailDone ? 0 : 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        </div>

        {/* Stage caption */}
        <div className="h-5 flex items-center justify-center">
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
