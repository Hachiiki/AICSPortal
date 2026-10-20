'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { User, MapPin, KeyRound, LayoutDashboard, CheckCircle2, Loader2 } from 'lucide-react'
import { useAuthSequence } from './use-auth-sequence'
import { T } from '../../login-tokens'
import type { AuthStageProps } from './types'

// ============================================================
//  ID Pass — sign-in review variant F.
//
//  The portal pass as a physical object: an AICS access card is
//  issued while you wait. The identity prints in once credentials
//  verify, the branch stamps on when detection lands, and the
//  access code pixelates in while the portal data loads. The READY
//  stamp appears only on real readiness — the object-based
//  counterpart of the classic final checkmark.
//
//  Same sequence logic as the production default (useAuthSequence):
//  identical timers, floor, readiness gate, and exit — only the
//  look differs.
// ============================================================

const TICKS = [
  { icon: KeyRound, label: 'Credentials', caption: 'Authenticating your credentials…' },
  { icon: MapPin, label: 'Branch', caption: 'Detecting your branch…' },
  { icon: LayoutDashboard, label: 'Portal', caption: 'Loading your portal…' },
] as const

// A deterministic decorative pattern for the access-code block —
// not a real code, just the look of one being issued.
const CODE_CELLS = Array.from({ length: 25 }, (_, i) => (i * 7 + Math.floor(i / 5) * 3) % 3 !== 0)

