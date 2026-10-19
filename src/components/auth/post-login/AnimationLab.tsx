'use client'

import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { FlaskConical, Play, Undo2 } from 'lucide-react'
import { T } from '../login-tokens'
import {
  POST_LOGIN_CHOICES,
  clearStoredVariant,
  readStoredVariant,
  writeStoredVariant,
  type PostLoginVariant,
} from './variants'
import { PostLoginPreview, type PreviewLoadSim } from './PostLoginPreview'

/**
 * Development-only comparison lab for the post-login animation
 * candidates (C / D / E). Rendered by LoginView exclusively when
 * NODE_ENV === 'development' — the same gating as SHOW_DEMO_LOGIN.
 * Production builds compile the gate to false, which drops this card
 * and the whole candidate subtree from the client bundle; production
 * always keeps the original BranchRedirect.
 *
 * - "Preview full sign-in" plays the entire chain without signing in:
 *   the candidate overlay, then the REAL dashboard skeleton, then a
 *   clearly-labeled mock ready surface — so the handoff into skeleton
 *   loading is evaluated, not just the overlay in isolation.
 * - The simulated load (fast / typical / slow) controls how long the
 *   preview holds the skeleton phase, covering quick connections and
 *   slow ones alike. Failed requests land in the portal's existing
 *   error card underneath the exit crossfade — same real flow.
 * - The selection persists to localStorage and applies to the next
 *   real sign-in (dev only). A reset link restores the production
 *   default; no winner is pre-selected.
 * - With prefers-reduced-motion the candidates are skipped at sign-in,
 *   so the preview is disabled by default; a preview-only override
 *   lets the owner review them anyway (sign-in is never affected).
 */
export function AnimationLab() {
  const [selected, setSelected] = useState<PostLoginVariant>('default')
  const [previewing, setPreviewing] = useState(false)
  const [sim, setSim] = useState<PreviewLoadSim>('typical')
  const [overrideReduced, setOverrideReduced] = useState(false)
  const reducedMotion = useReducedMotion()
  const reduced = !!reducedMotion && !overrideReduced

  useEffect(() => {
    // One-time, hydration-safe read of the persisted selection. Reading
    // localStorage during render instead would make SSR ('default') and
    // client markup diverge → hydration error, so the sync setState here
    // is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(readStoredVariant())
  }, [])

  const choose = (variant: PostLoginVariant) => {
    setSelected(variant)
    writeStoredVariant(variant)
  }

  const reset = () => {
    setSelected('default')
    clearStoredVariant()
  }

  const canPreview = selected !== 'default'

  const note = !canPreview
    ? 'No candidate selected — real sign-ins keep the production default redirect.'
    : reducedMotion
      ? overrideReduced
        ? 'Preview override is on. Sign-in still skips the candidate under reduced motion.'
        : 'Reduced motion is detected — sign-in skips the candidate. Check the override above to preview it anyway.'
      : 'Preview plays the full chain without signing in. Your selection applies to the next sign-in on this device (dev only).'

  return (
    <div className="mt-6 rounded-[10px] p-4" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
      <div className="flex items-center gap-2 mb-1">
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
      <p className="text-[11px] leading-relaxed mb-3" style={{ color: T.muted }}>
        Three candidates under review — the production default stays active until you pick a winner.
      </p>

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

      {selected !== 'default' ? (
        <button
          type="button"
          onClick={reset}
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold"
          style={{ color: T.muted }}
        >
          <Undo2 className="w-3 h-3" />
          Reset to production default
        </button>
      ) : null}

      {/* Simulated content-load speed for the preview's skeleton phase */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[11px] font-medium" style={{ color: T.muted }}>
          Simulated load:
        </span>
        <div className="flex gap-1">
          {(['fast', 'typical', 'slow'] as const).map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={sim === id}
              onClick={() => setSim(id)}
              className="text-[11px] font-semibold px-2 py-0.5 rounded-[6px] capitalize transition-all"
              style={
                sim === id
                  ? { background: T.white, color: T.primary, border: `1px solid ${T.accent}` }
                  : { color: T.muted, border: '1px solid transparent' }
              }
            >
              {id}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        disabled={!canPreview || reduced}
        onClick={() => setPreviewing(true)}
        className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-[8px] py-2 text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: T.primary, color: T.white }}
      >
        <Play className="w-3.5 h-3.5" />
        Preview full sign-in
      </button>

      {reducedMotion ? (
        <label className="mt-2 flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={overrideReduced}
            onChange={(e) => setOverrideReduced(e.target.checked)}
            className="mt-0.5"
            style={{ accentColor: T.accent }}
          />
          <span className="text-[11px] leading-relaxed" style={{ color: T.muted }}>
            Play preview anyway (preview only — sign-in still honors reduced motion)
          </span>
        </label>
      ) : null}

      <p className="mt-2 text-[11px] leading-relaxed" style={{ color: T.muted }}>
        {note}
      </p>

      {previewing && canPreview && (
        <PostLoginPreview variant={selected} sim={sim} onExit={() => setPreviewing(false)} />
      )}
    </div>
  )
}
