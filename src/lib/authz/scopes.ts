// Filter-fragment builders (Phase 2 design section 6.1).
//
// "What you may touch" and "what the query returns" read the same relation
// definitions: teachingLoad is teachesSubject's filter form, subjectRows is
// the grades/submit write scope, and so on. Routes compose these fragments
// into their Mongo filters instead of hand-building ownership keys, which
// is the structural fix for C1/H2/M1 (writes missing ownership keys).
//
// Pure functions over the actor doc: no Mongo access, unit-testable.
// The stage 3 fixes landed (C3.1 professor key on subjectRows, C3.4
// attendance ownership in the policy gate); the fragments below are
// the fixed shapes.
//
// A1 phase 1 (issue #72): the professor-of-record key became the
// professorOwnership() dual-write match — username stamp first, legacy
// display-name fallback second — so teaching ownership stops silently
// transferring or breaking on duplicate/renamed display names. The gate
// (relations.ts) and the scopes read the SAME fragment, keeping the
// FIX-C1 gate/scope parity by construction.

import type { Branch } from '@/lib/mongodb/types'
import type { AuthzContext } from './context'
import type { TermKey } from './types'

/**
 * One arm of the teaching-ownership match (A1, issue #72):
 * - username arm: the row is stamped and owned by that account;
 * - name arm: the row is unstamped (Mongo `{ field: null }` matches
 *   absent AND null) and still matched by display name — legacy rows.
 */
export type ProfessorMatchClause =
  | { professorUsername: string }
  | { professorUsername: null; professor: string }

/**
 * Spread-safe ownership filter: the $or is wrapped in a single-element
 * $and so a route composing `{ ...scope, $or: [...] }` (grades/submit's
 * status clauses do exactly that) can never clobber the ownership match
 * by overwriting a top-level `$or` key. Mongo reads `$and:[{$or:[...]}]`
 * identically to a bare `$or` — this is purely collision-proofing for
 * object spreads.
 */
export interface ProfessorOwnershipFilter {
  $and: [{ $or: ProfessorMatchClause[] }]
}

/**
 * Teaching-ownership match for one faculty identity (A1 phase 1, issue #72).
 *
 * Per-row precedence: a stamped row (professorUsername present and
 * non-empty) matches by username ONLY — its stale display name never
 * grants ownership; an unstamped row (field absent/null) falls back to
 * the display-name match, which is exactly the pre-migration behavior,
 * so a zero-stamp database behaves identically to today.
 *
 * `''` is never written and matches neither arm (dead value, fail-closed).
 * A falsy fullName keeps the name arm matching only rows whose professor
 * is literally '' (none exist in seeded data), so the FIX-C1 fail-closed
 * property is preserved for unstamped rows; stamped rows for the account
 * still match — the username is the real key.
 */
export function professorOwnership(username: string, fullName: string): ProfessorOwnershipFilter {
  return {
    $and: [
      {
        $or: [
          { professorUsername: username },
          { professorUsername: null, professor: fullName },
        ],
      },
    ],
  }
}

export interface OwnStudentRowsScope {
  branch: Branch
  studentUsername: string
}

export interface TeachingLoadScope {
  branch: Branch
  /** A1 dual-write teaching-ownership match (issue #72). */
  $and: ProfessorOwnershipFilter['$and']
  academicYear?: string
  semester?: string
}

export interface SubjectRowsScope {
  branch: Branch
  code: string
  /** A1 dual-write teaching-ownership match (issue #72). */
  $and: ProfessorOwnershipFilter['$and']
  academicYear?: string
  semester?: string
}

export interface AttendanceRowsScope {
  branch: Branch
  sectionKey: string
}

export interface AuthzScopes {
  /** The actor's own enrollment rows (student self-surface reads). */
  ownStudentRows(): OwnStudentRowsScope
  /** The actor's teaching load; term keys only when a term is passed (faculty roster vs term-scoped reads). */
  teachingLoad(term?: TermKey): TeachingLoadScope
  /**
   * Write scope for one subject's rows (grades/submit). FIX-C1 (C3.1)
   * + A1 phase 1 (issue #72): carries the dual-write professor-of-record
   * match — username stamp first, legacy name fallback second — so the
   * write filter touches only rows the actor teaches and the shape is
   * identical to the policy gate's relation query by construction.
   */
  subjectRows(code: string, term?: TermKey): SubjectRowsScope
  /**
   * Write scope for attendance upserts. FIX-H2 (C3.4): the sectionKey is
   * ownership-gated by the policy (teachesSection) and record keys are
   * roster-validated in the route; the fragment stays branch + sectionKey
   * because the gate owns the ownership decision (issue #60).
   */
  attendanceRows(sectionKey: string): AttendanceRowsScope
  /** Plain branch tenancy for branch-scoped collections. */
  branchDocs(): { branch: Branch }
}

export function createScopes(ctx: AuthzContext): AuthzScopes {
  const actor = ctx.actor

  // Term keys join the fragment only when non-empty, matching the routes'
  // conditional spreads (falsy term values are omitted, never filtered).
  const termKeys = (term?: TermKey) => ({
    ...(term?.academicYear ? { academicYear: term.academicYear } : {}),
    ...(term?.semester ? { semester: term.semester } : {}),
  })

  return {
    ownStudentRows: () => ({ branch: actor.branch, studentUsername: actor.username }),

    teachingLoad: (term) => ({
      branch: actor.branch,
      // A1 phase 1 (issue #72): dual-write ownership match replaces the
      // bare display-name key.
      ...professorOwnership(actor.username, actor.fullName),
      ...termKeys(term),
    }),

    subjectRows: (code, term) => ({
      branch: actor.branch,
      code,
      // FIX-C1 (C3.1) + A1 phase 1 (issue #72): the professor-of-record
      // match, unconditional on purpose — omitting it would reopen the C1
      // hole; the fragment fails closed for unstamped rows with a falsy
      // fullName and matches stamped rows by username only.
      ...professorOwnership(actor.username, actor.fullName),
      ...termKeys(term),
    }),

    attendanceRows: (sectionKey) => ({
      branch: actor.branch,
      sectionKey,
    }),

    branchDocs: () => ({ branch: actor.branch }),
  }
}
