// Unit tests for the policy decision table (plan P3: bun test, dev-only).
//
// Coverage goal: every kind x action pair the swap-scope routes will call,
// including the LEGACY branches (marked tests flip with their C3.x commit).
// Relations are fakes; no database, no environment.
//
// Cast mirrors the golden seed: facultyX m.reyes teaches CS 101 (current
// term); facultyY l.bautista teaches CS 103; juan.santos is a commonwealth
// student; pedro.vasquez is novaliches.

import { describe, expect, it } from 'bun:test'
import { can } from './policies'
import type { AuthzContext } from './context'
import type { Relations } from './relations'
import type { Action, AuthzResource, DenyCode, DenyStatus } from './types'

// ---- fakes ---------------------------------------------------------------

const T = { academicYear: '2026-2027', semester: '1st Sem' }

function ctxFor(partial: Partial<AuthzContext['actor']>, claimsBranch = 'commonwealth'): AuthzContext {
  return {
    actor: {
      username: 'm.reyes',
      role: 'faculty',
      branch: 'commonwealth',
      fullName: 'Maria Reyes',
      academicYear: T.academicYear,
      semester: T.semester,
      yearLevel: '',
      section: '',
      ...partial,
    },
    claims: { username: partial.username ?? 'm.reyes', role: 'faculty', branch: claimsBranch, tv: 0 },
  }
}

const facultyX = ctxFor({})
const facultyY = ctxFor({ username: 'l.bautista', fullName: 'Engr. Lorenzo Bautista' })
const studentA = ctxFor({ username: 'juan.santos', role: 'student', fullName: 'Juan Dela Cruz Santos' })
const admin = ctxFor({ username: 'admin1', role: 'admin', fullName: 'AICS Admin' })

function fakeRel(overrides: Partial<Relations> = {}): Relations {
  return {
    // facultyX teaches CS 101 this term; facultyY teaches CS 103.
    teachesSubject: async (code: string) =>
      code === 'CS 101' || code === 'CS 103' ? false : false,
    teachesSection: async (key: string) => key === 'CS 101|2026-2027|1st Sem',
    isEnrolled: async (u: string, code: string) => u === 'juan.santos' && code === 'CS 101',
    gradeRowState: async () => null,
    sameBranchUsername: async (u: string) => u === 'juan.santos',
    ...overrides,
  }
}

// rel whose actor teaches exactly the listed codes (per-test, per-actor).
const relThat = (teaches: string[] = []): Relations =>
  fakeRel({
    teachesSubject: async (code: string) => teaches.includes(code),
  })

function decision(resource: AuthzResource, action: Action, ctx: AuthzContext, rel: Relations) {
  return can(ctx, rel, resource, action)
}

async function expectAllow(resource: AuthzResource, action: Action, ctx: AuthzContext, rel: Relations) {
  const d = await decision(resource, action, ctx, rel)
  expect(d.ok).toBe(true)
}

async function expectDeny(
  resource: AuthzResource,
  action: Action,
  ctx: AuthzContext,
  rel: Relations,
  code: DenyCode,
  status: DenyStatus
) {
  const d = await decision(resource, action, ctx, rel)
  expect(d.ok).toBe(false)
  if (!d.ok) {
    expect(d.code).toBe(code)
    expect(d.status).toBe(status)
  }
}

// rel where the caller's actor owns the subject under test
const ownRel = (owner: string): Relations =>
  fakeRel({
    teachesSubject: async () => owner === 'owner',
    gradeRowState: async (ref: { subjectCode: string }) =>
      ref.subjectCode === 'CS 103'
        ? { professor: 'Engr. Lorenzo Bautista', branch: 'commonwealth', statuses: { prelim: 'draft', midterm: 'submitted', finals: 'released' } }
        : ref.subjectCode === 'CS 101'
          ? { professor: 'Maria Reyes', branch: 'commonwealth', statuses: { prelim: 'draft', midterm: 'draft', finals: 'draft' } }
          : null,
  })

