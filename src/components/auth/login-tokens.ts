// Login-scoped institutional design tokens.
// Scoped to the login view so the dashboard / profile keep their existing palette.
// Reference direction: real university IT portal: restrained, mature, clean.
//
// Theme-aware since dark-theme Phase 1 (plan §2): every value is a
// var(--login-*, fallback) reference. The custom properties live in
// src/app/globals.css with light values on :root and dark values in the
// .dark block, so inline styles using T theme instantly and pre-paint
// (the .dark class cascades from <html> before first render, no flash,
// no hydration concern). The fallback after each var() is the exact
// pre-Phase-1 light hex, so light rendering is byte-identical even if
// the sheet ever loads without the tokens.

export const T = {
  // Panel / input surface (was #FFFFFF).
  white: 'var(--login-surface, #FFFFFF)',
  // Page / help-box background (was #F7F9FB).
  bg: 'var(--login-bg, #F7F9FB)',
  border: 'var(--login-border, #D9E0E6)',
  // Primary text / headings (as TEXT only; as a background use T.navy).
  text: 'var(--login-text, #17324D)',
  // Secondary text / icons (AA: 5.38:1 on bg in light).
  muted: 'var(--login-muted, #5D6874)',
  // Primary action blue; hover/pressed shade inverts in dark (lighter).
  primary: 'var(--login-primary, #1769AA)',
  primaryDark: 'var(--login-primary-dark, #124D7A)',
  // Small accents, focus ring, scan line (3:1+ on white in light).
  accent: 'var(--login-accent, #2893CF)',
  // Composed accent at 13.33% alpha (replaces the former `${T.accent}22`
  // string concat, which cannot append a hex alpha suffix to var()).
  accentSoft: 'var(--login-accent-soft, rgba(40, 147, 207, 0.133333))',
  // Brand-constant navy: the left brand panel and the Face ID overlays
  // that carry white text keep this value in BOTH themes (plan §2).
  navy: 'var(--login-navy, #17324D)',
  // Navy at 90% alpha (replaces the former `${T.text}E6` concat).
  navyVeil: 'var(--login-navy-veil, rgba(23, 50, 77, 0.901961))',
} as const

// Whether to expose the demo / test-login shortcut (dev only).
export const SHOW_DEMO_LOGIN = process.env.NODE_ENV === 'development'

// Phase 6 (BUG-012 full fix): demo credentials were deleted from the client
// bundle. Dev one-click login calls POST /api/auth/demo, which issues a real
// session server-side (404 in production). Never put passwords here again.

// Gradient for the "AICS Portal." accent text — top (#4EA4D7) to bottom (#64BFE9)
export const PORTAL_TEXT_GRADIENT = 'linear-gradient(to bottom, #4EA4D7 0%, #64BFE9 100%)'
