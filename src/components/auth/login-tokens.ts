// Login-scoped institutional design tokens.
// Scoped to the login view so the dashboard / profile keep their existing palette.
// Reference direction: real university IT portal — restrained, mature, clean.

export const T = {
  white: '#FFFFFF',
  bg: '#F7F9FB', // page / help-box background
  border: '#D9E0E6',
  text: '#17324D', // primary text / headings
  muted: '#5D6874', // secondary text / icons (AA: 5.38:1 on bg)
  primary: '#1769AA', // primary action blue
  primaryDark: '#124D7A', // hover / pressed
  accent: '#2893CF', // small accents, focus ring, scan line (3:1+ on white)
} as const

// Whether to expose the demo / test-login shortcut (dev only).
export const SHOW_DEMO_LOGIN = process.env.NODE_ENV === 'development'

// Whether to expose the post-login animation lab (dev only). The three
// alternative animations are a dev-branch experiment pending owner
// review; production compiles this to false, which also lets the bundler
// dead-code-eliminate the variant components from the client bundle —
// production always keeps the current BranchRedirect.
export const SHOW_POST_LOGIN_PREVIEW = process.env.NODE_ENV === 'development'

// Phase 6 (BUG-012 full fix): demo credentials were deleted from the client
// bundle. Dev one-click login calls POST /api/auth/demo, which issues a real
// session server-side (404 in production). Never put passwords here again.

// Gradient for the "AICS Portal." accent text — top (#4EA4D7) to bottom (#64BFE9)
export const PORTAL_TEXT_GRADIENT = 'linear-gradient(to bottom, #4EA4D7 0%, #64BFE9 100%)'