// ---- tests ----------------------------------------------------------------

describe('student surface policies', () => {
  it('profile read: self, staff same-branch, deny otherwise', async () => {
    const rel = fakeRel()
    await expectAllow({ kind: 'student.profile', username: 'juan.santos' }, 'read', studentA, rel)
    await expectAllow({ kind: 'student.profile', username: 'juan.santos' }, 'read', facultyX, rel)
    await expectDeny({ kind: 'student.profile', username: 'pedro.vasquez' }, 'read', facultyX, rel, 'notOwner', 403)
    // FIX-L1 (C3.8): absent usernames deny identically to cross-branch
    // ones — the oracle is masked at the policy layer.
    await expectDeny({ kind: 'student.profile', username: 'ghost.user' }, 'read', facultyX, rel, 'notOwner', 403)
    await expectDeny({ kind: 'student.profile', username: 'juan.santos' }, 'read', ctxFor({ username: 'studentB', role: 'student' }), rel, 'notOwner', 403)
  })

  it('profile update: self or admin; students denied on others', async () => {
    const rel = fakeRel()
    await expectAllow({ kind: 'student.profile', username: 'juan.santos' }, 'update', studentA, rel)
    await expectAllow({ kind: 'student.profile', username: 'juan.santos' }, 'update', admin, rel)
    await expectDeny({ kind: 'student.profile', username: 'juan.santos' }, 'update', ctxFor({ username: 'studentB', role: 'student' }), rel, 'notOwner', 403)
  })

  it('export and finances are self-only', async () => {
    const rel = fakeRel()
    await expectAllow({ kind: 'student.export', username: 'juan.santos' }, 'read', studentA, rel)
    await expectDeny({ kind: 'student.export', username: 'juan.santos' }, 'read', facultyX, rel, 'notOwner', 403)
    await expectAllow({ kind: 'student.finances', username: 'juan.santos' }, 'read', studentA, rel)
    await expectDeny({ kind: 'student.finances', username: 'juan.santos' }, 'read', admin, rel, 'notOwner', 403)
  })

  it('unsupported actions deny role', async () => {
    await expectDeny({ kind: 'student.profile', username: 'juan.santos' }, 'delete', studentA, fakeRel(), 'role', 403)
  })
})

