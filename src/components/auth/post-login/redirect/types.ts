// Shared contract for the sign-in progress overlay (stage one of the
// post-login transition). Every presentation — the production
// BranchRedirect and the review variant — receives the same props and
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
 *  production default; 'route-trail' renders only while a development
 *  preview selection asks for it. */
export type AuthVariant = 'classic' | 'route-trail'

export const AUTH_VARIANT_IDS: AuthVariant[] = ['classic', 'route-trail']

export const VARIANT_META: Record<AuthVariant, { label: string; blurb: string }> = {
  classic: {
    label: 'Classic',
    blurb: 'The production default — branch badge, pulsing logo, and the checked step list.',
  },
  'route-trail': {
    label: 'Route Trail',
    blurb:
      'Sign-in as a journey — the dot kisses each waypoint\u2019s outline and the blue check fills through in step with the stage\u2019s real progress.',
  },
}
