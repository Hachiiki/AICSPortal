'use client'

// Custom theme editor (theme expansion, Refs #92).
//
// In-page editor under the Settings appearance radios. Six editable
// colors drive the full custom var map from theme-palette.ts, so the
// whole portal — cards, sidebar, popovers, inputs, links, the sign-in
// screen — restyles together; nothing here touches a single component
// in isolation.
//
// Interaction model:
//   - Every change previews LIVE on the document (previewCustomColorsToDom).
//     The var map re-maps the full slate/gray bridge, so the draft
//     paints the real page canvas — on either utilities base.
//   - Nothing here ever switches the selected theme: the detected
//     light/dark base is informational only (the badge + the stored
//     base field), because flipping the mode on a background edit
//     kicked the user out of their Custom selection (issue: white
//     background auto-switched the app to Light).
//   - Nothing persists until Save. Discard restores the saved theme;
//     Reset loads the default seed as another draft (still unsaved).
//   - While a draft is dirty, the palette sync layer stands down
//     (setPreviewingCustom) so nothing re-applies the stored values
//     over the preview mid-edit.
//
// Contrast readouts follow WCAG: 4.5:1 for body text, 3:1 for large
// text and UI. They warn, never block — the owner of the device gets
// the final word on their own colors.

import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { Save, RotateCcw, Undo2, Check, AlertTriangle, X } from 'lucide-react'
import {
  type CustomThemeColors,
  DEFAULT_CUSTOM_COLORS,
  detectBase,
  isValidHex,
  previewCustomColorsToDom,
  readStoredCustomTheme,
  saveCustomTheme,
  setPalettePref,
  setPreviewingCustom,
  applyPaletteToDom,
  contrastRatio,
} from '@/lib/aics/theme-palette'

const FIELDS: { key: keyof CustomThemeColors; label: string; hint: string }[] = [
  { key: 'accent', label: 'Accent', hint: 'Buttons, links, focus rings' },
  { key: 'background', label: 'Background', hint: 'The page behind everything' },
  { key: 'surface', label: 'Surface', hint: 'Cards, sidebar, popovers' },
  { key: 'text', label: 'Main text', hint: 'Headings and body copy' },
  { key: 'mutedText', label: 'Muted text', hint: 'Secondary labels and hints' },
  { key: 'border', label: 'Borders', hint: 'Card edges and inputs' },
]

export function CustomThemeEditor({
  initialColors,
  onSaved,
}: {
  initialColors: CustomThemeColors
  onSaved: () => void
}) {
  const { theme } = useTheme()
  const [draft, setDraft] = useState<CustomThemeColors>(initialColors)
  const [dirty, setDirty] = useState(false)
  // Ref mirror so rapid color-input events always build on the latest
  // draft, never a stale closure. Written from effects (not render)
  // per the react-hooks compiler rules.
  const draftRef = useRef(draft)
  const themeRef = useRef(theme)
  useEffect(() => {
    themeRef.current = theme
  }, [theme])

  const allValid = (Object.values(draft) as string[]).every((v) => isValidHex(v))
  const base = detectBase(draft.background)

  // Leaving the editor mid-edit (navigation, section switch) must not
  // strand a preview: stand the sync layer back up and re-apply the
  // saved state.
  useEffect(
    () => () => {
      setPreviewingCustom(false)
      applyPaletteToDom(themeRef.current)
    },
    []
  )

  const update = (key: keyof CustomThemeColors) => (value: string) => {
    const next = { ...draftRef.current, [key]: value.toUpperCase() }
    draftRef.current = next
    setDraft(next)
    setDirty(true)
    setPreviewingCustom(true)
    previewCustomColorsToDom(next)
    // Deliberately NO setTheme here: the selected theme is independent
    // of the background value. The bridge rungs in customThemeToVars
    // keep utilities readable on the current base, whatever it is.
  }

  const handleSave = () => {
    if (!allValid) return
    setPreviewingCustom(false)
    // The stored base stays informational (it guides the one-time mode
    // pick when Custom is selected from System). Saving never switches
    // the current theme — the colors apply on either base.
    const savedBase = detectBase(draft.background)
    saveCustomTheme(draft, savedBase)
    setPalettePref('custom', themeRef.current)
    setDirty(false)
    onSaved()
  }

  const handleDiscard = () => {
    setPreviewingCustom(false)
    const stored = readStoredCustomTheme()
    draftRef.current = stored.colors
    setDraft(stored.colors)
    // Re-apply the SAVED custom theme under the current theme (no mode
    // change), replacing the draft preview on the document.
    setPalettePref('custom', themeRef.current)
    setDirty(false)
  }

  const handleReset = () => {
    const next = { ...DEFAULT_CUSTOM_COLORS }
    draftRef.current = next
    setDraft(next)
    setDirty(true)
    setPreviewingCustom(true)
    previewCustomColorsToDom(next)
  }

  return (
    <div className="mt-5 rounded-lg border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Custom theme editor</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Changes preview live across the whole portal. Save keeps them on this device.
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-surface border border-slate-200 rounded-full px-2.5 py-1">
          {base === 'dark' ? 'Dark base' : 'Light base'}
        </span>
      </div>

      <div className="p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FIELDS.map((f) => (
          <ColorField
            key={f.key}
            label={f.label}
            hint={f.hint}
            value={draft[f.key]}
            onChange={update(f.key)}
          />
        ))}
      </div>

      <div className="px-4 pb-4">
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold text-slate-700 mb-2">Readability check</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            <ContrastRow label="Main text on background" a={draft.text} b={draft.background} />
            <ContrastRow label="Main text on surfaces" a={draft.text} b={draft.surface} />
            <ContrastRow label="Muted text on surfaces" a={draft.mutedText} b={draft.surface} />
            <ContrastRow label="Accent used as links" a={draft.accent} b={draft.background} />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
            Aim for 4.5:1 or better on body text. Your colors apply on top of the
            current Light/Dark utilities — the badge shows which base your
            background suits, but the selection stays yours to make.
          </p>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!allValid || !dirty}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--login-primary)] hover:bg-[var(--login-primary-dark)] text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Save className="w-3.5 h-3.5" aria-hidden /> Save custom theme
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 bg-surface text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden /> Reset to defaults
        </button>
        <button
          type="button"
          onClick={handleDiscard}
          disabled={!dirty}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 bg-surface text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Undo2 className="w-3.5 h-3.5" aria-hidden /> Discard changes
        </button>
      </div>
    </div>
  )
}

