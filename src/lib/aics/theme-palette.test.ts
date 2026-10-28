// Unit tests for the theme palette layer (custom theme editor fixes,
// Refs #92). Pure-logic coverage plus a fake-DOM harness for the
// application paths — bun test (same runner the authz suites use; see
// src/lib/authz/bun-test.d.ts for the type shim).
//
// Regression focus (the two reported bugs):
//   1. A background color edit must never switch the selected theme:
//      applyPaletteToDom no longer gates custom on base === theme, and
//      the boot script mirrors that.
//   2. The background must actually paint the page: customThemeToVars
//      re-maps the slate/gray bridge (--color-slate-50 IS the canvas
//      behind PortalShell's bg-slate-50), and readStoredCustomTheme
//      self-heals pre-bridge saves.

import { beforeEach, describe, expect, it } from 'bun:test'
import {
  CUSTOM_THEME_STORAGE_KEY,
  CUSTOM_VAR_KEYS,
  DEFAULT_CUSTOM_COLORS,
  PALETTE_BOOT_SCRIPT,
  PALETTE_CHANGE_EVENT,
  PALETTE_STORAGE_KEY,
  applyPaletteToDom,
  customThemeToVars,
  detectBase,
  isValidHex,
  previewCustomColorsToDom,
  quickToggleTheme,
  readPalettePref,
  readStoredCustomTheme,
  saveCustomTheme,
  setPalettePref,
  setPreviewingCustom,
  type CustomThemeColors,
} from './theme-palette'

// ---------------------------------------------------------------------------
// Fake DOM/localStorage harness
// ---------------------------------------------------------------------------

interface FakeEl {
  style: {
    setProperty: (k: string, v: string) => void
    removeProperty: (k: string) => void
  }
  setAttribute: (k: string, v: string) => void
  removeAttribute: (k: string) => void
  getAttribute: (k: string) => string | null
  vars: Map<string, string>
  attrs: Map<string, string>
}

function installFakeDom() {
  const vars = new Map<string, string>()
  const attrs = new Map<string, string>()
  const el: FakeEl = {
    vars,
    attrs,
    style: {
      setProperty: (k, v) => void vars.set(k, v),
      removeProperty: (k) => void vars.delete(k),
    },
    setAttribute: (k, v) => void attrs.set(k, v),
    removeAttribute: (k) => void attrs.delete(k),
    getAttribute: (k) => attrs.get(k) ?? null,
  }
  const store = new Map<string, string>()
  const listeners = new Map<string, (() => void)[]>()
  ;(globalThis as Record<string, unknown>).window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
    dispatchEvent: (ev: { type: string }) => {
      for (const fn of listeners.get(ev.type) ?? []) fn()
      return true
    },
    addEventListener: (type: string, fn: () => void) => {
      listeners.set(type, [...(listeners.get(type) ?? []), fn])
    },
  }
  ;(globalThis as Record<string, unknown>).document = { documentElement: el }
  return { el, store, listeners }
}

function seedStorage(key: string, value: string) {
  ;(globalThis as unknown as { window: { localStorage: Storage } }).window.localStorage.setItem(key, value)
}

function fakeEl(): FakeEl {
  return (globalThis as unknown as { document: { documentElement: FakeEl } }).document.documentElement
}

function seedCustomSave(colors: CustomThemeColors, base: 'dark' | 'light', vars: Record<string, string>) {
  seedStorage(CUSTOM_THEME_STORAGE_KEY, JSON.stringify({ base, colors, vars }))
}

beforeEach(() => {
  installFakeDom()
  setPreviewingCustom(false)
})

// ---------------------------------------------------------------------------
// customThemeToVars — the var map (bug 2 core)
// ---------------------------------------------------------------------------

