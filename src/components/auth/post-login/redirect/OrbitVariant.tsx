'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { KeyRound, MapPin, LayoutDashboard, CheckCircle2 } from 'lucide-react'
import { useAuthSequence } from './use-auth-sequence'
import { T } from '../../login-tokens'
import type { AuthStageProps } from './types'

// ============================================================
//  Orbit — sign-in review variant D.
//
//  The portal as a small campus system: the school roundel sits at
//  the center and the three stages are stations on an orbit ring.
//  A sweep travels the ring while sign-in works, each station
//  ignites as its stage lands, and the center only settles on real
//  readiness — the radial counterpart of the classic step list.
//
//  Same sequence logic as the production default (useAuthSequence):
//  identical timers, floor, readiness gate, and exit — only the
//  look differs.
// ============================================================

const STATIONS = [
  { icon: KeyRound, label: 'Credentials', caption: 'Authenticating your credentials…' },
  { icon: MapPin, label: 'Branch', caption: 'Detecting your branch…' },
  { icon: LayoutDashboard, label: 'Portal', caption: 'Loading your portal…' },
] as const

// Station positions on the ring, in degrees (0 = east, 90 = south):
// top, lower-right, lower-left — the sweep passes them in order.
const STATION_ANGLES = [-90, 30, 150]

function stationPos(angle: number) {
  const rad = (angle * Math.PI) / 180
  return {
    left: `${50 + 40 * Math.cos(rad)}%`,
    top: `${50 + 40 * Math.sin(rad)}%`,
  }
}

export function OrbitVariant({ branch, onComplete, readiness }: AuthStageProps) {
  const { step, finalChecked } = useAuthSequence({ readiness, onComplete })
  const branchDisplay = branch.charAt(0).toUpperCase() + branch.slice(1)

  const caption = finalChecked
    ? `Entering your portal — ${branchDisplay}`
    : STATIONS[Math.min(step, STATIONS.length - 1)].caption

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

      <div className="w-full max-w-sm px-8 text-center">
        {/* Brand lockup */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="mb-9 flex items-center justify-center gap-2.5"
        >
          <img src="/aics-logo.svg" alt="AICS" className="w-9 h-9 object-contain" />
          <span className="text-[15px] font-semibold" style={{ color: T.text }}>
            AICS Portal
          </span>
        </motion.div>

        {/* The orbit diagram */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: 'easeOut', delay: 0.08 }}
          className="relative w-[200px] h-[200px] mx-auto"
        >
          {/* Orbit ring */}
          <div
            className="absolute inset-[10%] rounded-full border-2 border-dashed"
            style={{ borderColor: T.border }}
          />
          {/* Inner guide ring */}
          <div
            className="absolute inset-[31%] rounded-full border"
            style={{ borderColor: '#EDF1F5' }}
          />

          {/* Spokes from the center to each station */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
            {STATION_ANGLES.map((angle, i) => {
              const rad = (angle * Math.PI) / 180
              const done = i < step || (finalChecked && i === STATIONS.length - 1)
              const active = i === step && !done
              return (
                <line
                  key={i}
                  x1="50"
                  y1="50"
                  x2={50 + 40 * Math.cos(rad)}
                  y2={50 + 40 * Math.sin(rad)}
                  stroke={done || active ? T.accent : '#E2E8F0'}
                  strokeOpacity={done || active ? 0.45 : 1}
                  strokeWidth="1.5"
                />
              )
            })}
          </svg>

          {/* The sweep — travels the ring while sign-in works, and
              retires once the sequence has truly completed. */}
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
          >
            <motion.span
              className="absolute left-1/2 top-[10%] -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
              style={{ background: T.accent, boxShadow: '0 0 0 4px rgba(40,147,207,0.22)' }}
              initial={false}
              animate={{ opacity: finalChecked ? 0 : 1 }}
              transition={{ duration: 0.4 }}
            />
          </motion.div>

          {/* Stations */}
          {STATIONS.map((s, i) => {
            const done = i < step || (finalChecked && i === STATIONS.length - 1)
            const active = i === step && !done
            const Icon = s.icon
            return (
              <div
                key={s.label}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={stationPos(STATION_ANGLES[i])}
              >
                <div className="relative">
                  <motion.div
                    initial={false}
                    animate={{
                      backgroundColor: done ? T.primary : '#FFFFFF',
                      borderColor: done || active ? T.primary : '#CBD5E1',
                    }}
                    transition={{ duration: 0.25 }}
                    className="w-9 h-9 rounded-full grid place-items-center border-2 shadow-sm"
                  >
                    {done ? (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    ) : (
                      <Icon className="w-4 h-4" style={{ color: active ? T.primary : '#94A3B8' }} />
                    )}
                  </motion.div>
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
                  className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium ${
                    STATION_ANGLES[i] === -90 ? 'bottom-full mb-2' : 'top-full mt-2'
                  }`}
                  style={{ color: done || active ? T.text : T.muted }}
                >
                  {s.label}
                </span>
              </div>
            )
          })}

          {/* Center roundel — the school itself; breathes while the
              final stage honestly holds for the real data load. */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <motion.div
              initial={false}
              animate={{
                scale: step >= 2 && !finalChecked ? [1, 1.05, 1] : 1,
                borderColor: finalChecked ? '#16A34A' : T.border,
              }}
              transition={{
                scale:
                  step >= 2 && !finalChecked
                    ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.2 },
                borderColor: { duration: 0.3 },
              }}
              className="w-[68px] h-[68px] rounded-full bg-white border-2 shadow-sm grid place-items-center"
            >
              <img src="/aics-logo.svg" alt="AICS" className="w-8 h-8 object-contain" />
            </motion.div>
          </div>
        </motion.div>

        {/* Branch chip — once the branch stage is underway */}
        <div className="h-7 mt-5 flex items-center justify-center">
          <AnimatePresence>
            {step >= 1 && (
              <motion.span
                initial={{ opacity: 0, y: 4, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
                style={{ background: '#EFF6FF', color: T.primary, border: '1px solid #BFDBFE' }}
              >
                <MapPin className="w-3 h-3" />
                {branchDisplay}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Stage caption */}
        <div className="h-5 mt-1.5 flex items-center justify-center">
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