describe('grade policies', () => {
  it('FIX-C1: submit requires the subject in the teaching load (C3.1)', async () => {
    // facultyY (teaches CS 103) submits own subject: allowed.
    const relY = fakeRel({ teachesSubject: async (code: string) => code === 'CS 103' })
    await expectAllow(
      { kind: 'grade.submit', subjectCode: 'CS 103', term: T, branch: 'commonwealth' },
      'submit',
      facultyY,
      relY
    )
    // facultyX (teaches CS 101 only) cross-faculty submit: denied — the
    // C1 flip (this was allowed before C3.1, the finding's core row).
    const relX = fakeRel({ teachesSubject: async (code: string) => code === 'CS 101' })
    await expectDeny(
      { kind: 'grade.submit', subjectCode: 'CS 103', term: T, branch: 'commonwealth' },
      'submit',
      facultyX,
      relX,
      'notAssigned',
      403
    )
    await expectDeny({ kind: 'grade.submit', subjectCode: 'CS 103', term: T, branch: 'commonwealth' }, 'submit', studentA, relY, 'role', 403)
    await expectDeny({ kind: 'grade.submit', subjectCode: 'CS 103', term: T, branch: 'novaliches' }, 'submit', facultyX, relX, 'branch', 403)
  })

  it('grade.period update: own draft row allowed', async () => {
    const rel = ownRel('owner')
    await expectAllow(
      { kind: 'grade.period', studentUsername: 'a.castillo', subjectCode: 'CS 103', term: T, period: 'prelim', branch: 'commonwealth' },
      'update',
      facultyY,
      rel
    )
  })

  it('FIX-H1a: submitted and released periods are state-locked (C3.3)', async () => {
    // ownRel's CS 103 row: prelim draft, midterm submitted, finals released.
    const rel = ownRel('owner')
    await expectDeny(
      { kind: 'grade.period', studentUsername: 'a.castillo', subjectCode: 'CS 103', term: T, period: 'midterm', branch: 'commonwealth' },
      'update',
      facultyY,
      rel,
      'state',
      403
    )
    await expectDeny(
      { kind: 'grade.period', studentUsername: 'a.castillo', subjectCode: 'CS 103', term: T, period: 'finals', branch: 'commonwealth' },
      'update',
      facultyY,
      rel,
      'state',
      403
    )
  })

  it('FIX-H1a: withdraw pulls a submitted period back to draft (C3.3)', async () => {
    const rel = ownRel('owner')
    await expectAllow(
      { kind: 'grade.period', studentUsername: 'a.castillo', subjectCode: 'CS 103', term: T, period: 'midterm', branch: 'commonwealth' },
      'withdraw',
      facultyY,
      rel
    )
    // draft and released periods are not withdrawable
    await expectDeny(
      { kind: 'grade.period', studentUsername: 'a.castillo', subjectCode: 'CS 103', term: T, period: 'prelim', branch: 'commonwealth' },
      'withdraw',
      facultyY,
      rel,
      'state',
      403
    )
    await expectDeny(
      { kind: 'grade.period', studentUsername: 'a.castillo', subjectCode: 'CS 103', term: T, period: 'finals', branch: 'commonwealth' },
      'withdraw',
      facultyY,
      rel,
      'state',
      403
    )
    // the role, branch, and professor-of-record gates apply to withdrawal too
    await expectDeny(
      { kind: 'grade.period', studentUsername: 'a.castillo', subjectCode: 'CS 103', term: T, period: 'midterm', branch: 'commonwealth' },
      'withdraw',
      facultyX,
      rel,
      'notAssigned',
      403
    )
    await expectDeny(
      { kind: 'grade.period', studentUsername: 'a.castillo', subjectCode: 'CS 103', term: T, period: 'midterm', branch: 'commonwealth' },
      'withdraw',
      studentA,
      rel,
      'role',
      403
    )
  })

  it('FIX-H1a: unrelease is admin-only with branch parity (C3.3)', async () => {
    const rel = fakeRel()
    await expectAllow({ kind: 'grade.releaseQueue', branch: 'commonwealth' }, 'unrelease', admin, rel)
    await expectDeny({ kind: 'grade.releaseQueue', branch: 'commonwealth' }, 'unrelease', facultyY, rel, 'role', 403)
    await expectDeny({ kind: 'grade.releaseQueue', branch: 'novaliches' }, 'unrelease', admin, rel, 'branch', 403)
  })

  it('grade.period update: row-level denials', async () => {
    const rel = ownRel('owner')
    await expectDeny(
      { kind: 'grade.period', studentUsername: 'a.castillo', subjectCode: 'CS 103', term: T, period: 'prelim', branch: 'commonwealth' },
      'update',
      studentA,
      rel,
      'role',
      403
    )
    // claimed row branch mismatch
    await expectDeny(
      { kind: 'grade.period', studentUsername: 'a.castillo', subjectCode: 'CS 103', term: T, period: 'prelim', branch: 'novaliches' },
      'update',
      facultyY,
      rel,
      'branch',
      403
    )
    // row absent -> 'Not found' reason
    await expectDeny(
      { kind: 'grade.period', studentUsername: 'ghost.user', subjectCode: 'CS 999', term: T, period: 'prelim', branch: 'commonwealth' },
      'update',
      facultyY,
      rel,
      'notFound',
      404
    )
    // professor of record mismatch with a truthy fullName
    await expectDeny(
      { kind: 'grade.period', studentUsername: 'a.castillo', subjectCode: 'CS 101', term: T, period: 'prelim', branch: 'commonwealth' },
      'update',
      facultyY,
      rel,
      'notAssigned',
      403
    )
  })

  it('FIX-H1b: falsy fullName fails closed on the professor check (C3.2)', async () => {
    const noName = ctxFor({ username: 'l.bautista', fullName: '' })
    await expectDeny(
      { kind: 'grade.period', studentUsername: 'a.castillo', subjectCode: 'CS 101', term: T, period: 'prelim', branch: 'commonwealth' },
      'update',
      noName,
      ownRel('owner'),
      'notAssigned',
      403
    )
  })

  it('release queue: admin only; branch parity on release', async () => {
    const rel = fakeRel()
    await expectAllow({ kind: 'grade.releaseQueue' }, 'read', admin, rel)
    await expectAllow({ kind: 'grade.releaseQueue', branch: 'commonwealth' }, 'release', admin, rel)
    await expectDeny({ kind: 'grade.releaseQueue' }, 'read', facultyX, rel, 'role', 403)
    await expectDeny({ kind: 'grade.releaseQueue' }, 'release', facultyY, rel, 'role', 403)
    await expectDeny({ kind: 'grade.releaseQueue', branch: 'novaliches' }, 'release', admin, rel, 'branch', 403)
  })

  it('FIX-M1: audits read keeps the faculty/admin roles; scoping is route-side (C3.5)', async () => {
    // The policy's role gates are unchanged — the C3.5 scoping (faculty
    // read their own professor-of-record subjects, admin keeps the
    // branch) shapes the query in the route and is pinned by the
    // GRD-AUDITS golden rows.
    const rel = fakeRel()
    await expectAllow({ kind: 'grade.audits' }, 'read', facultyX, rel)
    await expectAllow({ kind: 'grade.audits', subjectCode: 'CS 103' }, 'read', admin, rel)
    await expectDeny({ kind: 'grade.audits' }, 'read', studentA, rel, 'role', 403)
  })
})

