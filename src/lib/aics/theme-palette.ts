// Theme palette layer (theme expansion, Refs #92).
//
// A palette is a re-map of the dark surface ladder (see the palette
// blocks in src/app/globals.css). Three pieces keep <html> in sync and
// they must stay in agreement:
//
//   1. The pre-paint script (PALETTE_BOOT_SCRIPT below, rendered by
//      src/components/ThemePaletteScript.tsx) runs before first paint
//      so a stored palette never flashes the standard dark first.
//   2. ThemePaletteSync (src/components/ThemePaletteSync.tsx) re-applies
//      the same rules whenever next-themes reports a theme change, so
//      the Topbar/login quick toggles keep the palette consistent.
//   3. The Settings appearance section calls setPalettePref / preview /
//      save APIs here for user-driven changes.
//
// Storage (device-local only, matching the aics_theme convention; no
// account sync — that would need an API route + DB field and stays out
// until the owner approves it):
//   aics_palette       'dark' | 'midnight' | 'slate' | 'oled' | 'custom'
//   aics_custom_theme  { base, colors, vars } for the custom editor
//
// Rules, mirrored in the boot script:
//   - Non-custom palettes ride along whenever the app is dark
//     (including system-resolved dark); the attribute is inert in
//     light mode because the CSS blocks are .dark-scoped.
//   - Custom applies on BOTH explicit light and dark (its var map
//     re-maps the full slate/gray bridge, so the utilities ladder
//     follows the user's colors on either base). The stored `base` is
//     informational — it never gates application and editing the
//     background never switches the selected theme. System strips it
//     (no explicit utilities base to ride on).

export const PALETTE_STORAGE_KEY = 'aics_palette'
export const CUSTOM_THEME_STORAGE_KEY = 'aics_custom_theme'

export type PaletteId = 'dark' | 'midnight' | 'slate' | 'oled' | 'custom'
export type CustomBase = 'dark' | 'light'

/** The six editable custom-theme colors (hex, #rrggbb). */
export interface CustomThemeColors {
  accent: string
  background: string
  surface: string
  text: string
  mutedText: string
  border: string
}

/** What lands in localStorage for a saved custom theme. `vars` is the
 *  precomputed var map so the boot script never needs the math. */
export interface StoredCustomTheme {
  base: CustomBase
  colors: CustomThemeColors
  vars: Record<string, string>
}

/** Seed values mirror the standard dark palette so "Custom" starts
 *  from something already coherent; the user nudges from there. */
export const DEFAULT_CUSTOM_COLORS: CustomThemeColors = {
  accent: '#6EA8FE',
  background: '#10151C',
  surface: '#1A2029',
  text: '#E8EAEE',
  mutedText: '#9AA3B2',
  border: '#333B47',
}

export interface PaletteOption {
  id: PaletteId | 'light' | 'system'
  label: string
  desc: string
  /** Illustrative swatch strip for the settings card: [bg, card, border, accent]. */
  swatch: [string, string, string, string]
}

/** The full choice list for the Settings appearance grid. Order is
 *  the display order. Swatches are static illustrations, not live
 *  tokens — the real palette lives in globals.css. */
export const THEME_CHOICES: PaletteOption[] = [
  { id: 'light', label: 'Light', desc: 'Bright surfaces and dark text.', swatch: ['#FFFFFF', '#F8FAFC', '#E2E8F0', '#2563EB'] },
  { id: 'dark', label: 'Dark', desc: 'The default dark palette, easy on the eyes.', swatch: ['#171C24', '#1F2530', '#333C49', '#6EA8FE'] },
  { id: 'midnight', label: 'Midnight', desc: 'A deeper, bluer dark for low-light rooms.', swatch: ['#0D1119', '#141926', '#242C41', '#6EA8FE'] },
  { id: 'slate', label: 'Slate', desc: 'Dark without the blue tint. Pure neutral.', swatch: ['#1A1C1E', '#232528', '#34373B', '#8B98A9'] },
  { id: 'oled', label: 'OLED Black', desc: 'True black surfaces for OLED screens.', swatch: ['#000000', '#10141A', '#1F2530', '#6EA8FE'] },
  { id: 'custom', label: 'Custom', desc: 'Pick your own colors in the editor below.', swatch: ['#10151C', '#1A2029', '#333B47', '#6EA8FE'] },
  { id: 'system', label: 'System', desc: 'Follows your device.', swatch: ['#FFFFFF', '#171C24', '#E2E8F0', '#2563EB'] },
]

