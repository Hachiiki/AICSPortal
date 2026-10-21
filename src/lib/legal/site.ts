// Single source of truth for legal-surface facts shared by the policy
// pages, the cookie banner, and in-app footers. Every date and contact
// here is operator-maintained. Update this file, not the pages.

export const LEGAL = {
  // Spelled to match the owner's git/GitHub identity ("Willard", as in
  // DevBanner and the git author name). The README previously carried
  // "Wilard"; verify against a government ID and align if wrong.
  operatorName: 'Willard James Paluga',
  operatorEmail: 'ninonakano408@gmail.com',
  operatorRole: 'independent developer and site operator',
  // Keep in sync with the commit that ships a policy change.
  lastUpdated: '2026-10-20',
  // Jurisdiction of the operator and the primary audience.
  jurisdiction: 'Republic of the Philippines',
} as const

// Cookie / consent machinery constants (see CookieConsent.tsx).
export const CONSENT_STORAGE_KEY = 'aics_cookie_consent'
export const CONSENT_RESET_EVENT = 'aics:cookie-consent-reset'
export type ConsentChoice = 'essential' | 'analytics'

export const POLICY_PAGES = [
  { href: '/legal/privacy', label: 'Privacy Policy' },
  { href: '/legal/terms', label: 'Terms & Conditions' },
  { href: '/legal/cookies', label: 'Cookie Policy' },
  { href: '/legal/refund', label: 'Refund Policy' },
] as const

// Session cookie facts mirrored from src/lib/session.ts so the policy
// pages cannot drift from the implementation without a code change here.
export const SESSION_FACTS = {
  cookieName: 'aics_session',
  defaultHours: 8,
  rememberMeDays: 7,
} as const
