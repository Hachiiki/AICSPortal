// Unit tests for the scope fragment builders (plan P3: bun test, dev-only).
//
// These pin the current fragment shapes. The stage 3 fixes landed:
// subjectRows carries the professor key (C3.1) and attendance
// ownership lives in the policy gate (C3.4). A1 phase 3 (issue #72)
// turned the dual-write match into the strict ownership key: username
// equality only — the display name is never read for ownership.

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
      professorUsername: 'm.reyes',
    })
  })

  it('teachingLoad includes term keys when a term is passed', () => {
    expect(createScopes(facultyCtx).teachingLoad(T)).toEqual({
      branch: 'commonwealth',
      professorUsername: 'm.reyes',
      academicYear: '2026-2027',
      semester: '1st Sem',
    })
  })

  it('subjectRows carries branch + code + the strict ownership key (FIX-C1 + A1 phase 3)', () => {
    // FIX-C1 (C3.1): the professor-of-record key scopes the write filter
    // to rows the actor teaches. A1 phase 3 (issue #72): the key is
    // strict username equality — stamped rows match their owner only,
    // unstamped and malformed rows match no account.
    const frag = createScopes(facultyCtx).subjectRows('CS 101')
    expect(frag).toEqual({
      branch: 'commonwealth',
      code: 'CS 101',
      professorUsername: 'm.reyes',
    })
  })

  it('subjectRows adds term keys only for non-empty term values', () => {
    expect(createScopes(facultyCtx).subjectRows('CS 101', T)).toEqual({
      branch: 'commonwealth',
      code: 'CS 101',
      professorUsername: 'm.reyes',
      academicYear: '2026-2027',
      semester: '1st Sem',
    })
    // Empty term values are omitted, never filtered (route conditional spread).
    expect(createScopes(facultyCtx).subjectRows('CS 101', { academicYear: '', semester: '1st Sem' })).toEqual({
      branch: 'commonwealth',
      code: 'CS 101',
      professorUsername: 'm.reyes',
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
      professorUsername: 'm.reyes',
    })
    expect(s.ownStudentRows()).toEqual({ branch: 'novaliches', studentUsername: 'm.reyes' })
  })

  it('A1 phase 3: the fragment is a flat username equality — the display name is absent', () => {
    // Strict ownership: no clause reads `professor`, so a renamed,
    // duplicated, or falsy fullName can neither grant nor revoke access,
    // and unstamped rows (professorUsername absent/null) match nothing
    // (Mongo equality on a missing field is a non-match, fail-closed).
    const frag = professorOwnership('l.bautista')
    expect(frag).toEqual({ professorUsername: 'l.bautista' })
    expect(Object.keys(frag)).toEqual(['professorUsername'])
  })

  it('A1 phase 3: the ownership key survives a route spreading its own top-level $or', () => {
    // grades/submit composes `{ ...subjectRows(...), $or: [status...] }`.
    // The flat key cannot be clobbered by the spread (only an explicit
    // `professorUsername:` write could, and no route does); the C1 hole
    // stays closed (issue #72).
    const scope = createScopes(facultyCtx).subjectRows('CS 101')
    const composed = { ...scope, $or: [{ prelimStatus: 'draft' }] }
    expect(composed.$or).toEqual([{ prelimStatus: 'draft' }])
    expect(composed.professorUsername).toBe('m.reyes')
    expect(Object.keys(composed).sort()).toEqual(['$or', 'branch', 'code', 'professorUsername'])
  })

  it('A1 phase 3: a falsy fullName no longer affects the fragment at all', () => {
    // Phase 1 kept a fail-closed name arm for falsy names; phase 3 reads
    // no name, so the fragment is identical with or without one — the
    // username is the only key (issue #72).
    const withName = createScopes(facultyCtx).subjectRows('CS 101')
    const noName = createScopes({ ...facultyCtx, actor: { ...facultyCtx.actor, fullName: '' } }).subjectRows('CS 101')
    expect(withName).toEqual(noName)
    expect(noName.professorUsername).toBe('m.reyes')
  })
})
