// Unit tests for the authz shared types (plan P3: bun test, dev-only).
//
// The Record<ResourceKind, AuthzResource> sample table is the compile-time
// exhaustiveness guard: adding a kind to the union without a sample fails
// tsc, and a sample without a union member fails the parity asserts below.

import { describe, expect, it } from 'bun:test'
import {
  ACTIONS,
  DENY_STATUS,
  RESOURCE_KINDS,
  allow,
  deny,
  type Action,
  type AuthzResource,
  type DenyCode,
  type ResourceKind,
} from './types'

const T = { academicYear: '2026-2027', semester: '1st Sem' }

const SAMPLES: Record<ResourceKind, AuthzResource> = {
  'student.profile': { kind: 'student.profile', username: 'juan.santos' },
  'student.export': { kind: 'student.export', username: 'juan.santos' },
  'student.finances': { kind: 'student.finances', username: 'juan.santos' },
  'grade.submit': { kind: 'grade.submit', subjectCode: 'CS 101', term: T },
  'grade.period': {
    kind: 'grade.period',
    studentUsername: 'juan.santos',
    subjectCode: 'CS 101',
    term: T,
    period: 'prelim',
  },
  'grade.releaseQueue': { kind: 'grade.releaseQueue' },
  'grade.audits': { kind: 'grade.audits' },
  'task.list': { kind: 'task.list', studentUsername: 'juan.santos' },
  'task.board': { kind: 'task.board' },
  'task.section': { kind: 'task.section', subjectCode: 'CS 101', term: T },
  task: { kind: 'task', taskId: '507f1f77bcf86cd799439011' },
  attendance: { kind: 'attendance', sectionKey: 'CS 101|2026-2027|1st Sem' },
  'material.list': { kind: 'material.list' },
  'material.upload': { kind: 'material.upload', subjectCode: 'CS 101', term: T },
  material: { kind: 'material', id: '507f1f77bcf86cd799439011' },
  announcement: { kind: 'announcement' },
  'announcement.reads': { kind: 'announcement.reads' },
  'notification.inbox': { kind: 'notification.inbox', username: 'juan.santos' },
  'notification.outbox': { kind: 'notification.outbox' },
  'notification.send': { kind: 'notification.send', sectionKeys: ['CS 101|2026-2027|1st Sem'] },
  'notification.cleanup': { kind: 'notification.cleanup' },
  'admin.directory': { kind: 'admin.directory' },
  'admin.stats': { kind: 'admin.stats' },
  'admin.enrollment': { kind: 'admin.enrollment' },
  'branch.calendar': { kind: 'branch.calendar' },
  'branch.directory': { kind: 'branch.directory' },
  'faculty.roster': { kind: 'faculty.roster' },
  'faculty.history': { kind: 'faculty.history' },
  'account.password': { kind: 'account.password' },
  'account.photo': { kind: 'account.photo', username: 'juan.santos' },
  'onboarding.state': { kind: 'onboarding.state' },
}

describe('authz types', () => {
  it('RESOURCE_KINDS covers every union kind exactly once', () => {
    const sampleKinds = Object.keys(SAMPLES) as ResourceKind[]
    expect(new Set(sampleKinds).size).toBe(sampleKinds.length)
    expect([...RESOURCE_KINDS].sort()).toEqual([...sampleKinds].sort())
    for (const kind of RESOURCE_KINDS) {
      expect(SAMPLES[kind].kind).toBe(kind)
    }
  })

  it('ACTIONS is unique, non-empty, and every member is an Action', () => {
    expect(new Set(ACTIONS).size).toBe(ACTIONS.length)
    // 12 through C3.2; C3.3 adds withdraw and unrelease (FIX-H1a).
    expect(ACTIONS.length).toBe(14)
    const first: Action = 'read'
    expect(ACTIONS).toContain(first)
  })

  it('DENY_STATUS is total with the right status tiers', () => {
    const codes = Object.keys(DENY_STATUS) as DenyCode[]
    expect(codes).toHaveLength(9)
    expect(DENY_STATUS.unauthenticated).toBe(401)
    expect(DENY_STATUS.notEnrolled).toBe(404)
    expect(DENY_STATUS.notFound).toBe(404)
    for (const code of codes) {
      const status = DENY_STATUS[code]
      expect([401, 403, 404]).toContain(status)
      if (code !== 'unauthenticated') expect(status).not.toBe(401)
      if (code !== 'notEnrolled' && code !== 'notFound') expect(status).not.toBe(404)
    }
  })

  it('deny() derives status from the code and carries the message', () => {
    const d = deny('notAssigned', 'Subject is not in your current teaching load.')
    expect(d.ok).toBe(false)
    if (!d.ok) {
      expect(d.code).toBe('notAssigned')
      expect(d.status).toBe(403)
      expect(d.error).toBe('Subject is not in your current teaching load.')
    }
  })

  it('allow() is the empty ok decision', () => {
    expect(allow()).toEqual({ ok: true })
  })
})