function ColorField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint: string
  value: string
  onChange: (v: string) => void
}) {
  const [text, setText] = useState(value)
  // External resets (Discard, Reset) push a new value in; follow along.
  // Render-phase adjustment (the React-sanctioned derive-from-props
  // pattern) instead of a setState-in-effect.
  const [lastExternal, setLastExternal] = useState(value)
  if (value !== lastExternal) {
    setLastExternal(value)
    setText(value)
  }
  const textValid = isValidHex(text)

  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 mb-1.5">
        {label}
        <span className="ml-1.5 font-normal text-slate-400">{hint}</span>
      </label>
      <div className="flex items-center gap-2">
        <span
          className="relative inline-flex h-9 w-9 shrink-0 rounded-lg border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500"
          aria-hidden="true"
        >
          <input
            type="color"
            value={textValid ? text : '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="absolute -inset-2 w-[calc(100%+1rem)] h-[calc(100%+1rem)] cursor-pointer border-0 p-0 bg-transparent"
            aria-label={`${label} color picker`}
            tabIndex={-1}
          />
        </span>
        <input
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            if (isValidHex(e.target.value)) onChange(e.target.value)
          }}
          onBlur={() => setText((t) => (isValidHex(t) ? t.toUpperCase() : value))}
          spellCheck={false}
          maxLength={7}
          aria-label={`${label} hex value`}
          aria-invalid={!textValid}
          className={`w-full h-9 px-2.5 rounded-lg border font-mono text-xs uppercase transition-colors bg-surface focus:outline-none focus:ring-2 ${
            textValid
              ? 'border-slate-200 text-slate-800 focus:ring-blue-500'
              : 'border-red-300 text-red-600 focus:ring-red-400'
          }`}
          placeholder="#RRGGBB"
        />
      </div>
      {!textValid && (
        <p className="mt-1 text-[11px] text-red-600">Use a six-digit hex color like #1A2029.</p>
      )}
    </div>
  )
}

function ContrastRow({ label, a, b }: { label: string; a: string; b: string }) {
  const valid = isValidHex(a) && isValidHex(b)
  const ratio = valid ? contrastRatio(a, b) : 0
  const level = ratio >= 4.5 ? 'aa' : ratio >= 3 ? 'large' : 'low'
  return (
    <p className="flex items-center gap-1.5 text-xs text-slate-600">
      {level === 'aa' && <Check className="w-3.5 h-3.5 text-green-600 shrink-0" aria-hidden />}
      {level === 'large' && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden />}
      {level === 'low' && <X className="w-3.5 h-3.5 text-red-500 shrink-0" aria-hidden />}
      <span>
        {label}:{' '}
        <span className="font-mono font-semibold">
          {valid ? `${ratio.toFixed(2)}:1` : '—'}
        </span>
        {level === 'large' && <span className="text-slate-400"> (large text only)</span>}
        {level === 'low' && <span className="text-slate-400"> (hard to read)</span>}
      </span>
    </p>
  )
}