// ---------------------------------------------------------------------------
// Color math (editor + base detection; small and dependency-free)
// ---------------------------------------------------------------------------

const HEX_RE = /^#([0-9a-fA-F]{6})$/

export function isValidHex(value: string): boolean {
  return HEX_RE.test(value.trim())
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.trim().replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

/** sRGB-channel mixing: mixHex(a, b, 0.25) = 25% of b over a. */
export function mixHex(a: string, b: string, weight: number): string {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  const w = Math.max(0, Math.min(1, weight))
  return rgbToHex(r1 + (r2 - r1) * w, g1 + (g2 - g1) * w, b1 + (b2 - b1) * w)
}

/** WCAG relative luminance (0 = black, 1 = white). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio between two hex colors (1..21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * Which utility base a custom background implies: below 0.35 relative
 * luminance the dark utilities read correctly, above it the light
 * ones do. The editor previews across the threshold live, so the user
 * always sees exactly what saving will do.
 */
export function detectBase(background: string): CustomBase {
  return relativeLuminance(background) < 0.35 ? 'dark' : 'light'
}

// ---------------------------------------------------------------------------
// Custom theme -> CSS var map
// ---------------------------------------------------------------------------

/** Every inline var the custom layer is allowed to write. The sync
 *  code uses this list to clear stale values; keep it exactly in sync
 *  with customThemeToVars(). The slate/gray bridge rungs are part of
 *  the set: the visible page canvas is `bg-slate-50` (PortalShell and
 *  the loading/error shells), so a custom background only reaches the
 *  page when --color-slate-50 rides along with --background. */
export const CUSTOM_VAR_KEYS = [
  '--background', '--foreground',
  '--card', '--card-foreground',
  '--popover', '--popover-foreground',
  '--primary', '--primary-foreground',
  '--secondary', '--secondary-foreground',
  '--muted', '--muted-foreground',
  '--accent', '--accent-foreground',
  '--border', '--input',
  '--sidebar', '--sidebar-foreground',
  '--sidebar-primary', '--sidebar-primary-foreground',
  '--sidebar-accent', '--sidebar-accent-foreground',
  '--sidebar-border',
  '--surface', '--surface-2',
  '--line', '--ink', '--body', '--muted-fg',
  '--link', '--link-strong', '--link-deep',
  '--ring', '--avatar-bg',
  '--login-bg', '--login-surface', '--login-border',
  '--login-text', '--login-muted',
  '--login-primary', '--login-primary-dark',
  '--login-accent', '--login-accent-soft',
  // Slate/gray bridge (same rungs the .dark block and the palette
  // blocks re-map). Low rungs carry elevation from the background
  // ladder; high rungs carry text weight so utilities compile to the
  // user's colors on either utilities base.
  '--color-slate-50', '--color-slate-100', '--color-slate-200',
  '--color-slate-300', '--color-slate-400', '--color-slate-500',
  '--color-slate-600', '--color-slate-700', '--color-slate-800',
  '--color-slate-900',
  '--color-gray-50', '--color-gray-100',
] as const

/**
 * Derive the full var map from the six editable colors. Derived values
 * follow the vault's dark-mode guidance: elevation and borders carry
 * hierarchy instead of shadows, hover shades lighten on dark bases,
 * and the accent's foreground is picked by contrast so primary buttons
 * stay readable whatever the user picks. The slate/gray bridge is
 * re-mapped from the same anchors (surfaces low, text high) so the
 * whole utility ladder follows the custom colors on EITHER utilities
 * base — the canvas (`bg-slate-50`) paints the exact background, and
 * `text-slate-900` etc. resolve to the user's text. The status scales
 * deliberately stay on their base-class values — custom recolors
 * surfaces and the accent, not the semantic status ramp.
 */
export function customThemeToVars(c: CustomThemeColors): Record<string, string> {
  const surface2 = mixHex(c.surface, c.text, 0.045)
  const body = mixHex(c.text, c.mutedText, 0.5)
  const linkStrong = mixHex(c.accent, '#FFFFFF', 0.08)
  const linkDeep = mixHex(c.accent, '#FFFFFF', 0.16)
  const accentHover = mixHex(c.accent, '#FFFFFF', 0.12)
  const avatarBg = mixHex(c.surface, c.text, 0.12)
  const accentFg = relativeLuminance(c.accent) > 0.45 ? '#0D1117' : '#F4F6F9'
  const accentSoft = withAlpha(c.accent, 0.133)
  // Bridge ladder, calibrated against the .dark block's rung spacing:
  // 50 = canvas (exactly the user's background), 200 = the border/line
  // rung, 500 = muted text, 700 = body text, 900 = main text; the
  // in-between rungs interpolate between those anchors. gray-50/100
  // mirror slate-100/200 as they do in .dark.
  const slate100 = mixHex(c.background, c.border, 0.3)
  const slate300 = mixHex(c.border, c.mutedText, 0.3)
  const slate400 = mixHex(c.border, c.mutedText, 0.6)
  const slate600 = mixHex(c.mutedText, c.text, 0.27)
  const slate800 = mixHex(c.mutedText, c.text, 0.8)
  const gray100 = mixHex(slate100, c.border, 0.35)
  return {
    '--background': c.background,
    '--foreground': c.text,
    '--card': c.surface,
    '--card-foreground': c.text,
    '--popover': c.surface,
    '--popover-foreground': c.text,
    '--primary': c.accent,
    '--primary-foreground': accentFg,
    '--secondary': surface2,
    '--secondary-foreground': c.text,
    '--muted': surface2,
    '--muted-foreground': c.mutedText,
    '--accent': surface2,
    '--accent-foreground': c.text,
    '--border': c.border,
    '--input': c.border,
    '--sidebar': c.surface,
    '--sidebar-foreground': c.text,
    '--sidebar-primary': c.accent,
    '--sidebar-primary-foreground': accentFg,
    '--sidebar-accent': surface2,
    '--sidebar-accent-foreground': c.text,
    '--sidebar-border': c.border,
    '--surface': c.surface,
    '--surface-2': surface2,
    '--line': c.border,
    '--ink': c.text,
    '--body': body,
    '--muted-fg': c.mutedText,
    '--link': c.accent,
    '--link-strong': linkStrong,
    '--link-deep': linkDeep,
    '--ring': c.accent,
    '--avatar-bg': avatarBg,
    '--login-bg': c.background,
    '--login-surface': c.surface,
    '--login-border': c.border,
    '--login-text': c.text,
    '--login-muted': c.mutedText,
    '--login-primary': c.accent,
    '--login-primary-dark': accentHover,
    '--login-accent': c.accent,
    '--login-accent-soft': accentSoft,
    '--color-slate-50': c.background,
    '--color-slate-100': slate100,
    '--color-slate-200': c.border,
    '--color-slate-300': slate300,
    '--color-slate-400': slate400,
    '--color-slate-500': c.mutedText,
    '--color-slate-600': slate600,
    '--color-slate-700': body,
    '--color-slate-800': slate800,
    '--color-slate-900': c.text,
    '--color-gray-50': slate100,
    '--color-gray-100': gray100,
  }
}

function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

export function readPalettePref(): PaletteId {
  if (typeof window === 'undefined') return 'dark'
  try {
    const v = window.localStorage.getItem(PALETTE_STORAGE_KEY)
    if (v === 'midnight' || v === 'slate' || v === 'oled' || v === 'custom') return v
  } catch {
    /* private mode etc. — fall back to the standard palette */
  }
  return 'dark'
}

export function readStoredCustomTheme(): StoredCustomTheme {
  try {
    const raw = window.localStorage.getItem(CUSTOM_THEME_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as StoredCustomTheme
      const colorsOk =
        parsed && parsed.colors &&
        (Object.keys(DEFAULT_CUSTOM_COLORS) as (keyof CustomThemeColors)[])
          .every((k) => isValidHex(parsed.colors[k]))
      if (parsed && colorsOk && (parsed.base === 'dark' || parsed.base === 'light')) {
        // Colors are the source of truth: always re-derive the var map
        // so a save from an older var-map version (pre slate/gray
        // bridge) upgrades in place instead of half-applying. Only
        // rewrite storage when the derivation actually changed.
        const vars = customThemeToVars(parsed.colors)
        if (!parsed.vars || parsed.vars['--color-slate-50'] !== vars['--color-slate-50']) {
          const healed: StoredCustomTheme = { base: parsed.base, colors: parsed.colors, vars }
          try {
            window.localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(healed))
          } catch {
            /* storage full/blocked — the in-memory healed copy below still works */
          }
          return healed
        }
        return { base: parsed.base, colors: parsed.colors, vars }
      }
    }
  } catch {
    /* corrupt JSON — reseed below */
  }
  return {
    base: detectBase(DEFAULT_CUSTOM_COLORS.background),
    colors: { ...DEFAULT_CUSTOM_COLORS },
    vars: customThemeToVars(DEFAULT_CUSTOM_COLORS),
  }
}

