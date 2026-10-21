// Filter-fragment builders (Phase 2 design section 6.1).
//
// "What you may touch" and "what the query returns" read the same relation
// definitions: teachingLoad is teachesSubject's filter form, subjectRows is
// the grades/submit write scope, and so on. Routes compose these fragments
// into their Mongo filters instead of hand-building ownership keys, which
// is the structural fix for C1/H2/M1 (writes missing ownership keys).
//
// Pure functions over the actor doc: no Mongo access, unit-testable.
// LEGACY variants below carry the permissive pre-fix shapes; each marker
// names the stage-3 commit that flips it, per plan section 3.

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
   * Write scope for one subject's rows (grades/submit).
   * LEGACY(C1): no professor key — any same-branch faculty can currently
   * submit any subject's grades. C3.1 adds the professor-of-record key
   * (issue #57).
   */
  subjectRows(code: string, term?: TermKey): SubjectRowsScope
  /**
   * Write scope for attendance upserts.
   * LEGACY(H2): client-supplied sectionKey with no ownership or
   * roster-validated record keys — any same-branch faculty can currently
   * overwrite any section. C3.4 requires teachesSection and roster validation
   * (issue #60).
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
      ...termKeys(term),
    }),

    attendanceRows: (sectionKey) => ({
      branch: actor.branch,
      sectionKey,
    }),

    branchDocs: () => ({ branch: actor.branch }),
  }
}
