'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { KeyRound, MapPin, LayoutDashboard, CheckCircle2, Flag, Loader2 } from 'lucide-react'
import {
  useAuthSequence,
  STEP_MS,
  SEQUENCE_FLOOR_MS,
  READY_SETTLE_MS,
} from './use-auth-sequence'
import { T } from '../../login-tokens'
import type { AuthStageProps } from './types'

// ============================================================
//  Route Trail — the sign-in progress animation.
//
//  Sign-in as one continuous journey. The traveling dot glides
//  along the route to each checkpoint, sinks into the circle's
//  outer outline, and the blue fill — circle, border, and white
//  check together — wipes through karaoke-style while the dot
//  passes inside the checkpoint. When the fill completes, the dot
//  emerges from the far side of the circle and glides on toward
//  the next checkpoint, finally merging into the destination
//  flag, which springs at the moment of arrival.
//
//  Every position is a pure function of elapsed time plus real
//  readiness, so the motion can never desync from the sequence:
//  the credential and branch fills land exactly on their step
//  boundaries (STEP_MS, straight from the shared hook), and the
//  portal fill crawls honestly toward its ceiling while the
//  initial-data load is still in flight — then, once the data
//  lands, pours so the whole trail (fill, final glide, and flag
//  merge) completes exactly when the shared sequence does. No
//  fixed-duration tweens anywhere in the progress path, and
//  nothing completes on a bare timer.
//
//  The sequence itself — timers, floor, readiness gate, error
//  exit — is owned by useAuthSequence; only the look lives here.
// ============================================================

const WAYPOINTS = [
  { icon: KeyRound, label: 'Credentials', caption: 'Authenticating your credentials…' },
  { icon: MapPin, label: 'Branch', caption: 'Detecting your branch…' },
  { icon: LayoutDashboard, label: 'Portal', caption: 'Loading your portal…' },
] as const

// Waypoint centers as fractions of the track (origin 0 → destination 1).
const WAYPOINT_X = [0.25, 0.5, 0.75]

// Checkpoint geometry (px): the w-9 waypoint circles, the w-3
// traveling dot, and the w-10 destination flag.
const RIM = 18
const DOT_R = 6
const FLAG_RIM = 20

// Journey rhythm. Each glide rides inside the sequence's step
// window and each fill lands on the step boundary, so a check
// completes exactly when the sequence advances its step.
const TRAVEL_MS = 250 // glide: origin → first checkpoint, and between checkpoints
const FINAL_TRAVEL_MS = 200 // glide: portal checkpoint → destination
const MERGE_MS = 120 // sinking into the destination flag
// The pour lands this far before the sequence completes, leaving
// room for the final glide, the flag merge, and a settling beat.
const TAIL_MS = FINAL_TRAVEL_MS + MERGE_MS + 80

// How the dot dissolves into a checkpoint (the first slice of its
// fill) and emerges from it (the last slice).
const DISSOLVE_BY = 0.18
const EMERGE_FROM = 0.82

// The pending crawl of the portal fill: asymptotic, and capped
// under EMERGE_FROM so a load still in flight can never push the
// dot back out of the checkpoint — only a completing fill can.
const HOLD_MAX = 0.78
const HOLD_TAU = 2600

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function lerp(a: number, b: number, u: number) {
  return a + (b - a) * u
}

function smoothstep(u: number) {
  const c = clamp01(u)
  return c * c * (3 - 2 * c)
}