/** Persist a custom theme (called by the editor's Save). */
export function saveCustomTheme(colors: CustomThemeColors, base: CustomBase): StoredCustomTheme {
  const stored: StoredCustomTheme = { base, colors: { ...colors }, vars: customThemeToVars(colors) }
  try {
    window.localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(stored))
  } catch {
    /* storage full/blocked — the in-memory DOM application still works for this session */
  }
  return stored
}

// ---------------------------------------------------------------------------
// DOM application
// ---------------------------------------------------------------------------

/** While the custom editor is showing a dirty draft, the sync layer
 *  must leave the DOM alone — otherwise a live base flip (which goes
 *  through setTheme) would re-apply the SAVED custom theme and
 *  clobber the preview mid-drag. The editor sets this; Save, Discard,
 *  and unmount clear it. */
let previewingCustom = false

export function setPreviewingCustom(v: boolean) {
  previewingCustom = v
}

function clearCustomVars(el: HTMLElement) {
  for (const key of CUSTOM_VAR_KEYS) el.style.removeProperty(key)
}

/**
 * Apply the palette rules to <html> for the given next-themes stored
 * preference ('light' | 'dark' | 'system' | undefined before mount).
 * Idempotent; safe to call on every theme change.
 *
 * Custom applies on both explicit light and dark — the saved base is
 * informational (used by the editor badge and the one-time mode pick
 * when selecting Custom from System) and never gates application, so
 * editing the background color can never strand the palette. System
 * still strips it: with no explicit utilities base to ride on, the
 * inline vars would fight whatever the OS resolved to.
 */