describe('customThemeToVars', () => {
  it('maps the six editable colors onto the shadcn/surface tokens', () => {
    const c: CustomThemeColors = {
      accent: '#6EA8FE',
      background: '#10151C',
      surface: '#1A2029',
      text: '#E8EAEE',
      mutedText: '#9AA3B2',
      border: '#333B47',
    }
    const v = customThemeToVars(c)
    expect(v['--background']).toBe(c.background)
    expect(v['--foreground']).toBe(c.text)
    expect(v['--card']).toBe(c.surface)
    expect(v['--border']).toBe(c.border)
    expect(v['--muted-foreground']).toBe(c.mutedText)
    expect(v['--primary']).toBe(c.accent)
  })

  it('paints the page canvas: --color-slate-50 is exactly the background', () => {
    // PortalShell (and the loading/error shells) paint the visible page
    // with bg-slate-50. The custom background only reaches the page if
    // the bridge rung rides along with --background.
    const v = customThemeToVars({ ...DEFAULT_CUSTOM_COLORS, background: '#DDE8F5' })
    expect(v['--color-slate-50']).toBe('#DDE8F5')
    expect(v['--background']).toBe('#DDE8F5')
    expect(v['--color-slate-50']).toBe(v['--background'])
  })

  it('anchors the bridge ladder on border/muted/body/text rungs', () => {
    const c = DEFAULT_CUSTOM_COLORS
    const v = customThemeToVars(c)
    expect(v['--color-slate-200']).toBe(c.border)
    expect(v['--color-slate-500']).toBe(c.mutedText)
    expect(v['--color-slate-700']).toBe(v['--body'])
    expect(v['--color-slate-900']).toBe(c.text)
    expect(v['--color-gray-50']).toBe(v['--color-slate-100'])
  })

  it('keeps CUSTOM_VAR_KEYS exactly in sync with the emitted vars', () => {
    // clearCustomVars() removes exactly CUSTOM_VAR_KEYS; a var emitted
    // but not listed would survive a palette switch as a stale style.
    const emitted = customThemeToVars(DEFAULT_CUSTOM_COLORS)
    expect(Object.keys(emitted).sort()).toEqual([...CUSTOM_VAR_KEYS].sort())
  })
})

// ---------------------------------------------------------------------------
// detectBase — informational only now, but still used by the editor badge
// and the one-time mode pick when Custom is selected from System
// ---------------------------------------------------------------------------

describe('detectBase', () => {
  it('classifies pure white as a light base', () => {
    expect(detectBase('#FFFFFF')).toBe('light')
  })
  it('classifies pure black as a dark base', () => {
    expect(detectBase('#000000')).toBe('dark')
  })
  it('classifies the default seed and pale blues', () => {
    expect(detectBase(DEFAULT_CUSTOM_COLORS.background)).toBe('dark')
    expect(detectBase('#DDE8F5')).toBe('light')
  })
})

// ---------------------------------------------------------------------------
// readStoredCustomTheme — self-healing storage
// ---------------------------------------------------------------------------

describe('readStoredCustomTheme', () => {
  it('heals a pre-bridge save by re-deriving vars from the colors', () => {
    // A save from the previous build: vars lack the slate/gray bridge.
    seedCustomSave({ ...DEFAULT_CUSTOM_COLORS, background: '#FFFFFF' }, 'dark', {
      '--background': '#FFFFFF',
      '--foreground': '#E8EAEE',
    })
    const stored = readStoredCustomTheme()
    expect(stored.colors.background).toBe('#FFFFFF')
    expect(stored.vars['--color-slate-50']).toBe('#FFFFFF')
    // And the healed map is persisted back:
    const persisted = (globalThis as unknown as { window: { localStorage: Storage } }).window.localStorage.getItem(
      CUSTOM_THEME_STORAGE_KEY,
    ) as string
    expect(JSON.parse(persisted).vars['--color-slate-50']).toBe('#FFFFFF')
  })

  it('reseeds on corrupt JSON', () => {
    seedStorage(CUSTOM_THEME_STORAGE_KEY, '{not json')
    const stored = readStoredCustomTheme()
    expect(stored.colors).toEqual(DEFAULT_CUSTOM_COLORS)
    expect(stored.vars['--color-slate-50']).toBe(DEFAULT_CUSTOM_COLORS.background)
  })

  it('reseeds when the stored colors are not valid hex', () => {
    seedCustomSave(
      { accent: 'nope', background: '#10151C', surface: '#1A2029', text: '#E8EAEE', mutedText: '#9AA3B2', border: '#333B47' },
      'dark',
      customThemeToVars(DEFAULT_CUSTOM_COLORS),
    )
    expect(readStoredCustomTheme().colors).toEqual(DEFAULT_CUSTOM_COLORS)
  })

  it('preserves a healthy save untouched', () => {
    const saved = saveCustomTheme({ ...DEFAULT_CUSTOM_COLORS, accent: '#FF0000' }, 'dark')
    const again = readStoredCustomTheme()
    expect(again).toEqual(saved)
  })
})

