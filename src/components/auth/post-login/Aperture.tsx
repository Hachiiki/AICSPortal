'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { MapPin } from 'lucide-react'
import { T } from '../login-tokens'
import {
  GhostSidebarContent,
  GhostTopbarContent,
  GhostHeroText,
  GhostGradesWell,
  GhostScheduleRow,
} from './GhostBlocks'

interface ApertureProps {
  branch: string
  username: string
  onComplete: () => void
}

// Option D — "Aperture".
//
// A lens, not a cover. The screen starts as the login page's own navy
// canvas (T.text — the exact navy of the login's photo overlay), so the
// moment reads as a continuation of the screen the user just left,
// never a blank slate. The verified identity — AICS mark, branch chip,
// signed-in line, all facts already confirmed by the login API — sits
// at the aperture's origin. The workspace then opens around it: a
// white aperture expands from that exact point and progressively
// reveals the skeleton-geometry shell inside it. When the aperture
// passes the identity mark it fades out, the hero text fades in inside
// the workspace, and the overlay completes into the exit crossfade
// over the real portal state (skeleton / content / error card).
//
// Distinct from the other candidates: no blocks fly in (C) and no
// lines draw (E) — the workspace is revealed by a single expanding
// light window; the only moving camera is the aperture itself.
//
// Timeline: identity settles (0-0.35 s) → aperture expands from the
// mark (0.45-1.2 s) → hero fades in inside (0.8-1.1 s) → settle →
// onComplete (1.5 s) → exit crossfade. Reduced motion is handled
// upstream (PostLoginTransition skips the alternatives entirely).
const TOTAL_MS = 1500

export function Aperture({ branch, username, onComplete }: ApertureProps) {
  useEffect(() => {
    const t = setTimeout(onComplete, TOTAL_MS)
    return () => clearTimeout(t)
  }, [onComplete])

  const branchDisplay = branch.charAt(0).toUpperCase() + branch.slice(1)

  return (
    <motion.div
      role="status"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="fixed inset-0 z-50 overflow-hidden"
      style={{ background: T.text }}
    >
      <span className="sr-only">Opening your portal…</span>

      {/* The workspace, revealed through the expanding aperture. The
          shell inside is static skeleton geometry — the clip IS the
          reveal, so no per-region animation is needed and the final
          frame matches the live skeleton exactly. */}
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-slate-50"
        initial={{ clipPath: 'circle(5% at 50% 42%)' }}
        animate={{ clipPath: 'circle(90% at 50% 42%)' }}
        transition={{ duration: 0.75, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <aside className="hidden lg:flex absolute left-0 top-0 bottom-0 w-60 flex-col bg-white border-r border-slate-200 p-4">
          <GhostSidebarContent />
        </aside>
        <header className="absolute left-0 right-0 lg:left-60 top-[34px] sm:top-[38px] h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <GhostTopbarContent />
        </header>
        <div className="absolute left-0 right-0 bottom-0 lg:left-60 top-[98px] sm:top-[102px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 lg:space-y-8 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.8 }}
          >
            <GhostHeroText branch={branch} username={username} />
          </motion.div>
          <GhostGradesWell />
          <GhostScheduleRow />
        </div>
      </motion.div>

      {/* The verified identity — anchored at the aperture's origin
          point, fading out as the opening passes over it. x/y are set
          through motion's style (not Tailwind transforms) so the scale
          animation composes with the centering translate. */}
      <motion.div
        className="absolute left-1/2 top-[42%] z-10 flex flex-col items-center text-center px-6"
        style={{ x: '-50%', y: '-50%' }}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: [0, 1, 1, 0], scale: [0.92, 1, 1, 1.04] }}
        transition={{ duration: 0.95, times: [0, 0.12, 0.72, 1], ease: 'easeOut' }}
      >
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-800 to-blue-600 grid place-items-center shadow-lg">
          <img src="/aics-logo.svg" alt="" className="w-10 h-10" />
        </div>
        <span className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/25 bg-white/10 text-xs font-semibold text-white">
          <MapPin className="w-3.5 h-3.5" />
          AICS {branchDisplay} Branch
        </span>
        <p className="mt-2 text-xs text-white/60">
          {username ? `Signed in as ${username}` : 'Signing you in…'}
        </p>
      </motion.div>
    </motion.div>
  )
}
