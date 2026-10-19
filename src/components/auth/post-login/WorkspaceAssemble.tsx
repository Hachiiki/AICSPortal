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

interface WorkspaceAssembleProps {
  branch: string
  username: string
  onComplete: () => void
}

// Option C — "Workspace Assemble" (refined).
//
// The retained concept: ghost blocks of the actual portal layout fly
// into place — sidebar from the left, topbar from the top, content
// wells cascading up — like a blueprint assembling into the workspace
// the user is about to land in.
//
// What the refinement changed (and why):
// - The ghost now mirrors the REAL DashboardSkeleton geometry exactly
//   (w-60 rail, h-16 topbar below the DevBanner strip, skeleton-padded
//   main, .aics-skeleton shimmer wells) and the canvas is bg-slate-50,
//   the skeleton page's own background. The overlay's final frame is
//   pixel-equivalent to the skeleton's first frame, so the exit
//   crossfade (handled by AnimatePresence in page.tsx, over the portal
//   that mounts underneath) reads as one continuous surface.
// - The "Your portal is ready" toast is gone. It claimed readiness
//   before any data had loaded. The hero now carries only verified
//   facts (branch, username — both returned by the login API before
//   this overlay mounts) plus an honest "preparing your workspace…".
// - Timing is cut from 1.8 s to 1.25 s: nothing real is being waited
//   for underneath the old length, and the live skeleton continues the
//   honest loading story immediately after.
//
// Timeline: sidebar (0-0.45 s) → topbar (0.08-0.48 s) → hero + wells
// cascade (0.28-0.92 s) → settle → onComplete → exit crossfade.
// Reduced motion is handled upstream (PostLoginTransition skips the
// alternatives entirely).
const TOTAL_MS = 1250

export function WorkspaceAssemble({ branch, username, onComplete }: WorkspaceAssembleProps) {
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

      {/* Sidebar ghost — desktop only; mirrors the real shell's fixed
          w-60 rail, full height like the real fixed sidebar. */}
      <motion.aside
        aria-hidden
        initial={{ x: -48, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="hidden lg:flex absolute left-0 top-0 bottom-0 w-60 flex-col bg-white border-r border-slate-200 p-4"
      >
        <GhostSidebarContent />
      </motion.aside>

      {/* Topbar ghost — h-16, offset by the DevBanner strip exactly like
          the real skeleton's in-flow topbar. */}
      <motion.header
        aria-hidden
        initial={{ y: -28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.08 }}
        className="absolute left-0 right-0 lg:left-60 top-[34px] sm:top-[38px] h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6"
      >
        <GhostTopbarContent />
      </motion.header>

      {/* Content wells — hero carries the verified identity; the rest
          are real skeleton-geometry blocks. */}
      <div className="absolute left-0 right-0 bottom-0 lg:left-60 top-[98px] sm:top-[102px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 lg:space-y-8 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.28 }}
        >
          <GhostHeroText branch={branch} username={username} />
        </motion.div>
        <motion.div
          aria-hidden
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.4 }}
        >
          <GhostGradesWell />
        </motion.div>
        <motion.div
          aria-hidden
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.52 }}
        >
          <GhostScheduleRow />
        </motion.div>
      </div>
    </motion.div>
  )
}