// ---------------------------------------------------------------------------
// applyPaletteToDom — the sync rules (bug 1 core)
// ---------------------------------------------------------------------------

describe('applyPaletteToDom', () => {
  it('applies custom on a theme that does NOT match the stored base', () => {
    // Regression (bug 1): white background, stored base light, but the
    // app is on the dark theme. The custom palette must still apply —
    // the base is informational and never gates application.
    const saved = saveCustomTheme({ ...DEFAULT_CUSTOM_COLORS, background: '#FFFFFF' }, 'light')
    seedStorage(PALETTE_STORAGE_KEY, 'custom')
    applyPaletteToDom('dark')
    const el = fakeEl()
    expect(el.getAttribute('data-palette')).toBe('custom')
    expect(el.vars.get('--background')).toBe('#FFFFFF')
    expect(el.vars.get('--color-slate-50')).toBe('#FFFFFF')
    expect(saved.base).toBe('light')
  })

  it('applies custom on the matching theme too', () => {
    saveCustomTheme(DEFAULT_CUSTOM_COLORS, 'dark')
    seedStorage(PALETTE_STORAGE_KEY, 'custom')
    applyPaletteToDom('dark')
    const el = fakeEl()
    expect(el.getAttribute('data-palette')).toBe('custom')
    expect(el.vars.get('--color-slate-50')).toBe(DEFAULT_CUSTOM_COLORS.background)
  })

  it('strips custom under system', () => {
    saveCustomTheme(DEFAULT_CUSTOM_COLORS, 'dark')
    seedStorage(PALETTE_STORAGE_KEY, 'custom')
    previewCustomColorsToDom(DEFAULT_CUSTOM_COLORS)
    applyPaletteToDom('system')
    const el = fakeEl()
    expect(el.getAttribute('data-palette')).toBe(null)
    expect(el.vars.has('--background')).toBe(false)
    expect(el.vars.has('--color-slate-50')).toBe(false)
  })

  it('clears all custom vars (including the bridge) when the palette is standard', () => {
    previewCustomColorsToDom(DEFAULT_CUSTOM_COLORS)
    setPalettePref('midnight', 'dark')
    const el = fakeEl()
    expect(el.getAttribute('data-palette')).toBe('midnight')
    for (const key of CUSTOM_VAR_KEYS) {
      expect(el.vars.has(key)).toBe(false)
    }
  })

  it('stands down while the editor is previewing a draft', () => {
    saveCustomTheme(DEFAULT_CUSTOM_COLORS, 'dark')
    seedStorage(PALETTE_STORAGE_KEY, 'custom')
    previewCustomColorsToDom({ ...DEFAULT_CUSTOM_COLORS, background: '#243B55' })
    setPreviewingCustom(true)
    applyPaletteToDom('dark')
    const el = fakeEl()
    // The draft preview survives; the saved theme did not clobber it.
    expect(el.vars.get('--background')).toBe('#243B55')
  })
})

// ---------------------------------------------------------------------------
// quickToggleTheme — the topbar/login toggle interaction
// ---------------------------------------------------------------------------

