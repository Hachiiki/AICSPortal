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
// A1 phase 1 (issue #72) shipped the professor-of-record key as a
// dual-write match — username stamp first, legacy display-name fallback
// second. Phase 3 (issue #72, owner-authorized) REMOVES the name arm:
// the runtime reads the stamp only, so teaching ownership is exactly
// "the row's professorUsername equals the authenticated account's
// username". Unstamped rows (field absent or null) and malformed stamps
// ('' or any non-matching value) match NO account — fail-closed. The
// gate (relations.ts) and the scopes read the SAME fragment, keeping
// the FIX-C1 gate/scope parity by construction.

import type { Branch } from '@/lib/mongodb/types'
import type { AuthzContext } from './context'
import type { TermKey } from './types'

/**
 * Teaching-ownership filter (A1 phase 3, issue #72): strict username
 * equality. The display name is never read for ownership — a stale,
 * duplicated, or renamed fullName can neither grant nor revoke access.
 * Rows without a stamp (absent/null) or with a malformed stamp match
 * nothing and stay unassigned until an owner reassigns them.
 */
export interface ProfessorOwnershipFilter {
  professorUsername: string
}

/**
 * Teaching-ownership match for one faculty account (A1 phase 3, issue #72).
 *
 * Flat single-key shape: a route composing `{ ...scope, $or: [...] }`
 * (grades/submit's status clauses) cannot clobber a plain equality key
 * the way it could clobber a top-level `$or`, so the phase-1 `$and` wrap
 * is no longer needed; the ownership key survives every object spread.
 */
export function professorOwnership(username: string): ProfessorOwnershipFilter {
  return { professorUsername: username }
}

export interface OwnStudentRowsScope {
  branch: Branch
  studentUsername: string
}

export interface TeachingLoadScope {
  branch: Branch
  /** A1 strict teaching-ownership key (issue #72 phase 3). */
  professorUsername: string
  academicYear?: string
  semester?: string
}

export interface SubjectRowsScope {
  branch: Branch
  code: string
  /** A1 strict teaching-ownership key (issue #72 phase 3). */
  professorUsername: string
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
   * + A1 phase 3 (issue #72): carries the strict professor-of-record
   * key — username equality only — so the write filter touches only
   * rows the actor teaches and the shape is identical to the policy
   * gate's relation query by construction.
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
      // A1 phase 3 (issue #72): strict username key replaces the
      // phase-1 dual-write match.
      ...professorOwnership(actor.username),
      ...termKeys(term),
    }),

    subjectRows: (code, term) => ({
      branch: actor.branch,
      code,
      // FIX-C1 (C3.1) + A1 phase 3 (issue #72): the professor-of-record
      // key, unconditional on purpose — omitting it would reopen the C1
      // hole; the fragment fails closed for unstamped rows (no account
      // matches) and matches stamped rows by username only.
      ...professorOwnership(actor.username),
      ...termKeys(term),
    }),

    attendanceRows: (sectionKey) => ({
      branch: actor.branch,
      sectionKey,
    }),

    branchDocs: () => ({ branch: actor.branch }),
  }
}
