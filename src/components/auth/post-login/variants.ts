// Post-login animation candidates — dev-branch experiment pending owner
// review (Option C refined into a two-stage flow — the preserved
// redirect gated on real readiness, then the workspace assembly;
// Options D/E single-stage; rejected A/B removed). The production
// default remains the original BranchRedirect; candidates activate
// only through the dev-only AnimationLab selection.
import { SHOW_POST_LOGIN_PREVIEW } from '../login-tokens'

export type PostLoginVariant = 'default' | 'assemble' | 'aperture' | 'framedraw'

/**
 * localStorage key for the dev-only selection. Absent or invalid values
 * (including the retired 'bloom'/'sweep' ids) resolve to 'default' — the
 * current production animation. The key is only ever written by the
 * AnimationLab, which never renders outside development builds.
 */
export const POST_LOGIN_VARIANT_KEY = 'aics.postLoginVariant'

export interface PostLoginChoice {
  id: PostLoginVariant
  label: string
  blurb: string
}

/** Ordered candidates shown in the dev-only AnimationLab. */
export const POST_LOGIN_CHOICES: PostLoginChoice[] = [
  {
    id: 'assemble',
    label: 'Option C — Workspace Assemble (two-stage)',
    blurb: 'Existing redirect holds for real data, then the workspace assembles',
  },
  {
    id: 'aperture',
    label: 'Option D — Aperture',
    blurb: 'The navy login canvas opens into the workspace like a lens',
  },
  {
    id: 'framedraw',
    label: 'Option E — Frame Draw',
    blurb: 'Drafting lines draw the frame, then the content wells fill in',
  },
]

const CANDIDATES: PostLoginVariant[] = ['assemble', 'aperture', 'framedraw']

/** Read the dev-only selection. SSR-safe; invalid values fall back. */
export function readStoredVariant(): PostLoginVariant {
  if (typeof window === 'undefined') return 'default'
  const raw = window.localStorage.getItem(POST_LOGIN_VARIANT_KEY)
  return CANDIDATES.includes(raw as PostLoginVariant) ? (raw as PostLoginVariant) : 'default'
}

/** Persist the dev-only selection (client only). */
export function writeStoredVariant(variant: PostLoginVariant): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(POST_LOGIN_VARIANT_KEY, variant)
}

/** Clear the dev-only selection — subsequent sign-ins use the default. */
export function clearStoredVariant(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(POST_LOGIN_VARIANT_KEY)
}

/**
 * The variant that should drive the CURRENT render's post-login path.
 * Compiles to a constant 'default' in production builds, so the page's
 * variant render path (portal mounting underneath the overlay) can be
 * dead-code-eliminated there — production keeps the exclusive
 * BranchRedirect overlay, byte-identical to today.
 */
export function activePostLoginVariant(): PostLoginVariant {
  return SHOW_POST_LOGIN_PREVIEW ? readStoredVariant() : 'default'
}