describe('quickToggleTheme', () => {
  it('drops a custom palette so the toggle visibly switches modes', () => {
    // Custom rides both light and dark; a bare mode flip would be a
    // no-op visually. The toggle resets to the standard palette.
    saveCustomTheme(DEFAULT_CUSTOM_COLORS, 'dark')
    seedStorage(PALETTE_STORAGE_KEY, 'custom')
    const calls: string[] = []
    quickToggleTheme('dark', (t) => calls.push(t))
    expect(calls).toEqual(['light'])
    expect(readPalettePref()).toBe('dark')
    const el = fakeEl()
    expect(el.getAttribute('data-palette')).toBe(null)
    expect(el.vars.has('--background')).toBe(false)
  })

  it('leaves dark-family palettes riding along', () => {
    seedStorage(PALETTE_STORAGE_KEY, 'midnight')
    const calls: string[] = []
    quickToggleTheme('dark', (t) => calls.push(t))
    expect(calls).toEqual(['light'])
    expect(readPalettePref()).toBe('midnight')
  })
})

// ---------------------------------------------------------------------------
// setPalettePref — palette-change notification
// ---------------------------------------------------------------------------

describe('setPalettePref', () => {
  it('fires the palette-change event so the Settings grid can re-read', () => {
    let fired = 0
    ;(globalThis as unknown as { window: { addEventListener: (t: string, fn: () => void) => void } }).window.addEventListener(
      PALETTE_CHANGE_EVENT,
      () => {
        fired++
      },
    )
    setPalettePref('oled', 'dark')
    expect(fired).toBe(1)
    expect(readPalettePref()).toBe('oled')
  })
})

// ---------------------------------------------------------------------------
// PALETTE_BOOT_SCRIPT — the pre-paint mirror of applyPaletteToDom
// ---------------------------------------------------------------------------

describe('PALETTE_BOOT_SCRIPT', () => {
  const runBoot = () => new Function(PALETTE_BOOT_SCRIPT)()

  it('applies a current-format custom save regardless of base mismatch', () => {
    // Bug 1 regression at pre-paint: theme dark + saved base light must
    // still apply (the old script required c.base === t).
    const saved = saveCustomTheme({ ...DEFAULT_CUSTOM_COLORS, background: '#FFFFFF' }, 'light')
    seedStorage(PALETTE_STORAGE_KEY, 'custom')
    seedStorage('aics_theme', 'dark')
    runBoot()
    const el = fakeEl()
    expect(el.getAttribute('data-palette')).toBe('custom')
    expect(el.vars.get('--background')).toBe('#FFFFFF')
    expect(el.vars.get('--color-slate-50')).toBe('#FFFFFF')
    expect(saved.base).toBe('light')
  })

  it('skips a stale pre-bridge save (falls back to the standard palette)', () => {
    seedCustomSave(DEFAULT_CUSTOM_COLORS, 'dark', { '--background': '#10151C' })
    seedStorage(PALETTE_STORAGE_KEY, 'custom')
    seedStorage('aics_theme', 'dark')
    runBoot()
    const el = fakeEl()
    expect(el.getAttribute('data-palette')).toBe(null)
    expect(el.vars.has('--background')).toBe(false)
  })

  it('strips custom under system and rides dark-family palettes', () => {
    seedStorage(PALETTE_STORAGE_KEY, 'custom')
    seedStorage('aics_theme', 'system')
    runBoot()
    const el = fakeEl()
    expect(el.getAttribute('data-palette')).toBe(null)

    seedStorage(PALETTE_STORAGE_KEY, 'oled')
    runBoot()
    expect(el.getAttribute('data-palette')).toBe('oled')
  })
})

// ---------------------------------------------------------------------------
// isValidHex — unchanged validation contract
// ---------------------------------------------------------------------------

describe('isValidHex', () => {
  it('accepts six-digit hex and rejects the rest', () => {
    expect(isValidHex('#FFFFFF')).toBe(true)
    expect(isValidHex('#ffffff')).toBe(true)
    expect(isValidHex(' #DDE8F5 ')).toBe(true)
    expect(isValidHex('#FFF')).toBe(false)
    expect(isValidHex('FFFFFF')).toBe(false)
    expect(isValidHex('#12345')).toBe(false)
    expect(isValidHex('#GGGGGG')).toBe(false)
  })
})