describe('task policies', () => {
  it('task.list: self or staff', async () => {
    const rel = fakeRel()
    await expectAllow({ kind: 'task.list', studentUsername: 'juan.santos' }, 'read', studentA, rel)
    await expectAllow({ kind: 'task.list', studentUsername: 'juan.santos' }, 'read', facultyX, rel)
    await expectDeny({ kind: 'task.list', studentUsername: 'juan.santos' }, 'read', ctxFor({ username: 'studentB', role: 'student' }), rel, 'notOwner', 403)
  })

  it('task.board, faculty.roster, faculty.history: staff only', async () => {
    const rel = fakeRel()
    await expectAllow({ kind: 'task.board' }, 'read', facultyX, rel)
    await expectDeny({ kind: 'task.board' }, 'read', studentA, rel, 'role', 403)
    await expectAllow({ kind: 'faculty.roster' }, 'read', admin, rel)
    await expectDeny({ kind: 'faculty.roster' }, 'read', studentA, rel, 'role', 403)
    await expectAllow({ kind: 'faculty.history' }, 'read', facultyX, rel)
    await expectDeny({ kind: 'faculty.history' }, 'read', studentA, rel, 'role', 403)
  })

  it('task.section create/update: faculty + branch + load', async () => {
    await expectAllow({ kind: 'task.section', subjectCode: 'CS 101', term: T, branch: 'commonwealth' }, 'create', facultyX, relThat(['CS 101']))
    await expectDeny({ kind: 'task.section', subjectCode: 'CS 101', term: T, branch: 'commonwealth' }, 'create', studentA, relThat(['CS 101']), 'role', 403)
    await expectDeny({ kind: 'task.section', subjectCode: 'CS 101', term: T, branch: 'novaliches' }, 'create', facultyX, relThat(['CS 101']), 'branch', 403)
    // facultyY (owns CS 103 only) does not teach CS 101
    await expectDeny({ kind: 'task.section', subjectCode: 'CS 101', term: T, branch: 'commonwealth' }, 'create', facultyY, relThat(['CS 103']), 'notAssigned', 403)
  })

  it('task submit: any authed actor (filter self-scopes)', async () => {
    await expectAllow({ kind: 'task', taskId: '6ad8d19739bd029335bead62' }, 'submit', studentA, fakeRel())
  })

  it('task grade: faculty + load on the task subject', async () => {
    await expectAllow({ kind: 'task', taskId: '6ad8d19739bd029335bead62', subjectCode: 'CS 101' }, 'grade', facultyX, relThat(['CS 101']))
    await expectDeny({ kind: 'task', taskId: '6ad8d19739bd029335bead62', subjectCode: 'CS 101' }, 'grade', studentA, relThat(['CS 101']), 'role', 403)
    await expectDeny({ kind: 'task', taskId: '6ad8d19739bd029335bead62', subjectCode: 'CS 101' }, 'grade', facultyY, relThat(['CS 103']), 'notAssigned', 403)
    await expectDeny({ kind: 'task', taskId: '6ad8d19739bd029335bead62' }, 'grade', facultyX, relThat(['CS 101']), 'notAssigned', 403)
  })
})