export function RouteTrailVariant({ branch, onComplete, readiness }: AuthStageProps) {
  const { step, finalChecked } = useAuthSequence({ readiness, onComplete })
  const branchDisplay = branch.charAt(0).toUpperCase() + branch.slice(1)

  // ---- The trail's live values (MotionValues — no re-renders). ----
  const dotX = useMotionValue(0) // dot center, px along the track
  const dotPresence = useMotionValue(1) // dot opacity (dissolved inside checkpoints)
  const lineW = useMotionValue(0) // blue line width, px (the journey's frontier)
  const fill0 = useMotionValue(0)
  const fill1 = useMotionValue(0)
  const fill2 = useMotionValue(0)

  // Refs keep the animation loop dependency-free while values and
  // readiness stay reachable every frame.
  const fillsRef = useRef([fill0, fill1, fill2])
  const trailRef = useRef({ dot: dotX, presence: dotPresence, line: lineW })
  const readinessRef = useRef(readiness)
  const trackRef = useRef<HTMLDivElement>(null)
  // The flag springs the moment the dot arrives and merges into it.
  const [flagArrived, setFlagArrived] = useState(false)

  useEffect(() => {
    readinessRef.current = readiness
  }, [readiness])

  // ---- The journey engine: one rAF loop computing every position
  //      as a pure function of elapsed time and real readiness.
  //      Position, presence, and the line's frontier are all
  //      continuous — the dot never jumps, and the blue path runs
  //      unbroken from the origin to the destination. ----
  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    let readyAt: number | null = null
    let flagFired = false

    const tick = (now: number) => {
      const t = now - t0
      const W = trackRef.current?.offsetWidth ?? 0

      if (W > 0) {
        const cx = WAYPOINT_X.map((f) => f * W)
        const fill2Start = STEP_MS[1] + TRAVEL_MS
        const fill1Start = STEP_MS[0] + TRAVEL_MS

        // Real readiness, observed the frame it flips.
        if (readinessRef.current.ready && readyAt === null) readyAt = t

        // The pour window: starts when the data truly lands (never
        // before the dot has reached the portal checkpoint) and is
        // scheduled backward from the sequence's own completion, so
        // the trail finishes exactly with the sequence — no dead
        // air after it, no cutoff before it.
        let pour: { start: number; end: number } | null = null
        if (readyAt !== null) {
          const start = Math.max(readyAt, fill2Start)
          pour = { start, end: Math.max(SEQUENCE_FLOOR_MS, start) + READY_SETTLE_MS - TAIL_MS }
        }

        // ---- Checkpoint fills (karaoke wipe fractions). ----
        const fill = [
          smoothstep((t - TRAVEL_MS) / (STEP_MS[0] - TRAVEL_MS)),
          smoothstep((t - fill1Start) / (STEP_MS[1] - fill1Start)),
        ]
        let portalFill = 0
        if (t > fill2Start) {
          if (pour !== null && t >= pour.start) {
            // The pour: from wherever the crawl actually is, paced
            // to land exactly at the scheduled pour end.
            const base = HOLD_MAX * (1 - Math.exp(-(pour.start - fill2Start) / HOLD_TAU))
            portalFill = base + (1 - base) * smoothstep((t - pour.start) / (pour.end - pour.start))
          } else {
            // Honest crawl while the real load is still in flight —
            // asymptotic to a ceiling short of completion.
            portalFill = HOLD_MAX * (1 - Math.exp(-(t - fill2Start) / HOLD_TAU))
          }
        }

        // ---- The journey: dot center, presence, and line tip. ----
        let x = 0
        let presence = 1
        let tip = 0

        // A glide between two points — eased from rest to rest, so
        // every visible join in the journey is velocity-smooth.
        const glide = (from: number, to: number, start: number, end: number) => {
          x = lerp(from, to, smoothstep((t - start) / (end - start)))
          presence = 1
          tip = x + DOT_R
        }

        // Passing through checkpoint i while its fill sweeps: the
        // dot touches the near rim and sinks into it as the fill
        // begins, rides hidden while the wipe edge carries the
        // frontier through the circle, and is pushed out of the far
        // rim as the fill completes. The line tip blends from the
        // wipe edge to the dot's nose with its presence, so the
        // blue path stays unbroken across the circle.
        const pass = (i: number, f: number) => {
          const near = cx[i] - RIM
          const far = cx[i] + RIM
          const wipe = near + f * 2 * RIM
          if (f < DISSOLVE_BY) {
            const u = f / DISSOLVE_BY
            x = lerp(near - DOT_R, near, u)
            presence = 1 - smoothstep(u)
          } else if (f > EMERGE_FROM) {
            const u = (f - EMERGE_FROM) / (1 - EMERGE_FROM)
            x = lerp(far, far + DOT_R, u)
            presence = smoothstep(u)
          } else {
            x = near
            presence = 0
          }
          tip = wipe + (x + DOT_R - wipe) * presence
        }

        const flagContact = W - FLAG_RIM - DOT_R
        if (t < TRAVEL_MS) {
          glide(0, cx[0] - RIM - DOT_R, 0, TRAVEL_MS)
        } else if (t < STEP_MS[0]) {
          pass(0, fill[0])
        } else if (t < fill1Start) {
          glide(cx[0] + RIM + DOT_R, cx[1] - RIM - DOT_R, STEP_MS[0], fill1Start)
        } else if (t < STEP_MS[1]) {
          pass(1, fill[1])
        } else if (t < fill2Start) {
          glide(cx[1] + RIM + DOT_R, cx[2] - RIM - DOT_R, STEP_MS[1], fill2Start)
        } else if (pour === null || t < pour.end) {
          pass(2, portalFill)
        } else if (t < pour.end + FINAL_TRAVEL_MS) {
          glide(cx[2] + RIM + DOT_R, flagContact, pour.end, pour.end + FINAL_TRAVEL_MS)
        } else {
          // Merge into the destination: the flag springs as the dot
          // arrives and sinks into its outline; the line runs home.
          const u = smoothstep((t - pour.end - FINAL_TRAVEL_MS) / MERGE_MS)
          x = lerp(flagContact, W - FLAG_RIM, u)
          presence = 1 - u
          tip = lerp(W - FLAG_RIM, W, u)
          if (!flagFired) {
            flagFired = true
            setFlagArrived(true)
          }
        }

        // ---- Publish (MotionValues — no React re-renders). ----
        trailRef.current.dot.set(x)
        trailRef.current.presence.set(presence)
        trailRef.current.line.set(tip)
        const [f0, f1, f2] = fillsRef.current
        f0.set(fill[0])
        f1.set(fill[1])
        f2.set(portalFill)
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // ---- Rendered transforms (all driven by the loop's values). ----
  const dotLeft = useTransform(dotX, (v) => `${v}px`)
  const dotScale = useTransform(dotPresence, (p) => 0.35 + 0.65 * p)
  const lineWidth = useTransform(lineW, (v) => `${v}px`)
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
        <div ref={trackRef} className="relative h-[88px] mb-7 sm:mb-8">
          {/* Base line */}
          <div className="absolute left-0 right-0 top-[27px] h-[2px] rounded-full bg-slate-200" />
          {/* Progress fill — its tip is the journey's frontier: it
              runs with the dot, sweeps through each checkpoint with
              the fill's wipe, and runs home into the flag. */}
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

          {/* Waypoints — the dot passes through each: touch, sink
              in, karaoke fill, emerge from the far side. */}
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

          {/* Destination — the journey's terminus: it spins while
              the trail is en route and springs the moment the dot
              merges into it. */}
          <div className="absolute right-0 top-[8px] translate-x-1/2">
            <motion.div
              initial={false}
              animate={{
                scale: flagArrived ? 1 : 0.82,
                opacity: step >= 2 || flagArrived ? 1 : 0.55,
              }}
              transition={
                flagArrived ? { type: 'spring', stiffness: 380, damping: 16 } : { duration: 0.25 }
              }
              className="w-10 h-10 rounded-full grid place-items-center shadow-md"
              style={{ background: flagArrived ? T.primary : '#FFFFFF' }}
            >
              {flagArrived ? (
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

          {/* The traveling dot — glides the route, dissolves into
              each checkpoint while its fill sweeps, emerges from
              the far side, and merges into the flag at the end. */}
          <motion.div
            className="absolute top-[22px] w-3 h-3 rounded-full"
            style={{
              left: dotLeft,
              opacity: dotPresence,
              scale: dotScale,
              background: T.accent,
              boxShadow: '0 0 0 3px rgba(41,147,207,0.25)',
            }}
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