export function applyPaletteToDom(theme: string | undefined) {
  if (typeof document === 'undefined') return
  if (previewingCustom) return
  const el = document.documentElement
  const palette = readPalettePref()
  const customApplies = palette === 'custom' && (theme === 'dark' || theme === 'light')

  if (palette !== 'dark' && palette !== 'custom') {
    el.setAttribute('data-palette', palette)
  } else if (customApplies) {
    el.setAttribute('data-palette', 'custom')
  } else {
    el.removeAttribute('data-palette')
  }

  clearCustomVars(el)
  if (customApplies) {
    const { vars } = readStoredCustomTheme()
    for (const [key, value] of Object.entries(vars)) el.style.setProperty(key, value)
  }
}

/** Editor live preview: apply a draft directly, bypassing storage. */
export function previewCustomColorsToDom(colors: CustomThemeColors) {
  if (typeof document === 'undefined') return
  const el = document.documentElement
  clearCustomVars(el)
  el.setAttribute('data-palette', 'custom')
  const vars = customThemeToVars(colors)
  for (const [key, value] of Object.entries(vars)) el.style.setProperty(key, value)
}

/** Persist + apply a palette choice (non-custom). The theme (class)
 *  itself stays next-themes' job; the caller sets it alongside. */
export function setPalettePref(id: PaletteId, theme: string | undefined) {
  try {
    window.localStorage.setItem(PALETTE_STORAGE_KEY, id)
  } catch {
    /* ignore — DOM application below still gives this session the right look */
  }
  applyPaletteToDom(theme)
  notifyPaletteChange()
}

