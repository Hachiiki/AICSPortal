// Shared contract for the sign-in progress overlay (stage one of the
// post-login transition). Every presentation — the production
// BranchRedirect and the review variants — receives the same props and
// runs the same sequence hook, so candidates can only differ in looks.

/** Real readiness of the portal's initial data (see page.tsx). */
export interface AuthReadiness {
  ready: boolean
  error: boolean
}

/** Props shared by every sign-in progress presentation. */
export interface AuthStageProps {
  branch: string
  onComplete: () => void
  readiness: AuthReadiness
}

/** Presentations of the sign-in progress animation. 'classic' is the
 *  production default; the others render only while a development
 *  preview selection asks for them. */
export type AuthVariant =
  | 'classic'
  | 'route-trail'
  | 'signal-ledger'
  | 'focus-stages'
  | 'orbit'
  | 'boot-console'
  | 'id-pass'
  | 'threshold'

export const AUTH_VARIANT_IDS: AuthVariant[] = [
  'classic',
  'route-trail',
  'signal-ledger',
  'focus-stages',
  'orbit',
  'boot-console',
  'id-pass',
  'threshold',
]

export const VARIANT_META: Record<AuthVariant, { label: string; blurb: string }> = {
  classic: {
    label: 'Classic',
    blurb: 'The production default — branch badge, pulsing logo, and the checked step list.',
  },
  'route-trail': {
    label: 'Route Trail',
    blurb: 'Sign-in as a journey: an accent line travels the waypoints toward your branch.',
  },
  'signal-ledger': {
    label: 'Signal Ledger',
    blurb: 'An operator-style manifest — a progress dial beside rows that check off as stages land.',
  },
  'focus-stages': {
    label: 'Focus Stages',
    blurb: 'One stage at a time in bold type on the school navy, with a segmented progress bar.',
  },
  orbit: {
    label: 'Orbit',
    blurb: 'A campus roundel with the stages as stations on a ring — a sweep passes each as it ignites.',
  },
  'boot-console': {
    label: 'Boot Console',
    blurb: 'A quiet terminal session — the sign-in prints as a boot log that checks off line by line.',
  },
  'id-pass': {
    label: 'ID Pass',
    blurb: 'Your portal pass issues itself — the ID card personalizes as each stage lands.',
  },
  threshold: {
    label: 'Threshold',
    blurb: 'The portal as a doorway — panels part and light widens through the gap as stages land.',
  },
}
