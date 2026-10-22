// Unit tests for the scope fragment builders (plan P3: bun test, dev-only).
//
// These pin the current fragment shapes. The stage 3 fixes landed:
// subjectRows carries the professor key (C3.1) and attendance
// ownership lives in the policy gate (C3.4). A1 phase 1 (issue #72)
// turned the bare professor key into the dual-write ownership match:
// username stamp first, legacy display-name fallback second.

import { describe, expect, it } from 'bun:test'
import { createScopes, professorOwnership } from './scopes'
import type { AuthzContext } from './context'
import type { SessionClaims } from '@/lib/session'

const claims: SessionClaims = {
  username: 'm.reyes',
  role: 'faculty',
  branch: 'commonwealth',
  tv: 0,
}

const facultyCtx: AuthzContext = {
  actor: {
    username: 'm.reyes',
    role: 'faculty',
    branch: 'commonwealth',
    fullName: 'Maria Reyes',
    academicYear: '2026-2027',
    semester: '1st Sem',
    yearLevel: '',
    section: '',
  },
  claims,
}

const T = { academicYear: '2026-2027', semester: '1st Sem' }

describe('authz scopes', () => {
  it('ownStudentRows carries branch + session username only', () => {
    expect(createScopes(facultyCtx).ownStudentRows()).toEqual({
      branch: 'commonwealth',
      studentUsername: 'm.reyes',
    })
  })

  it('teachingLoad omits term keys when no term is passed', () => {
    expect(createScopes(facultyCtx).teachingLoad()).toEqual({
      branch: 'commonwealth',
      $and: [{ $or: [{ professorUsername: 'm.reyes' }, { professorUsername: null, professor: 'Maria Reyes' }] }],
    })
  })

  it('teachingLoad includes term keys when a term is passed', () => {
    expect(createScopes(facultyCtx).teachingLoad(T)).toEqual({
      branch: 'commonwealth',
      $and: [{ $or: [{ professorUsername: 'm.reyes' }, { professorUsername: null, professor: 'Maria Reyes' }] }],
      academicYear: '2026-2027',
      semester: '1st Sem',
    })
  })

  it('subjectRows carries branch + code + the dual-write ownership match (FIX-C1 + A1)', () => {
    // FIX-C1 (C3.1): the professor-of-record key scopes the write filter
    // to rows the actor teaches. A1 phase 1 (issue #72): the key is the
    // dual-write match — username arm first, name fallback second — so a
    // stamped row matches by username only and unstamped rows keep the
    // pre-migration behavior.
    const frag = createScopes(facultyCtx).subjectRows('CS 101')
    expect(frag).toEqual({
      branch: 'commonwealth',
      code: 'CS 101',
      $and: [{ $or: [{ professorUsername: 'm.reyes' }, { professorUsername: null, professor: 'Maria Reyes' }] }],
    })
  })

  it('subjectRows adds term keys only for non-empty term values', () => {
    const ownership = { $and: [{ $or: [{ professorUsername: 'm.reyes' }, { professorUsername: null, professor: 'Maria Reyes' }] }] }
    expect(createScopes(facultyCtx).subjectRows('CS 101', T)).toEqual({
      branch: 'commonwealth',
      code: 'CS 101',
      ...ownership,
      academicYear: '2026-2027',
      semester: '1st Sem',
    })
    // Empty term values are omitted, never filtered (route conditional spread).
    expect(createScopes(facultyCtx).subjectRows('CS 101', { academicYear: '', semester: '1st Sem' })).toEqual({
      branch: 'commonwealth',
      code: 'CS 101',
      ...ownership,
      semester: '1st Sem',
    })
  })

  it('attendanceRows carries branch + sectionKey (ownership gated by the policy)', () => {
    // FIX-H2 (C3.4): the fragment shape is unchanged — ownership lives in
    // the policy's teachesSection gate and roster validation lives in the
    // route (issue #60).
    const frag = createScopes(facultyCtx).attendanceRows('CS 101|2026-2027|1st Sem')
    expect(frag).toEqual({ branch: 'commonwealth', sectionKey: 'CS 101|2026-2027|1st Sem' })
    expect(Object.keys(frag).sort()).toEqual(['branch', 'sectionKey'])
  })

  it('branchDocs is the plain branch tenancy fragment', () => {
    expect(createScopes(facultyCtx).branchDocs()).toEqual({ branch: 'commonwealth' })
  })

  it('fragments derive from the actor doc, never the JWT claims', () => {
    // Stale claims (role/branch drifted from the DB doc) must not leak into
    // scopes: the M2 class dies because every fragment reads actor fields.
    const staleCtx: AuthzContext = {
      actor: { ...facultyCtx.actor, branch: 'novaliches', fullName: 'Someone Else' },
      claims, // still says commonwealth / faculty
    }
    const s = createScopes(staleCtx)
    expect(s.branchDocs()).toEqual({ branch: 'novaliches' })
    expect(s.teachingLoad()).toEqual({
      branch: 'novaliches',
      $and: [{ $or: [{ professorUsername: 'm.reyes' }, { professorUsername: null, professor: 'Someone Else' }] }],
    })
    expect(s.ownStudentRows()).toEqual({ branch: 'novaliches', studentUsername: 'm.reyes' })
  })

  it('A1: falsy fullName keeps the name arm fail-closed while the username arm still matches stamped rows', () => {
    // FIX-C1's fail-closed property survives the A1 swap for unstamped
    // rows: the name arm can only match a row whose professor is literally
    // '' (none exist). The username arm is untouched — stamped rows for
    // this account still match, because the username is the real key
    // (issue #72).
    const frag = createScopes({ ...facultyCtx, actor: { ...facultyCtx.actor, fullName: '' } }).subjectRows('CS 101')
    expect(frag.$and[0].$or[0]).toEqual({ professorUsername: 'm.reyes' })
    expect(frag.$and[0].$or[1]).toEqual({ professorUsername: null, professor: '' })
  })

  it('A1: professorOwnership precedence — username arm first, name arm only on unstamped rows', () => {
    // The shape IS the precedence: a stamped row (professorUsername
    // present) can only match the first arm — the second arm requires
    // professorUsername to be null/absent, so a stale display name never
    // grants ownership of a stamped row (issue #72, requirement 5).
    const f = professorOwnership('l.bautista', 'Engr. Maria Cristina Reyes')
    expect(f.$and).toHaveLength(1)
    expect(f.$and[0].$or).toEqual([
      { professorUsername: 'l.bautista' },
      { professorUsername: null, professor: 'Engr. Maria Cristina Reyes' },
    ])
    // Mongo `{ field: null }` matches absent AND null — the fallback arm
    // is pinned to unstamped rows only.
    expect(f.$and[0].$or[1].professorUsername).toBeNull()
  })

  it('A1: the ownership match survives a route spreading its own top-level $or (collision-proof)', () => {
    // grades/submit composes `{ ...subjectRows(...), $or: [status...] }`.
    // With a bare top-level $or the spread would clobber the ownership
    // key and silently reopen C1; the $and wrap makes the fragment immune
    // (issue #72).
    const scope = createScopes(facultyCtx).subjectRows('CS 101')
    const composed = { ...scope, $or: [{ prelimStatus: 'draft' }] }
    expect(composed.$or).toEqual([{ prelimStatus: 'draft' }])
    expect(composed.$and).toEqual(scope.$and)
    expect(Object.keys(composed).sort()).toEqual(['$and', '$or', 'branch', 'code'])
  })
})
