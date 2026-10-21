// Unit tests for the scope fragment builders (plan P3: bun test, dev-only).
//
// These pin the CURRENT fragment shapes, including the LEGACY permissive
// variants whose markers name the stage-3 commit that flips them. When
// C3.1/C3.4 land, the corresponding assertions here flip in the same commit
// (subjectRows gains the professor key; attendanceRows gains ownership keys).

import { describe, expect, it } from 'bun:test'
import { createScopes } from './scopes'
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
      professor: 'Maria Reyes',
    })
  })

  it('teachingLoad includes term keys when a term is passed', () => {
    expect(createScopes(facultyCtx).teachingLoad(T)).toEqual({
      branch: 'commonwealth',
      professor: 'Maria Reyes',
      academicYear: '2026-2027',
      semester: '1st Sem',
    })
  })

  it('subjectRows carries branch + code + the professor-of-record key (FIX-C1)', () => {
    // FIX-C1 (C3.1): the professor key scopes the write filter to rows the
    // actor teaches; falsy fullName fails closed (empty name matches no
    // row) instead of reopening the branch-wide hole (issue #57).
    const frag = createScopes(facultyCtx).subjectRows('CS 101')
    expect(frag).toEqual({ branch: 'commonwealth', code: 'CS 101', professor: 'Maria Reyes' })
  })

  it('subjectRows adds term keys only for non-empty term values', () => {
    expect(createScopes(facultyCtx).subjectRows('CS 101', T)).toEqual({
      branch: 'commonwealth',
      code: 'CS 101',
      professor: 'Maria Reyes',
      academicYear: '2026-2027',
      semester: '1st Sem',
    })
    // Empty term values are omitted, never filtered (route conditional spread).
    expect(createScopes(facultyCtx).subjectRows('CS 101', { academicYear: '', semester: '1st Sem' })).toEqual({
      branch: 'commonwealth',
      code: 'CS 101',
      professor: 'Maria Reyes',
      semester: '1st Sem',
    })
  })

  it('attendanceRows carries branch + sectionKey, LEGACY(H2): no ownership keys', () => {
    // LEGACY(H2): client-supplied sectionKey, no ownership/roster keys.
    // C3.4 adds the teachesSection requirement (issue #60).
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
    expect(s.teachingLoad()).toEqual({ branch: 'novaliches', professor: 'Someone Else' })
    expect(s.ownStudentRows()).toEqual({ branch: 'novaliches', studentUsername: 'm.reyes' })
  })
})
