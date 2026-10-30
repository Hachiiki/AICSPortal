// Onboarding state registry (onboarding plan, Phase 1).
//
// Pure, client-safe module: the only import is a type from
// @/lib/mongodb/types (erased at compile time), so a future client
// surface can render the checklist from the same source the server
// validates against — the permissions.ts pattern, no server graph.
//
// RECOVERY NOTE (2026-10-30, approved same day): the original planning
// document was lost with the environment reset. The recovered scope
// pinned the mechanism (registry, five state dimensions per role,
// version carry-forward) but not the dimension identities. The keys
// and labels below are grounded in the portal's actual first-run
// surfaces and were the review checkpoint for this phase; the owner
// reviewed them exactly as implemented and approved all five per role
// as the baseline (onboarding plan, section 2.6). They are data in
// this one file, but renaming or restructuring them now needs
// separate owner approval; the version-bump rule above governs any
// future change.
//
// Versioning + carry-forward: each role spec carries its own version,
// independent of the other roles. The stored doc keeps the version it
// was last written under; reads normalize it through carryForward():
// done steps that still exist in the current spec stay done, dimensions
// added by a version bump start false, retired dimensions drop out.
// Bump a role's version exactly when its dimension set changes.

import type { Role } from '@/lib/mongodb/types'

export interface OnboardingDimension {
  /** Stable key: stored in onboarding_states.values, used by PATCH. */
  key: string
  /** Display label for the future checklist surface. */
  label: string
}

export interface OnboardingRoleSpec {
  /** Registry version for this role; bump when its dimension set changes. */
  version: number
  dimensions: readonly OnboardingDimension[]
}

/** Step completion map keyed by dimension key. */
export type OnboardingValues = Record<string, boolean>

export const ONBOARDING_REGISTRY: Readonly<Record<Role, OnboardingRoleSpec>> = {
  student: {
    version: 1,
    dimensions: [
      { key: 'password', label: 'Change your demo password' },
      { key: 'profile', label: 'Review your profile' },
      { key: 'photo', label: 'Add a profile photo' },
      { key: 'tour', label: 'Finish the sign-in tour' },
      { key: 'announcements', label: 'Check the announcements board' },
    ],
  },
  faculty: {
    version: 1,
    dimensions: [
      { key: 'password', label: 'Change your demo password' },
      { key: 'profile', label: 'Review your profile' },
      { key: 'roster', label: 'Open My Students' },
      { key: 'gradebook', label: 'Open grade encoding' },
      { key: 'announcements', label: 'Check the announcements board' },
    ],
  },
  admin: {
    version: 1,
    dimensions: [
      { key: 'password', label: 'Change your demo password' },
      { key: 'directory', label: 'Open the people directory' },
      { key: 'stats', label: 'Review the dashboard stats' },
      { key: 'release', label: 'Check the grade release queue' },
      { key: 'announcements', label: 'Check the announcements board' },
    ],
  },
}

/**
 * Raw-role-safe lookup: the actor role comes straight off the DB doc
 * and can carry corrupt strings (the issue #67 rogue.role class),
 * which must keep failing every check — they resolve to no spec here,
 * and the onboarding.state policy denies them before the route ever
 * looks one up.
 */
export function registryFor(role: string): OnboardingRoleSpec | undefined {
  return (ONBOARDING_REGISTRY as Record<string, OnboardingRoleSpec | undefined>)[role]
}

/** Fresh state for a spec: every dimension false. */
export function emptyValues(spec: OnboardingRoleSpec): OnboardingValues {
  return Object.fromEntries(spec.dimensions.map((d) => [d.key, false]))
}

/** The stored slice carryForward() reads (tolerant: malformed fields read as empty). */
export interface StoredOnboardingState {
  version?: number
  values?: Record<string, boolean>
}

export interface OnboardingState {
  version: number
  values: OnboardingValues
}

/**
 * Version carry-forward: normalize a stored doc (or nothing) onto a spec.
 * - values for dimensions that still exist in the spec carry forward, so
 *   done steps stay done across version bumps
 * - dimensions the current spec added start false
 * - dimensions the current spec retired drop out
 * - a doc written under a newer version (registry rollback) normalizes
 *   the same way: the current registry is always the authority
 * The stored version itself is not trusted for the merge; only the
 * surviving-key rule decides what carries.
 */
export function carryForward(
  spec: OnboardingRoleSpec,
  stored: StoredOnboardingState | null | undefined
): OnboardingState {
  const values = emptyValues(spec)
  if (stored && typeof stored.values === 'object' && stored.values !== null) {
    for (const dim of spec.dimensions) {
      if (stored.values[dim.key] === true) values[dim.key] = true
    }
  }
  return { version: spec.version, values }
}

/**
 * Apply PATCH updates over a carried-forward state. Registry keys only:
 * unknown keys are dropped here (the route 400s them first), so the
 * persisted map can never grow keys outside the spec. Returns a new
 * map; the input is not mutated.
 */
export function applyUpdates(
  spec: OnboardingRoleSpec,
  base: OnboardingValues,
  updates: Record<string, boolean>
): OnboardingValues {
  const values: OnboardingValues = { ...base }
  for (const dim of spec.dimensions) {
    if (dim.key in updates) values[dim.key] = updates[dim.key] === true
  }
  return values
}
