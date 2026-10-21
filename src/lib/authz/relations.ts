// Server-only ABAC attribute resolvers (Phase 2 design section 4.3).
//
// These absorb every current derivation of "teaches", "is enrolled", "same
// branch" so each relationship is computed in exactly one place. The
// implementations replicate the live route semantics verbatim, including
// their quirks, because stage 2 swaps routes onto these relations while the
// goldens still expect the recorded current behavior.
//
// Two Mongo-matching subtleties preserved here:
// - teachesSubject/teachesSection fetch rows by {branch, professor, code}
//   and match the term IN JS with (field || '') comparisons, exactly like
//   requireTeachingFaculty and the notifications ownership map: a Mongo
//   {academicYear: ''} filter would NOT match docs missing the field.
// - isEnrolled uses the filter form with the term keys always present
//   (matching the materials student path), where '' matches only docs whose
//   field is explicitly ''.
//
// Lookups are memoized per Relations instance (one per guarded request), so
// a route that checks the same subject twice (guard, then scope build)
// costs one query, not two.
//
// MUST NOT be imported by proxy.ts or client components (mongodb driver).
// Runbook-tested via scripts/verify-authz.sh; no unit tests by plan P3.

import { getCollection } from '@/lib/mongodb/connection'
import type { GradePeriodStatus } from '@/lib/mongodb/types'
import type { AuthzContext } from './context'
import type { TermKey } from './types'

export interface GradeRowState {
  professor: string
  branch: string
  statuses: {
    prelim: GradePeriodStatus
    midterm: GradePeriodStatus
    finals: GradePeriodStatus
  }
}

export interface Relations {
  /** Faculty teaches the subject code in the term (defaults to the actor's current term). */
  teachesSubject(code: string, term?: TermKey): Promise<boolean>
  /** Faculty owns the section, keyed `code|academicYear|semester` (notifications ownership rule). */
  teachesSection(sectionKey: string): Promise<boolean>
  /** Student has an enrollment row for the code in the term (defaults to the actor's current term). */
  isEnrolled(studentUsername: string, code: string, term?: TermKey): Promise<boolean>
  /**
   * State of one grade row: professor of record, branch, per-period statuses.
   * branch is an optional row-branch filter (the grades/update per-row lookup
   * filters by the row's claimed branch); term keys apply only when non-empty,
   * matching the route's conditional spread.
   */
  gradeRowState(ref: {
    studentUsername: string
    subjectCode: string
    branch?: string
    term?: TermKey
  }): Promise<GradeRowState | null>
  /** The named user exists and sits in the actor's branch. */
  sameBranchUsername(username: string): Promise<boolean>
}

export function createRelations(ctx: AuthzContext): Relations {
  const actor = ctx.actor
  const memo = new Map<string, Promise<unknown>>()

  // Memoize the promise itself: concurrent callers share one query, and a
  // rejected lookup is dropped from the cache so a retry re-runs it.
  function once<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const hit = memo.get(key)
    if (hit) return hit as Promise<T>
    const p = fn()
    memo.set(key, p)
    p.catch(() => {
      memo.delete(key)
    })
    return p
  }

  const currentTerm = (): TermKey => ({
    academicYear: actor.academicYear,
    semester: actor.semester,
  })

  // Shared loader: enrollment rows for {branch, professor, code}, projected
  // to the term fields. Callers match terms in JS with (field || '') so
  // docs missing term fields match an empty term, as the routes do.
  async function loadProfessorRows(code: string): Promise<{ academicYear?: string; semester?: string }[]> {
    const col = await getCollection('subjects')
    return col
      .find({ branch: actor.branch, professor: actor.fullName, code })
      .project({ academicYear: 1, semester: 1 })
      .toArray()
  }

  return {
    async teachesSubject(code, term) {
      const t = term ?? currentTerm()
      return once(`ts:${code}|${t.academicYear}|${t.semester}`, async () => {
        const rows = await loadProfessorRows(code)
        return rows.some(
          (r) => (r.academicYear || '') === t.academicYear && (r.semester || '') === t.semester
        )
      })
    },

    async teachesSection(sectionKey) {
      // Strict `code|academicYear|semester` shape: the notifications
      // ownership map builds keys with exactly two pipes (empty terms are
      // legal, missing pipes are not), so anything else is unowned.
      const parts = sectionKey.split('|')
      if (parts.length !== 3) return false
      const [code, ay, sem] = parts
      return once(`sec:${sectionKey}`, async () => {
        const rows = await loadProfessorRows(code)
        return rows.some(
          (r) => (r.academicYear || '') === ay && (r.semester || '') === sem
        )
      })
    },

    async isEnrolled(studentUsername, code, term) {
      const t = term ?? currentTerm()
      return once(`en:${studentUsername}|${code}|${t.academicYear}|${t.semester}`, async () => {
        const col = await getCollection('subjects')
        const doc = await col.findOne({
          branch: actor.branch,
          studentUsername,
          code,
          academicYear: t.academicYear,
          semester: t.semester,
        })
        return !!doc
      })
    },

    async gradeRowState(ref) {
      const t = ref.term
      return once(
        `grs:${ref.studentUsername}|${ref.subjectCode}|${ref.branch ?? ''}|${t?.academicYear ?? ''}|${t?.semester ?? ''}`,
        async () => {
          const col = await getCollection('subjects')
          const filter: Record<string, string> = {
            studentUsername: ref.studentUsername,
            code: ref.subjectCode,
          }
          if (ref.branch) filter.branch = ref.branch
          if (t?.academicYear) filter.academicYear = t.academicYear
          if (t?.semester) filter.semester = t.semester
          const doc = await col.findOne(filter, {
            projection: {
              professor: 1,
              branch: 1,
              prelimStatus: 1,
              midtermStatus: 1,
              finalsStatus: 1,
            },
          })
          if (!doc) return null
          return {
            professor: typeof doc.professor === 'string' ? doc.professor : '',
            branch: typeof doc.branch === 'string' ? doc.branch : '',
            statuses: {
              prelim: (doc.prelimStatus ?? '') as GradePeriodStatus,
              midterm: (doc.midtermStatus ?? '') as GradePeriodStatus,
              finals: (doc.finalsStatus ?? '') as GradePeriodStatus,
            },
          }
        }
      )
    },

    async sameBranchUsername(username) {
      return once(`sb:${username}`, async () => {
        const col = await getCollection('students')
        const doc = await col.findOne({ username }, { projection: { branch: 1 } })
        return !!doc && doc.branch === actor.branch
      })
    },
  }
}