describe('attendance policies', () => {
  it('FIX-H2: reads and writes require the section in the teaching load (C3.4)', async () => {
    // facultyX teaches CS 101; facultyY teaches CS 103 only (relY denies
    // every section).
    const relX = fakeRel({ teachesSection: async (key: string) => key === 'CS 101|2026-2027|1st Sem' })
    const relY = fakeRel({ teachesSection: async () => false })
    await expectAllow({ kind: 'attendance', sectionKey: 'CS 101|2026-2027|1st Sem' }, 'read', facultyX, relX)
    // cross-faculty read denied — the C3.4 flip (was allowed pre-fix)
    await expectDeny({ kind: 'attendance', sectionKey: 'CS 101|2026-2027|1st Sem' }, 'read', facultyY, relY, 'notAssigned', 403)
    await expectDeny({ kind: 'attendance', sectionKey: 'CS 101|2026-2027|1st Sem' }, 'read', studentA, relX, 'role', 403)
    // admin keeps the branch-wide read (not load-scoped)
    await expectAllow({ kind: 'attendance', sectionKey: 'CS 101|2026-2027|1st Sem' }, 'read', admin, relY)
    await expectAllow({ kind: 'attendance', sectionKey: 'CS 101|2026-2027|1st Sem', branch: 'commonwealth' }, 'update', facultyX, relX)
    // cross-faculty write denied — the core H2 flip (was allowed pre-fix)
    await expectDeny({ kind: 'attendance', sectionKey: 'CS 101|2026-2027|1st Sem', branch: 'commonwealth' }, 'update', facultyY, relY, 'notAssigned', 403)
  })

  it('attendance update: role and branch parity denials', async () => {
    const rel = fakeRel()
    await expectDeny({ kind: 'attendance', sectionKey: 'CS 101|2026-2027|1st Sem', branch: 'commonwealth' }, 'update', studentA, rel, 'role', 403)
    await expectDeny({ kind: 'attendance', sectionKey: 'CS 101|2026-2027|1st Sem', branch: 'novaliches' }, 'update', facultyX, rel, 'branch', 403)
    await expectDeny({ kind: 'attendance', sectionKey: 'CS 101|2026-2027|1st Sem', branch: 'commonwealth' }, 'update', admin, rel, 'role', 403)
  })
})

