'use client'

import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { FlaskConical, Play } from 'lucide-react'
import { T } from '../login-tokens'
import { VariantStage } from './VariantStage'
import { POST_LOGIN_CHOICES, readStoredVariant, writeStoredVariant } from './variants'

/**
 * Development-only preview picker for the post-login animation
 * alternatives (three candidates + the current default). Rendered by
 * LoginView exclusively when NODE_ENV === 'development' — the same
 * gating as SHOW_DEMO_LOGIN. Production builds compile the gate to
 * false, which drops this card and dead-code-eliminates the variant
 * components from the client bundle; production always keeps the
 * original BranchRedirect.
 *
 * - "Preview selected" plays the chosen overlay immediately, without
 *   signing in, so all four can be compared side by side.
 * - The selection persists to localStorage and applies to the next
 *   real sign-in (dev only).
 * - With prefers-reduced-motion the alternatives are skipped at
 *   sign-in, so the preview is disabled with an explanatory note.
 */
export function AnimationLab() {
  const [selected, setSelected] = useState<'default' | 'bloom' | 'sweep' | 'assemble'>('default')
  const [previewing, setPreviewing] = useState(false)
  const reduced = useReducedMotion()

  useEffect(() => {
    // One-time, hydration-safe read of the persisted selection. Reading
    // localStorage during render instead would make SSR ('default') and
    // client markup diverge → hydration error, so the sync setState here
    // is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(readStoredVariant())
  }, [])

  const choose = (variant: 'default' | 'bloom' | 'sweep' | 'assemble') => {
    setSelected(variant)
    writeStoredVariant(variant)
  }

  return (
    <div className="mt-6 rounded-[10px] p-4" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
      <div className="flex items-center gap-2 mb-3">
        <FlaskConical className="w-4 h-4 flex-shrink-0" style={{ color: T.accent }} />
        <p className="text-xs font-bold tracking-wide uppercase" style={{ color: T.muted }}>
          Post-login animation lab
        </p>
        <span
          className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full border"
          style={{ color: T.accent, borderColor: T.accent, background: T.white }}
        >
          DEV
        </span>
      </div>

      <div className="space-y-1">
        {POST_LOGIN_CHOICES.map((choice) => {
          const active = selected === choice.id
          return (
            <button
              key={choice.id}
              type="button"
              aria-pressed={active}
              onClick={() => choose(choice.id)}
              className="w-full text-left rounded-[8px] px-3 py-2 transition-all"
              style={
                active
                  ? {
                      background: T.white,
                      border: `1px solid ${T.accent}`,
                      boxShadow: '0 1px 2px rgba(23,50,77,0.08)',
                    }
                  : { border: '1px solid transparent' }
              }
            >
              <span
                className="block text-xs font-semibold"
                style={{ color: active ? T.primary : T.text }}
              >
                {choice.label}
              </span>
              <span className="block text-[11px] mt-0.5" style={{ color: T.muted }}>
                {choice.blurb}
              </span>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        disabled={!!reduced}
        onClick={() => setPreviewing(true)}
        className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-[8px] py-2 text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: T.primary, color: T.white }}
      >
        <Play className="w-3.5 h-3.5" />
        Preview selected
      </button>

      <p className="mt-2 text-[11px] leading-relaxed" style={{ color: T.muted }}>
        {reduced
          ? 'Reduced motion is on — the alternatives are skipped at sign-in, so preview is disabled.'
          : 'Preview plays without signing in. Your selection applies to the next sign-in on this device (dev only).'}
      </p>

      {previewing && (
        <VariantStage
          variant={selected}
          branch="commonwealth"
          username="juan.santos"
          onComplete={() => setPreviewing(false)}
        />
      )}
    </div>
  )
}