export function IdPassVariant({ branch, onComplete, readiness }: AuthStageProps) {
  const { step, finalChecked } = useAuthSequence({ readiness, onComplete })
  const branchDisplay = branch.charAt(0).toUpperCase() + branch.slice(1)

  const identityIn = step >= 1 // credentials verified
  const branchIn = step >= 2 // branch resolved
  const codeIn = step >= 2 // portal stage running
  const ready = finalChecked

  const caption = ready
    ? `Pass ready — entering ${branchDisplay}`
    : TICKS[Math.min(step, TICKS.length - 1)].caption

  // One shine sweep across the card per stage change.
  const shineKey = `${step}-${ready ? 1 : 0}`

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto py-10"
      style={{ background: T.bg }}
    >
      <span role="status" className="sr-only">
        {caption}
      </span>

      <div className="w-full max-w-sm px-8 text-center">
        {/* Brand lockup */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="mb-8 flex items-center justify-center gap-2.5"
        >
          <img src="/aics-logo.svg" alt="AICS" className="w-9 h-9 object-contain" />
          <span className="text-[15px] font-semibold" style={{ color: T.text }}>
            AICS Portal
          </span>
        </motion.div>

        {/* The pass being issued */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut', delay: 0.08 }}
          className="mx-auto w-[288px]"
        >
          <motion.div
            animate={{ y: [0, -5, 0], rotate: [-1.2, -0.4, -1.2] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="relative rounded-[14px] overflow-hidden"
            style={{
              background: T.white,
              border: `1px solid ${T.border}`,
              boxShadow: '0 16px 36px rgba(23,50,77,0.16)',
            }}
          >
            {/* Issuing header band */}
            <div
              className="h-9 px-3 flex items-center gap-2 border-b"
              style={{ borderColor: T.border, background: T.bg }}
            >
              <img src="/aics-logo.svg" alt="" className="w-4 h-4 object-contain" />
              <span
                className="text-[10px] font-bold tracking-[0.14em]"
                style={{ color: T.text }}
              >
                AICS PORTAL
              </span>
              <span
                className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.1em]"
                style={{
                  background: ready ? '#DCFCE7' : '#DBEAFE',
                  color: ready ? '#15803D' : '#1D4ED8',
                }}
              >
                <motion.span
                  className="w-1 h-1 rounded-full"
                  style={{ background: ready ? '#16A34A' : T.accent }}
                  initial={false}
                  animate={ready ? { opacity: 1 } : { opacity: [1, 0.35, 1] }}
                  transition={
                    ready ? { duration: 0.2 } : { duration: 1.4, repeat: Infinity }
                  }
                />
                {ready ? 'READY' : 'ISSUING'}
              </span>
            </div>

            {/* Card body */}
            <div className="p-3.5 flex gap-3.5 min-h-[118px]">
              {/* Photo — prints in once credentials verify */}
              <motion.div
                initial={false}
                animate={{ opacity: identityIn ? 1 : 0.35, scale: identityIn ? 1 : 0.97 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="w-[58px] flex-shrink-0 rounded-[10px] grid place-items-center"
                style={{ background: '#EEF2F6', border: '1px solid #DDE4EA' }}
              >
                <User className="w-7 h-7" style={{ color: identityIn ? T.muted : '#C3CBD4' }} />
              </motion.div>

              {/* Identity */}
              <div className="flex-1 min-w-0 flex flex-col gap-2 items-start">
                <div className="flex flex-col gap-1.5 w-full pt-0.5">
                  <motion.div
                    initial={{ width: '52%', backgroundColor: '#E2E8F0' }}
                    animate={{
                      width: identityIn ? '86%' : '52%',
                      backgroundColor: identityIn ? '#334155' : '#E2E8F0',
                    }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="h-[9px] rounded-[4px]"
                  />
                  <motion.div
                    initial={{ width: '38%', backgroundColor: '#E2E8F0' }}
                    animate={{
                      width: identityIn ? '64%' : '38%',
                      backgroundColor: identityIn ? '#94A3B8' : '#E2E8F0',
                    }}
                    transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
                    className="h-[9px] rounded-[4px]"
                  />
                </div>

                {/* Branch chip — stamps on when detection lands */}
                <AnimatePresence>
                  {branchIn && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                      className="inline-flex items-center gap-1 rounded-[6px] px-2 py-1 text-[10px] font-bold"
                      style={{
                        background: '#EFF6FF',
                        color: T.primary,
                        border: '1px solid #BFDBFE',
                      }}
                    >
                      <MapPin className="w-3 h-3" />
                      {branchDisplay}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Access code — pixelates in during the portal stage */}
              <div
                className="w-[58px] flex-shrink-0 rounded-[8px] p-[7px] grid grid-cols-5 gap-[2.5px] self-start"
                style={{
                  background: T.white,
                  border: `1px solid ${codeIn ? T.border : 'transparent'}`,
                }}
              >
                {CODE_CELLS.map((on, i) => (
                  <motion.span
                    key={i}
                    className="w-[7px] h-[7px] rounded-[1.5px]"
                    style={{ background: T.text }}
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: codeIn ? (ready ? (on ? 1 : 0.08) : on ? 0.85 : 0.15) : 0,
                    }}
                    transition={{
                      duration: 0.25,
                      delay: codeIn ? ((i % 5) + Math.floor(i / 5)) * 0.03 : 0,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Status strip */}
            <div className="h-[22px] flex items-center justify-center" style={{ background: T.text }}>
              <p
                className="font-mono text-[9px] tracking-[0.22em] font-semibold"
                style={{ color: 'rgba(255,255,255,0.75)' }}
              >
                {ready ? `ACCESS GRANTED · ${branch.toUpperCase()}` : 'STUDENT ACCESS · ISSUING'}
              </p>
            </div>

            {/* The shine — one sweep per stage change */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <motion.div
                key={shineKey}
                initial={{ left: '-35%' }}
                animate={{ left: '135%' }}
                transition={{ duration: 0.85, ease: 'easeInOut' }}
                className="absolute top-0 bottom-0 w-[46px] rotate-[14deg]"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0) 100%)',
                }}
              />
            </div>
          </motion.div>
        </motion.div>

        {/* Stage ticks */}
        <div className="mt-6 flex items-center justify-center gap-5">
          {TICKS.map((t, i) => {
            const done = i < step || (ready && i === TICKS.length - 1)
            const active = i === step && !done
            const Icon = t.icon
            return (
              <div key={t.label} className="flex items-center gap-1.5">
                <motion.div
                  initial={false}
                  animate={{
                    backgroundColor: done ? T.primary : '#FFFFFF',
                    borderColor: done || active ? T.primary : '#CBD5E1',
                  }}
                  transition={{ duration: 0.25 }}
                  className="w-6 h-6 rounded-full grid place-items-center border-2"
                >
                  {done ? (
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  ) : active ? (
                    <Loader2 className="w-3 h-3 animate-spin" style={{ color: T.primary }} />
                  ) : (
                    <Icon className="w-3 h-3" style={{ color: '#94A3B8' }} />
                  )}
                </motion.div>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: done || active ? T.text : T.muted }}
                >
                  {t.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Stage caption */}
        <div className="h-5 mt-3 flex items-center justify-center">
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