/** Event fired whenever setPalettePref writes a new palette, so surfaces
 *  that mirror the palette in React state (the Settings grid) can re-read
 *  it even when the write came from somewhere else (topbar quick toggle). */
export const PALETTE_CHANGE_EVENT = 'aics:palette-change'

function notifyPaletteChange() {
  try {
    window.dispatchEvent(new Event(PALETTE_CHANGE_EVENT))
  } catch {
    /* very old browsers — the Settings grid re-reads on mount anyway */
  }
}

/**
 * Quick-toggle helper (topbar + login). A custom palette rides on BOTH
 * light and dark, so flipping the mode alone would leave the page
 * looking exactly the same — a dead toggle. Treat the quick toggle as
 * an explicit ask for the standard palettes: drop a stored custom
 * palette back to standard, then flip the mode. Dark-family palettes
 * (midnight/slate/oled) keep their ride-along behavior untouched.
 */
export function quickToggleTheme(
  resolvedTheme: string | undefined,
  setTheme: (theme: string) => void,
): void {
  const target = resolvedTheme === 'dark' ? 'light' : 'dark'
  if (readPalettePref() === 'custom') {
    setPalettePref('dark', target)
  }
  setTheme(target)
}

// ---------------------------------------------------------------------------
// Pre-paint boot script
// ---------------------------------------------------------------------------

/**
 * Rendered inline (blocking) at the top of <body>, before the
 * next-themes provider mounts. Vanilla ES5 on purpose: no imports, no
 * template literals, resilient to every failure mode (wrapped in
 * try/catch so a corrupt value can never take the page down). Logic
 * mirrors applyPaletteToDom() — keep the two in agreement.
 *
 * A stored custom theme applies on either explicit light or dark. The
 * vars must carry the slate/gray bridge (‘--color-slate-50’ present);
 * a pre-bridge save from an older build is skipped here and healed by
 * the sync component right after hydration, so the first paint falls
 * back to the standard palette instead of a half-applied custom one.
 */
export const PALETTE_BOOT_SCRIPT = `(function(){try{
var d=document.documentElement,s=window.localStorage;
var t=s.getItem('aics_theme')||'system',p=s.getItem('aics_palette')||'dark';
var custom=p==='custom';
if(!custom&&p!=='dark'){d.setAttribute('data-palette',p);}
var ok=false;
if(custom&&(t==='dark'||t==='light')){
var raw=s.getItem('aics_custom_theme');
if(raw){try{var c=JSON.parse(raw);
if(c&&c.vars&&c.vars['--color-slate-50']){ok=true;d.setAttribute('data-palette','custom');
for(var k in c.vars){d.style.setProperty(k,c.vars[k]);}}
}catch(e){}}
}
if(custom&&!ok){d.removeAttribute('data-palette');}
}catch(e){}})();`
