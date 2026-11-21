'use client'

import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { MotionConfig, MotionGlobalConfig } from 'framer-motion'
import { toast } from 'sonner'

export type AnimationMode = 'full' | 'reduced' | 'off'

const STORAGE_KEY = 'aics_animation_mode'
const MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const OPTIONS = [
  { value: 'full', label: 'Use all animations' },
  { value: 'reduced', label: 'Reduce animations' },
  { value: 'off', label: 'Turn off animations' },
] as const

function readMode(): AnimationMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'reduced' || saved === 'off') return saved
  } catch {}
  return 'full'
}

type Preferences = {
  preference: AnimationMode
  mode: AnimationMode
  adaptive: boolean
  setPreference: (mode: AnimationMode) => void
}

const AnimationContext = createContext<Preferences>({
  preference: 'full', mode: 'full', adaptive: false, setPreference: () => {},
})

export function useAnimationPreferences() {
  return useContext(AnimationContext)
}

export function AnimationPreferences({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<AnimationMode>('full')
  const [adaptiveMode, setAdaptiveMode] = useState<AnimationMode | null>(null)
  const [systemReduced, setSystemReduced] = useState(false)
  const mode = adaptiveMode ?? (systemReduced && preference === 'full' ? 'reduced' : preference)

  useLayoutEffect(() => {
    const system = window.matchMedia(MOTION_QUERY)
    const syncSystem = () => setSystemReduced(system.matches)
    const syncStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return
      setPreferenceState(readMode())
      setAdaptiveMode(null)
    }
    setPreferenceState(readMode())
    syncSystem()
    system.addEventListener('change', syncSystem)
    window.addEventListener('storage', syncStorage)
    return () => {
      system.removeEventListener('change', syncSystem)
      window.removeEventListener('storage', syncStorage)
    }
  }, [])

  useLayoutEffect(() => {
    document.documentElement.dataset.animationMode = mode
    // The global flag is read when animations start, including on already-mounted Framer elements.
    MotionGlobalConfig.skipAnimations = mode !== 'full'
    if (mode !== 'full') {
      for (const animation of document.getAnimations()) {
        const end = animation.effect?.getComputedTiming().endTime
        if (animation.playState === 'running' && animation.playbackRate !== 0 && typeof end === 'number' && Number.isFinite(end)) animation.finish()
      }
    }
    return () => {
      delete document.documentElement.dataset.animationMode
      MotionGlobalConfig.skipAnimations = false
    }
  }, [mode])

  useEffect(() => {
    if (mode === 'off') return
    let frame = 0
    let slowSamples = 0
    let previous = 0
    let elapsed = 0
    let frames = 0
    let slowFrames = 0
    let lastStart = -Infinity

    function sample(time: number) {
      if (document.hidden) {
        frame = 0
        return
      }
      if (previous) {
        const gap = time - previous
        elapsed += gap
        frames++
        if (gap > 50) slowFrames++
      }
      previous = time
      if (elapsed < 650) {
        frame = requestAnimationFrame(sample)
        return
      }

      frame = 0
      // Require repeated foreground slowdown so an isolated stall cannot change the mode.
      slowSamples = slowFrames >= 4 && slowFrames / frames >= 0.35 ? slowSamples + 1 : 0
      if (slowSamples < 2) return
      const next = mode === 'full' ? 'reduced' : 'off'
      setAdaptiveMode(next)
      toast.info(next === 'reduced' ? 'Animations reduced for smoother performance' : 'Animations turned off for smoother performance', {
        id: 'aics-motion-performance',
        description: 'You can change this in Settings under Appearance.',
      })
    }

    function start() {
      const now = performance.now()
      if (frame || document.hidden || now - lastStart < 1800) return
      if (now - lastStart > 15000) slowSamples = 0
      lastStart = now
      previous = elapsed = frames = slowFrames = 0
      frame = requestAnimationFrame(sample)
    }

    function resetOnHide() {
      if (!document.hidden) return
      cancelAnimationFrame(frame)
      frame = slowSamples = 0
    }

    window.addEventListener('pointerdown', start, { passive: true, capture: true })
    window.addEventListener('scroll', start, { passive: true, capture: true })
    window.addEventListener('keydown', start)
    document.addEventListener('visibilitychange', resetOnHide)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointerdown', start, true)
      window.removeEventListener('scroll', start, true)
      window.removeEventListener('keydown', start)
      document.removeEventListener('visibilitychange', resetOnHide)
    }
  }, [mode, preference, adaptiveMode])

  function setPreference(next: AnimationMode) {
    try { localStorage.setItem(STORAGE_KEY, next) } catch {}
    setPreferenceState(next)
    setAdaptiveMode(null)
  }

  return (
    <AnimationContext.Provider value={{ preference, mode, adaptive: adaptiveMode !== null, setPreference }}>
      {/* The live policy above handles the device preference without caching a reduced flag on mounted elements. */}
      <MotionConfig reducedMotion="never">{children}</MotionConfig>
    </AnimationContext.Provider>
  )
}

export function AnimationOptions() {
  const { preference, mode, adaptive, setPreference } = useAnimationPreferences()

  return (
    <fieldset className="border-b border-line px-4 py-5 sm:px-6">
      <legend className="sr-only">Motion and animation</legend>
      <h3 className="text-base font-semibold text-ink">Motion and animation</h3>
      <p className="mb-3 mt-1 text-sm text-muted-fg">Saved on this device. The portal may temporarily use less motion when frames are slow.</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {OPTIONS.map(({ value, label }) => (
          <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink has-[:checked]:border-link has-[:checked]:bg-blue-50">
            <input className="accent-blue-700" type="radio" name="aics-animation-mode" checked={preference === value} onChange={() => setPreference(value)} />
            {label}
          </label>
        ))}
      </div>
      {mode !== preference && <div className="mt-3 flex flex-wrap items-center gap-x-3 text-sm text-muted-fg">
        <p>{adaptive ? `Using fewer animations for this session: ${OPTIONS.find(option => option.value === mode)?.label}.` : 'Following reduced motion on your device.'}</p>
        {adaptive && <button type="button" className="min-h-11 font-medium text-link underline" onClick={() => setPreference(preference)}>Reset automatic adjustment</button>}
      </div>}
    </fieldset>
  )
}