describe('material policies', () => {
  it('material.list: students and faculty only (admin excluded)', async () => {
    const rel = fakeRel()
    await expectAllow({ kind: 'material.list' }, 'read', studentA, rel)
    await expectAllow({ kind: 'material.list' }, 'read', facultyX, rel)
    await expectDeny({ kind: 'material.list' }, 'read', admin, rel, 'role', 403)
  })

  it('material.upload: faculty + branch + load', async () => {
    await expectAllow({ kind: 'material.upload', subjectCode: 'CS 208', term: T, branch: 'commonwealth' }, 'create', facultyX, relThat(['CS 208']))
    await expectDeny({ kind: 'material.upload', subjectCode: 'CS 208', term: T, branch: 'commonwealth' }, 'create', studentA, relThat(['CS 208']), 'role', 403)
    await expectDeny({ kind: 'material.upload', subjectCode: 'CS 208', term: T, branch: 'novaliches' }, 'create', facultyX, relThat(['CS 208']), 'branch', 403)
    await expectDeny({ kind: 'material.upload', subjectCode: 'CS 208', term: T, branch: 'commonwealth' }, 'create', facultyY, relThat(['CS 103']), 'notAssigned', 403)
    await expectAllow({ kind: 'material.upload', subjectCode: 'CS 208', term: T, branch: 'commonwealth' }, 'signUpload', facultyX, relThat(['CS 208']))
  })

  it('material delete: faculty + load on the doc subject (by load, not uploader)', async () => {
    await expectAllow({ kind: 'material', id: 'abc123', subjectCode: 'CS 101' }, 'delete', facultyX, relThat(['CS 101']))
    await expectDeny({ kind: 'material', id: 'abc123', subjectCode: 'CS 101' }, 'delete', facultyY, relThat(['CS 103']), 'notAssigned', 403)
    await expectDeny({ kind: 'material', id: 'abc123', subjectCode: 'CS 101' }, 'delete', studentA, relThat(['CS 101']), 'role', 403)
  })
})

describe('announcement policies', () => {
  it('read is open to any authed actor; writes are admin-only with branch parity', async () => {
    const rel = fakeRel()
    await expectAllow({ kind: 'announcement' }, 'read', studentA, rel)
    await expectAllow({ kind: 'announcement', branch: 'commonwealth' }, 'create', admin, rel)
    await expectDeny({ kind: 'announcement', branch: 'commonwealth' }, 'create', facultyX, rel, 'role', 403)
    await expectDeny({ kind: 'announcement', branch: 'commonwealth' }, 'create', ctxFor({ username: 'admin2', role: 'admin', branch: 'novaliches' }), rel, 'branch', 403)
  })

  it('announcement.reads markRead is open (route self-scopes; L4 stays in route)', async () => {
    await expectAllow({ kind: 'announcement.reads' }, 'markRead', studentA, fakeRel())
    await expectAllow({ kind: 'announcement.reads' }, 'delete', studentA, fakeRel())
  })
})

describe('notification policies', () => {
  it('inbox read: self or staff; markRead: self only', async () => {
    const rel = fakeRel()
    await expectAllow({ kind: 'notification.inbox', username: 'juan.santos' }, 'read', studentA, rel)
    await expectAllow({ kind: 'notification.inbox', username: 'juan.santos' }, 'read', facultyX, rel)
    await expectDeny({ kind: 'notification.inbox', username: 'juan.santos' }, 'read', ctxFor({ username: 'studentB', role: 'student' }), rel, 'notOwner', 403)
    await expectAllow({ kind: 'notification.inbox', username: 'juan.santos' }, 'markRead', studentA, rel)
    await expectDeny({ kind: 'notification.inbox', username: 'juan.santos' }, 'markRead', ctxFor({ username: 'studentB', role: 'student' }), rel, 'notOwner', 403)
  })

  it('outbox and cleanup are staff/admin surfaces', async () => {
    const rel = fakeRel()
    await expectAllow({ kind: 'notification.outbox' }, 'read', facultyX, rel)
    await expectDeny({ kind: 'notification.outbox' }, 'read', studentA, rel, 'role', 403)
    await expectAllow({ kind: 'notification.cleanup' }, 'cleanup', admin, rel)
    await expectDeny({ kind: 'notification.cleanup' }, 'cleanup', facultyX, rel, 'role', 403)
  })

  it('send: faculty + branch parity; unowned keys are the route problem (LEGACY preserved)', async () => {
    const rel = fakeRel()
    await expectAllow({ kind: 'notification.send', sectionKeys: ['CS 101|2026-2027|1st Sem'], branch: 'commonwealth' }, 'send', facultyX, rel)
    await expectDeny({ kind: 'notification.send', sectionKeys: [], branch: 'commonwealth' }, 'send', studentA, rel, 'role', 403)
    await expectDeny({ kind: 'notification.send', sectionKeys: [], branch: 'novaliches' }, 'send', facultyX, rel, 'branch', 403)
  })
})

