'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface PortalSweepProps {
  branch: string
  onComplete: () => void
}

// Option B — "Portal Sweep".
//
// A different motion language from the checklist: two navy gradient
// panels snap closed over the screen from top and bottom (staggered),
// a center brand beat plays with a scan-line shimmer that echoes the
// login page's Face ID panel, then the panels sweep off to the right
// like a page turn. Close → hold → release. Colors come from the login
// palette (T.text / T.primary) so the cover feels native to the sign-in
// screen it replaces.
//
// Timeline: panels close (0-0.55s) → brand beat (0.45-0.75s) → panels
// sweep off (0.75-1.3s) → portal. Reduced motion is handled upstream
// (PostLoginTransition skips the alternatives entirely).
const REVEAL_AT_MS = 750
const TOTAL_MS = 1450

export function PortalSweep({ branch, onComplete }: PortalSweepProps) {
  const [revealing, setRevealing] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setRevealing(true), REVEAL_AT_MS)
    const t2 = setTimeout(onComplete, TOTAL_MS)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [onComplete])

  const branchDisplay = branch.charAt(0).toUpperCase() + branch.slice(1)

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-white" role="status">
      <span className="sr-only">Signing you in…</span>

      {/* Top panel — leads the close, exits with the sweep */}
      <motion.div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[55%] border-b border-blue-300/30"
        style={{ background: 'linear-gradient(180deg, #17324D 0%, #1769AA 100%)' }}
        initial={{ y: '-102%' }}
        animate={revealing ? { x: '110%' } : { y: '0%' }}
        transition={{
          y: { duration: 0.45, ease: 'easeOut' },
          x: { duration: 0.5, ease: [0.65, 0, 0.35, 1] },
        }}
      />

      {/* Bottom panel — 80ms behind the top one on close, 60ms behind on exit */}
      <motion.div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[55%] border-t border-blue-300/30"
        style={{ background: 'linear-gradient(0deg, #17324D 0%, #1769AA 100%)' }}
        initial={{ y: '102%' }}
        animate={revealing ? { x: '110%' } : { y: '0%' }}
        transition={{
          y: { duration: 0.45, ease: 'easeOut', delay: 0.08 },
          x: { duration: 0.5, ease: [0.65, 0, 0.35, 1], delay: 0.06 },
        }}
      />

      {/* Center brand beat on the closed cover */}
      <motion.div
        aria-hidden
        className="absolute inset-0 flex flex-col items-center justify-center text-white"
        initial={{ opacity: 0, y: 10 }}
        animate={revealing ? { opacity: 0, y: -6 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: revealing ? 0 : 0.45 }}
      >
        <div className="w-20 h-20 rounded-full bg-white/10 border border-white/25 grid place-items-center">
          <img src="/aics-logo.svg" alt="" className="w-12 h-12" />
        </div>
        <p className="mt-5 text-lg font-semibold tracking-tight">AICS {branchDisplay} Branch</p>
        {/* Scan shimmer — echoes the Face ID panel's scan line */}
        <div className="mt-4 w-40 h-1 rounded-full overflow-hidden bg-white/20">
          <motion.div
            className="h-full w-2/5 rounded-full bg-[#7CC7EF]"
            animate={{ x: ['-100%', '250%'] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </motion.div>
    </div>
  )
}
