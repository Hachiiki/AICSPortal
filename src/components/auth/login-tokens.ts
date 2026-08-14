// Login-scoped institutional design tokens.
// Scoped to the login view so the dashboard / profile keep their existing palette.
// Reference direction: real university IT portal — restrained, mature, clean.

export const T = {
  white: '#FFFFFF',
  bg: '#F7F9FB', // page / help-box background
  border: '#D9E0E6',
  text: '#17324D', // primary text / headings
  muted: '#6B7785', // secondary text / icons
  primary: '#1769AA', // primary action blue
  primaryDark: '#124D7A', // hover / pressed
  accent: '#2F9ED8', // small accents, focus ring, scan line
} as const

// Whether to expose the demo / test-login shortcut (dev only).
export const SHOW_DEMO_LOGIN = process.env.NODE_ENV === 'development'

// Dev-only demo credentials. These match the student record seeded in
// MongoDB (scripts/seed-mongodb.ts) and exist ONLY so developers can
// log in with one click during local development. They are NOT mock
// data — the auth still hits the real MongoDB via /api/auth/login.
export const DEV_CREDENTIALS = { username: 'juan.santos', password: 'student123' } as const

// Gradient for the "AICS Portal." accent text — top (#4EA4D7) to bottom (#64BFE9)
export const PORTAL_TEXT_GRADIENT = 'linear-gradient(to bottom, #4EA4D7 0%, #64BFE9 100%)'
