'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, MapPin } from 'lucide-react'

interface WorkspaceAssembleProps {
  branch: string
  username: string
  onComplete: () => void
}

// Option C — "Workspace Assemble".
//
// A different visual approach from the first two: instead of a centered
// spinner or cover, ghost blocks of the actual portal layout fly into
// place — sidebar from the left, topbar from the top, content cards
// cascading up, a "portal ready" toast popping in — like a blueprint
// assembling into the workspace the user is about to land in. The
// blocks dissolve as the real portal mounts with its existing fade-up.
// Layout mirrors the real shell: sidebar ghost is desktop-only (the
// real sidebar is a drawer on mobile), so it stays responsive.
//
// Timeline: shell pieces (0-0.7s) → welcome card + toast (0.6-1.0s) →
// dissolve (last ~28%) → portal. Reduced motion is handled upstream
// (PostLoginTransition skips the alternatives entirely).
const TOTAL_MS = 1800

/** Varied nav-bar widths so the sidebar ghost reads as a nav, not stripes. */
const NAV_BARS = ['w-3/4', 'w-2/3', 'w-4/5', 'w-1/2', 'w-3/5', 'w-2/4']

export function WorkspaceAssemble({ branch, username, onComplete }: WorkspaceAssembleProps) {
  useEffect(() => {
    const t = setTimeout(onComplete, TOTAL_MS)
    return () => clearTimeout(t)
  }, [onComplete])

  const branchDisplay = branch.charAt(0).toUpperCase() + branch.slice(1)

  return (
    <motion.div
      role="status"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: TOTAL_MS / 1000, times: [0, 0.06, 0.72, 1], ease: 'easeOut' }}
      className="fixed inset-0 z-50 bg-white overflow-hidden"
    >
      <span className="sr-only">Preparing your portal…</span>

      {/* Sidebar ghost — desktop only, mirrors the real shell's fixed w-60 rail */}
      <motion.aside
        aria-hidden
        initial={{ x: -240, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="hidden lg:flex absolute left-0 top-0 bottom-0 w-60 flex-col gap-2 p-5 bg-white border-r border-slate-200"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-800 to-blue-600" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2 w-4/5 rounded-full bg-slate-300" />
            <div className="h-2 w-3/5 rounded-full bg-slate-200" />
          </div>
        </div>
        {NAV_BARS.map((w, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.25 + i * 0.06 }}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 ${i === 0 ? 'bg-blue-50' : ''}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-blue-600' : 'bg-slate-300'}`} />
            <span className={`block h-2 rounded-full bg-slate-200 ${w}`} />
          </motion.div>
        ))}
      </motion.aside>

      {/* Topbar ghost */}
      <motion.header
        aria-hidden
        initial={{ y: -56, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.12 }}
        className="absolute top-0 left-0 right-0 lg:left-60 h-14 bg-white border-b border-slate-200 flex items-center px-5 gap-4"
      >
        <div className="h-2.5 w-32 rounded-full bg-slate-100" />
        <div className="h-6 flex-1 max-w-xs rounded-lg bg-slate-50 border border-slate-200" />
        <div className="ml-auto w-9 h-9 rounded-full bg-blue-100 border border-blue-200" />
      </motion.header>

      {/* Content cards — first one carries the real welcome text */}
      <div className="absolute inset-0 lg:pl-60 pt-20 px-5 sm:px-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 content-start">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.35 }}
          className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 h-36 flex flex-col justify-center"
        >
          <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-semibold text-blue-700">AICS {branchDisplay} Branch</span>
          </div>
          <p className="mt-3 text-lg font-bold tracking-tight text-slate-900">Welcome back</p>
          <p className="text-sm text-slate-500 mt-0.5">
            {username ? `Signed in as ${username}` : 'Loading your workspace…'}
          </p>
        </motion.div>

        {[0.45, 0.55].map((delay, i) => (
          <motion.div
            key={i}
            aria-hidden
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay }}
            className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 h-36 space-y-3"
          >
            <div className={`h-3 rounded-full bg-blue-700/70 ${i === 0 ? 'w-1/2' : 'w-2/5'}`} />
            <div className="h-2 rounded-full bg-slate-100 w-full" />
            <div className="h-2 rounded-full bg-slate-100 w-11/12" />
            <div className="h-2 rounded-full bg-slate-100 w-3/5" />
          </motion.div>
        ))}
      </div>

      {/* "Portal ready" toast — pops in like a sonner toast, bottom-right */}
      <motion.div
        aria-hidden
        initial={{ scale: 0.6, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 22, delay: 0.85 }}
        className="absolute bottom-6 right-6 inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white border border-slate-200 shadow-lg"
      >
        <CheckCircle2 className="w-4 h-4 text-green-600" />
        <span className="text-sm text-slate-700 font-medium">Your portal is ready</span>
      </motion.div>
    </motion.div>
  )
}
