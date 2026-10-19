'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  GhostSidebarContent,
  GhostTopbarContent,
  GhostHeroText,
  GhostGradesWell,
  GhostScheduleRow,
} from './GhostBlocks'

interface FrameDrawProps {
  branch: string
  username: string
  onComplete: () => void
}

// Option E — "Frame Draw".
//
// A drafting-table reveal, fitting for an institute of computer
// studies: nothing flies in and nothing blooms — the workspace is
// DRAFTED. Two structural lines draw the frame (the topbar's lower
// edge sweeps left-to-right, the sidebar's edge drops top-to-bottom),
// the shell interiors fade into the drawn frame, the hero's identity
// text writes in with an underline sweep, and the content wells
// materialize faint (outline pass) before solidifying into the real
// skeleton shimmer (fill pass). The overlay completes into the exit
// crossfade over the real portal state underneath.
//
// Distinct from the other candidates: motion lives in the FRAME
// (lines that draw, surfaces that pass from outline to fill) rather
// than in moving blocks (C) or an expanding window (D).
//
// Timeline: lines draw (0.05-0.65 s) → shell interiors (0.3-0.68 s) →
// hero writes in with underline sweep (0.42-0.95 s) → wells
// faint→solid (0.55-1.25 s) → onComplete (1.5 s) → exit crossfade.
// Reduced motion is handled upstream (PostLoginTransition skips the
// alternatives entirely).
const TOTAL_MS = 1500

export function FrameDraw({ branch, username, onComplete }: FrameDrawProps) {
  useEffect(() => {
    const t = setTimeout(onComplete, TOTAL_MS)
    return () => clearTimeout(t)
  }, [onComplete])

  return (
    <motion.div
      role="status"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="fixed inset-0 z-50 bg-slate-50 overflow-hidden"
    >
      <span className="sr-only">Preparing your portal…</span>

      {/* Structural lines — the frame being drafted. The topbar's
          lower edge sweeps in from the left; the sidebar's edge drops
          in from the top (desktop only, where the rail exists). */}
      <motion.div
        aria-hidden
        className="absolute left-0 right-0 lg:left-60 top-[98px] sm:top-[102px] h-px bg-slate-200"
        style={{ transformOrigin: 'left center' }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.45, delay: 0.05, ease: 'easeOut' }}
      />
      <motion.div
        aria-hidden
        className="hidden lg:block absolute left-60 top-0 bottom-0 w-px bg-slate-200"
        style={{ transformOrigin: 'top center' }}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.55, delay: 0.1, ease: 'easeOut' }}
      />

      {/* Shell interiors — fade into the drawn frame. The header and
          rail carry no borders of their own; the drawn lines above ARE
          their edges, exactly like the skeleton's. */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="absolute left-0 right-0 lg:left-60 top-[34px] sm:top-[38px] h-16 bg-white flex items-center justify-between px-6"
      >
        <GhostTopbarContent />
      </motion.div>
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.38 }}
        className="hidden lg:flex absolute left-0 top-0 bottom-0 w-60 flex-col bg-white p-4"
      >
        <GhostSidebarContent />
      </motion.div>

      {/* Content: the hero writes in; the wells pass from a faint
          outline state to solid shimmer (the drafting "fill"). */}
      <div className="absolute left-0 right-0 bottom-0 lg:left-60 top-[98px] sm:top-[102px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 lg:space-y-8 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.42, ease: 'easeOut' }}
        >
          <GhostHeroText branch={branch} username={username}>
            {/* Underline sweep — the signing-off stroke of the written
                welcome line. */}
            <motion.div
              aria-hidden
              className="mt-4 h-1 w-16 rounded-full bg-blue-700"
              style={{ transformOrigin: 'left center' }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.4, delay: 0.55, ease: 'easeOut' }}
            />
          </GhostHeroText>
        </motion.div>
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 1] }}
          transition={{ duration: 0.55, delay: 0.55, times: [0, 0.35, 1], ease: 'easeOut' }}
        >
          <GhostGradesWell />
        </motion.div>
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 1] }}
          transition={{ duration: 0.55, delay: 0.7, times: [0, 0.35, 1], ease: 'easeOut' }}
        >
          <GhostScheduleRow />
        </motion.div>
      </div>
    </motion.div>
  )
}
