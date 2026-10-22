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

import type { Branch } from '@/lib/mongodb/types'
import type { AuthzContext } from './context'
import type { TermKey } from './types'

export interface OwnStudentRowsScope {
  branch: Branch
  studentUsername: string
}

export interface TeachingLoadScope {
  branch: Branch
  professor: string
  academicYear?: string
  semester?: string
}

export interface SubjectRowsScope {
  branch: Branch
  code: string
  professor: string
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
   * Write scope for one subject's rows (grades/submit). FIX-C1 (C3.1):
   * carries the professor-of-record key (issue #57) — the write filter
   * touches only rows the actor teaches, fail-closed on a falsy fullName
   * (an empty name matches no row).
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
      professor: actor.fullName,
      ...termKeys(term),
    }),

    subjectRows: (code, term) => ({
      branch: actor.branch,
      code,
      // FIX-C1 (C3.1): unconditional professor-of-record key. Unconditional
      // on purpose: omitting it on a falsy fullName would reopen the C1
      // hole; an empty name matches no subject row, so the scope fails
      // closed (issue #57).
      professor: actor.fullName,
      ...termKeys(term),
    }),

    attendanceRows: (sectionKey) => ({
      branch: actor.branch,
      sectionKey,
    }),

    branchDocs: () => ({ branch: actor.branch }),
  }
}
