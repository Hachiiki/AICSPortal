'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { MapPin } from 'lucide-react'

interface BrandBloomProps {
  branch: string
  username: string
  onComplete: () => void
}

// Option A — "Brand Bloom".
//
// One refined brand moment instead of a step checklist: the AICS mark
// spring-settles inside a soft radial glow, welcome copy staggers in,
// a brand line sweeps, and the branch chip rises — then the overlay
// fades out into the portal's own fade-up entrance. Institutional and
// quiet; all colors from the portal's blue/slate scale.
//
// Timeline: logo settles (~0.5s) → copy staggers (0.4-1.0s) → hold →
// overlay fade (last 15%) → portal. Reduced motion is handled upstream
// (PostLoginTransition skips the alternatives entirely).
const TOTAL_MS = 1600

export function BrandBloom({ branch, username, onComplete }: BrandBloomProps) {
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
      transition={{ duration: TOTAL_MS / 1000, times: [0, 0.12, 0.85, 1], ease: 'easeOut' }}
      className="fixed inset-0 z-50 grid place-items-center bg-white overflow-hidden"
    >
      <span className="sr-only">Signing you in…</span>

      {/* Soft brand glow blooming behind the mark */}
      <motion.div
        aria-hidden
        initial={{ scale: 0.35, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="absolute w-[26rem] h-[26rem] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(37,99,235,0.13) 0%, rgba(37,99,235,0) 70%)',
        }}
      />

      <div className="relative flex flex-col items-center text-center px-6">
        <motion.div
          initial={{ scale: 0.72, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 240, damping: 18, delay: 0.1 }}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-800 to-blue-600 grid place-items-center shadow-lg"
        >
          <img src="/aics-logo.svg" alt="" className="w-12 h-12" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.4 }}
          className="mt-6 text-xl font-bold tracking-tight text-slate-900"
        >
          Welcome back
        </motion.p>

        {username ? (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.5 }}
            className="mt-1 text-sm text-slate-500"
          >
            Signed in as <span className="font-medium text-slate-700">{username}</span>
          </motion.p>
        ) : null}

        <motion.div
          aria-hidden
          initial={{ width: 0 }}
          animate={{ width: '3.5rem' }}
          transition={{ duration: 0.4, delay: 0.55, ease: 'easeOut' }}
          className="mt-4 h-1 rounded-full bg-blue-700"
        />

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.65 }}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200"
        >
          <MapPin className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-blue-700">AICS {branchDisplay} Branch</span>
        </motion.div>
      </div>
    </motion.div>
  )
}
