// Centralized authorization: shared types (Phase 2 design section 4.1).
//
// One tagged-union resource vocabulary for every allow/deny decision in the
// app. The policy switch in policies.ts gets compile-time exhaustiveness from
// this union: add a kind here and tsc fails there until a case exists.
//
// Pure types and tiny pure helpers only: no server imports, so this file (and
// anything importing it type-only) stays loadable in any runtime, including
// bun test without environment variables.
//
// Kind inventory vs the 33-route swap scope (phase-3-plan section 2.3):
// - Design kinds kept: student.profile, student.finances, grade.period,
//   grade.releaseQueue, grade.audits, task, task.section, attendance,
//   material.list, material, material.upload, announcement,
//   announcement.reads, notification.inbox, notification.send,
//   admin.directory, admin.stats, admin.enrollment, branch.calendar,
//   branch.directory, account.password, account.photo.
// - Collection-level kinds added where a route guards a collection rather
//   than a row: student.export, task.list, task.board, faculty.roster,
//   faculty.history, grade.submit, notification.outbox, notification.cleanup.
// - The design sketch's grade.row is folded into grade.period: no route in
//   scope guards a grade row without a period in play.

export type TermKey = { academicYear: string; semester: string }

export type Period = 'prelim' | 'midterm' | 'finals'

export type AuthzResource =
  // student surface
  | { kind: 'student.profile'; username: string }
  | { kind: 'student.export'; username: string }
  | { kind: 'student.finances'; username: string }
  // grades
  // branch on write resources is the CLIENT-CLAIMED branch from the request
  // body (parity data the policy compares against the actor's DB branch),
  // never a trusted value.
  | { kind: 'grade.submit'; subjectCode: string; term: TermKey; branch?: string }
  | {
      kind: 'grade.period'
      studentUsername: string
      subjectCode: string
      term: TermKey
      period: Period
      branch?: string
    }
  | { kind: 'grade.releaseQueue'; branch?: string }
  | { kind: 'grade.audits'; subjectCode?: string; studentUsername?: string }
  // tasks
  | { kind: 'task.list'; studentUsername: string }
  | { kind: 'task.board' }
  | { kind: 'task.section'; subjectCode: string; term: TermKey; branch?: string }
  | { kind: 'task'; taskId: string; subjectCode?: string }
  // attendance
  | { kind: 'attendance'; sectionKey: string; branch?: string }
  // materials
  | { kind: 'material.list' }
  | { kind: 'material.upload'; subjectCode: string; term: TermKey; branch?: string }
  | { kind: 'material'; id: string; subjectCode?: string }
  // announcements
  | { kind: 'announcement'; id?: string; branch?: string }
  | { kind: 'announcement.reads' }
  // notifications
  | { kind: 'notification.inbox'; username: string }
  | { kind: 'notification.outbox' }
  | { kind: 'notification.send'; sectionKeys: string[]; branch?: string }
  | { kind: 'notification.cleanup' }
  // admin and shared branch surfaces
  | { kind: 'admin.directory' }
  | { kind: 'admin.stats' }
  | { kind: 'admin.enrollment'; id?: string; branch?: string }
  | { kind: 'branch.calendar' }
  | { kind: 'branch.directory' }
  // faculty reads over the actor's own teaching load
  | { kind: 'faculty.roster' }
  | { kind: 'faculty.history' }
  // self-service account
  | { kind: 'account.password' }
  | { kind: 'account.photo'; username: string }

export type ResourceKind = AuthzResource['kind']

export type Action =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'submit'
  | 'release'
  | 'grade'
  | 'send'
  | 'markRead'
  | 'close'
  | 'signUpload'
  | 'cleanup'

export const RESOURCE_KINDS: readonly ResourceKind[] = [
  'student.profile',
  'student.export',
  'student.finances',
  'grade.submit',
  'grade.period',
  'grade.releaseQueue',
  'grade.audits',
  'task.list',
  'task.board',
  'task.section',
  'task',
  'attendance',
  'material.list',
  'material.upload',
  'material',
  'announcement',
  'announcement.reads',
  'notification.inbox',
  'notification.outbox',
  'notification.send',
  'notification.cleanup',
  'admin.directory',
  'admin.stats',
  'admin.enrollment',
  'branch.calendar',
  'branch.directory',
  'faculty.roster',
  'faculty.history',
  'account.password',
  'account.photo',
] as const

export const ACTIONS: readonly Action[] = [
  'read',
  'create',
  'update',
  'delete',
  'submit',
  'release',
  'grade',
  'send',
  'markRead',
  'close',
  'signUpload',
  'cleanup',
] as const

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

export type DenyCode =
  | 'unauthenticated' // 401: no valid session
  | 'role' // 403: wrong role for the action
  | 'branch' // 403: cross-branch access
  | 'spoof' // 403: claimed identity != session identity
  | 'notAssigned' // 403: faculty does not teach the subject/section
  | 'notOwner' // 403: resource belongs to another user
  | 'state' // 403: invalid grade-status transition
  | 'notEnrolled' // 404: student is not enrolled (masked)
  | 'notFound' // 404: existence would leak (after the authz gate)

export type DenyStatus = 401 | 403 | 404

// Single source of truth for deny code -> HTTP status (retires hazard A3:
// one taxonomy, stable codes). Readonly<Record<...>> keeps the map total at
// compile time: a new DenyCode without a status fails tsc.
export const DENY_STATUS: Readonly<Record<DenyCode, DenyStatus>> = {
  unauthenticated: 401,
  role: 403,
  branch: 403,
  spoof: 403,
  notAssigned: 403,
  notOwner: 403,
  state: 403,
  notEnrolled: 404,
  notFound: 404,
}

export type AuthzDecision =
  | { ok: true }
  | { ok: false; code: DenyCode; status: DenyStatus; error: string }

export function allow(): AuthzDecision {
  return { ok: true }
}

// Status is derived from the code, never passed by the caller, so a decision
// can never claim a status that contradicts its taxonomy entry.
export function deny(code: DenyCode, error: string): AuthzDecision {
  return { ok: false, code, status: DENY_STATUS[code], error }
}