describe('admin and branch policies', () => {
  it('admin.directory/stats/enrollment reads: admin only (D1 school-wide)', async () => {
    const rel = fakeRel()
    await expectAllow({ kind: 'admin.directory' }, 'read', admin, rel)
    await expectDeny({ kind: 'admin.directory' }, 'read', facultyX, rel, 'role', 403)
    await expectDeny({ kind: 'admin.stats' }, 'read', studentA, rel, 'role', 403)
    await expectAllow({ kind: 'admin.enrollment' }, 'read', ctxFor({ username: 'admin2', role: 'admin', branch: 'novaliches' }), rel)
  })

  it('admin.enrollment writes: branch parity on the target doc', async () => {
    const rel = fakeRel()
    await expectAllow({ kind: 'admin.enrollment', id: 'rec1', branch: 'commonwealth' }, 'update', admin, rel)
    await expectDeny({ kind: 'admin.enrollment', id: 'rec1', branch: 'novaliches' }, 'update', admin, rel, 'branch', 403)
    await expectDeny({ kind: 'admin.enrollment', id: 'rec1' }, 'update', facultyX, rel, 'role', 403)
  })

  it('branch.calendar/directory: reads open, writes admin-only', async () => {
    const rel = fakeRel()
    await expectAllow({ kind: 'branch.calendar' }, 'read', studentA, rel)
    await expectAllow({ kind: 'branch.directory' }, 'read', facultyX, rel)
    await expectDeny({ kind: 'branch.calendar' }, 'create', facultyX, rel, 'role', 403)
    await expectDeny({ kind: 'branch.directory' }, 'delete', studentA, rel, 'role', 403)
    await expectAllow({ kind: 'branch.calendar' }, 'create', admin, rel)
  })
})

describe('account policies', () => {
  it('account.password update passes the guard (route keeps its gates)', async () => {
    await expectAllow({ kind: 'account.password' }, 'update', studentA, fakeRel())
  })

  it('account.photo: self only', async () => {
    const rel = fakeRel()
    await expectAllow({ kind: 'account.photo', username: 'juan.santos' }, 'update', studentA, rel)
    await expectDeny({ kind: 'account.photo', username: 'juan.santos' }, 'update', ctxFor({ username: 'studentB', role: 'student' }), rel, 'notOwner', 403)
    await expectAllow({ kind: 'account.photo', username: 'juan.santos' }, 'cleanup', studentA, rel)
  })
})

describe('M2 stale-role class dies by construction', () => {
  it('a stale JWT role claim never overrides the DB actor role', async () => {
    // staleFac: DB student, JWT claims faculty.
    const staleFac = {
      actor: { ...studentA.actor },
      claims: { username: 'juan.santos', role: 'faculty', branch: 'commonwealth', tv: 0 },
    }
    await expectDeny({ kind: 'student.profile', username: 'pedro.vasquez' }, 'read', staleFac, fakeRel(), 'notOwner', 403)
    // staleAdm: DB student, JWT claims admin.
    const staleAdm = {
      actor: { ...studentA.actor },
      claims: { username: 'juan.santos', role: 'admin', branch: 'commonwealth', tv: 0 },
    }
    await expectDeny({ kind: 'student.profile', username: 'other.user' }, 'update', staleAdm, fakeRel(), 'notOwner', 403)
    await expectDeny({ kind: 'notification.cleanup' }, 'cleanup', staleAdm, fakeRel(), 'role', 403)
  })
})
