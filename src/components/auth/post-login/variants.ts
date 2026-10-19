// Post-login animation alternatives — dev-branch experiment pending owner
// review (task: implement three alternatives, do not pick a winner).
// The production default remains the original BranchRedirect; variants
// activate only through the dev-only AnimationLab selection.

export type PostLoginVariant = 'default' | 'bloom' | 'sweep' | 'assemble'

/**
 * localStorage key for the dev-only selection. Absent or invalid values
 * resolve to 'default' (the current production animation). The key is
 * only ever written by the AnimationLab, which never renders outside
 * development builds.
 */
export const POST_LOGIN_VARIANT_KEY = 'aics.postLoginVariant'

export interface PostLoginChoice {
  id: PostLoginVariant
  label: string
  blurb: string
}

/** Ordered choices shown in the dev-only AnimationLab. */
export const POST_LOGIN_CHOICES: PostLoginChoice[] = [
  {
    id: 'default',
    label: 'Default — current redirect',
    blurb: 'Step checklist used in production today',
  },
  {
    id: 'bloom',
    label: 'Option A — Brand Bloom',
    blurb: 'Logo bloom, welcome line, branch chip on white',
  },
  {
    id: 'sweep',
    label: 'Option B — Portal Sweep',
    blurb: 'Navy panels close over the screen, then sweep off',
  },
  {
    id: 'assemble',
    label: 'Option C — Workspace Assemble',
    blurb: 'Sidebar, topbar and cards fly into place',
  },
]

/** Read the dev-only selection. SSR-safe; invalid values fall back. */
export function readStoredVariant(): PostLoginVariant {
  if (typeof window === 'undefined') return 'default'
  const raw = window.localStorage.getItem(POST_LOGIN_VARIANT_KEY)
  return raw === 'bloom' || raw === 'sweep' || raw === 'assemble' ? raw : 'default'
}

/** Persist the dev-only selection (client only). */
export function writeStoredVariant(variant: PostLoginVariant): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(POST_LOGIN_VARIANT_KEY, variant)
}
