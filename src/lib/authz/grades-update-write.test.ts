// Route-level wiring tests for the grades/update write guards (issue #86).
//
// scopes.test.ts pins the fragment builders; these tests pin that the
// route actually composes them into both updateOne filters (the update
// path and the withdraw path). A regression that drops gradeRow() or
// editablePeriodGuard() from either write filter fails here: the
// captured filter no longer carries the ownership key / state guards.
//
// No database: the two server seams are substituted with bun:test
// mock.module — @/lib/mongodb/connection (getCollection) and
// @/lib/session-auth (getAuthedSession). Everything between the seams
// runs real code: resolveContext, createRelations, the policy table,
// the scope fragments, and the route's own filter composition. The fake
// updateOne matches the captured filter against a write-time row that
// can differ from the row the gate read — which makes the mid-request
// TOCTOU race directly reproducible here, something the integration
// runbook cannot stage (its fixtures mutate state between requests, so
// the gate re-reads fresh).
//
// Production-tracked with scopes.test.ts (convention in ci.yml /
// CONTRIBUTING.md): CI discovers the focused authz suites via
// `bun test src/lib/authz/`, so this file lives with the policy-table
// tests whose route wiring it verifies.

import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { NextRequest } from 'next/server'
import type { SessionClaims } from '@/lib/session'

// ---- fixtures (seed-shaped: display `professor` differs from the
// ownership stamp, exactly like the real CS 103 rows) ------------------

const claims: SessionClaims = {
  username: 'm.reyes',
  role: 'faculty',
  branch: 'commonwealth',
  tv: 0,
}

const actorDoc = {
  username: 'm.reyes',
  role: 'faculty',
  branch: 'commonwealth',
  fullName: 'Engr. Maria Cristina Reyes',
  academicYear: '2026-2027',
  semester: '1st Sem',
  yearLevel: '',
  section: '',
}

function baseRow() {
  return {
    branch: 'commonwealth',
    code: 'CS 103',
    studentUsername: 'a.castillo',
    professorUsername: 'm.reyes',
    professor: 'Engr. Maria Cristina Reyes',
    academicYear: '2026-2027',
    semester: '1st Sem',
    prelim: '',
    midterm: '85',
    finals: '',
    prelimStatus: '',
    midtermStatus: 'draft',
    finalsStatus: '',
    finalGrade: '',
    remarks: '',
  }
}

// ---- fake persistence ------------------------------------------------
//
// state.row is what the gate reads (findOne); state.writeRow, when set,
// is the row state at write time (updateOne's matcher) — the divergence
// between them IS the mid-request race.

const state = {
  row: baseRow(),
  writeRow: null as ReturnType<typeof baseRow> | null,
  updateOneCalls: [] as { filter: Record<string, unknown>; update: Record<string, unknown> }[],
  auditBatches: [] as Record<string, unknown>[][],
}

// Minimal Mongo matcher: scalar equality, plus the $nin guard the
// write filters use (a missing/null field reads as '' — fixtures keep
// every field present, and for $nin both absent and '' match, agreeing
// with Mongo). Unknown operators fail closed (non-match).
function matchesFilter(doc: Record<string, unknown>, filter: Record<string, unknown>): boolean {
  return Object.entries(filter).every(([key, cond]) => {
    if (cond !== null && typeof cond === 'object' && !Array.isArray(cond)) {
      const nin = (cond as { $nin?: unknown[] }).$nin
      if (!Array.isArray(nin)) return false
      const value = doc[key]
      const comparable = value === undefined || value === null ? '' : value
      return !nin.includes(comparable)
    }
    return doc[key] === cond
  })
}

function fakeStudents() {
  return {
    async findOne(query: Record<string, unknown>) {
      return Object.entries(query).every(([k, v]) => (actorDoc as Record<string, unknown>)[k] === v)
        ? { ...actorDoc }
        : null
    },
  }
}

function fakeSubjects() {
  return {
    async findOne(query: Record<string, unknown>) {
      return Object.entries(query).every(([k, v]) => state.row[k] === v) ? { ...state.row } : null
    },
    async updateOne(filter: Record<string, unknown>, update: Record<string, unknown>) {
      state.updateOneCalls.push({ filter, update })
      const target = state.writeRow ?? state.row
      const matched = matchesFilter(target, filter) ? 1 : 0
      return { acknowledged: true, matchedCount: matched, modifiedCount: matched }
    },
  }
}

function fakeGradeAudits() {
  return {
    async insertMany(docs: Record<string, unknown>[]) {
      state.auditBatches.push(docs)
      return { acknowledged: true, insertedCount: docs.length }
    },
  }
}

// ---- the two server seams --------------------------------------------

mock.module('@/lib/session-auth', () => ({
  getAuthedSession: async () => ({ ...claims }),
}))

mock.module('@/lib/mongodb/connection', () => ({
  getCollection: async (name: string) => {
    if (name === 'students') return fakeStudents()
    if (name === 'subjects') return fakeSubjects()
    if (name === 'grade_audits') return fakeGradeAudits()
    throw new Error(`grades-update-write test fake: unexpected collection "${name}"`)
  },
}))

// Imported AFTER the mocks are registered, so the route's module graph
// resolves the substituted seams.
const { PATCH } = await import('@/app/api/grades/update/route')

// ---- helpers ----------------------------------------------------------

function patchRequest(item: Record<string, unknown>): NextRequest {
  return new Request('http://localhost/api/grades/update', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ updates: [item] }),
  }) as unknown as NextRequest
}

const row = {
  studentUsername: 'a.castillo',
  subjectCode: 'CS 103',
  branch: 'commonwealth',
  academicYear: '2026-2027',
  semester: '1st Sem',
}

interface UpdateEnvelope {
  ok: boolean
  results: { ok: boolean; studentUsername: string; subjectCode: string; reason?: string }[]
}

async function callPatch(item: Record<string, unknown>): Promise<{ status: number; body: UpdateEnvelope }> {
  const res = await PATCH(patchRequest(item))
  return { status: res.status, body: (await res.json()) as UpdateEnvelope }
}

beforeEach(() => {
  state.row = baseRow()
  state.writeRow = null
  state.updateOneCalls = []
  state.auditBatches = []
})

// ---- the wiring: both write filters carry the issue #86 guards -------

describe('grades/update route — issue #86 write-filter wiring', () => {
  it('update write: the filter composes gradeRow with a state guard for every touched period', async () => {
    const { status, body } = await callPatch({ ...row, prelim: '88', midterm: '90' })

    expect(status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.results[0].ok).toBe(true)
    expect(state.updateOneCalls).toHaveLength(1)
    expect(state.updateOneCalls[0].filter).toEqual({
      branch: 'commonwealth',
      code: 'CS 103',
      studentUsername: 'a.castillo',
      professorUsername: 'm.reyes',
      academicYear: '2026-2027',
      semester: '1st Sem',
      prelimStatus: { $nin: ['submitted', 'released'] },
      midtermStatus: { $nin: ['submitted', 'released'] },
    })
    // the write landed (fake matcher matched) and the audit recorded it
    expect(state.auditBatches).toHaveLength(1)
    expect(state.auditBatches[0].map((e) => e.period)).toEqual(['prelim', 'midterm'])
  })

  it('finalGrade-only row: the guard set defaults to the structural finals period', async () => {
    const { status, body } = await callPatch({ ...row, finalGrade: '90' })

    expect(status).toBe(200)
    expect(body.results[0].ok).toBe(true)
    expect(state.updateOneCalls).toHaveLength(1)
    expect(state.updateOneCalls[0].filter).toEqual({
      branch: 'commonwealth',
      code: 'CS 103',
      studentUsername: 'a.castillo',
      professorUsername: 'm.reyes',
      academicYear: '2026-2027',
      semester: '1st Sem',
      finalsStatus: { $nin: ['submitted', 'released'] },
    })
  })

  it('withdraw write: the filter composes gradeRow with the atomic submitted guard', async () => {
    state.row = { ...baseRow(), midtermStatus: 'submitted' }

    const { status, body } = await callPatch({ ...row, withdraw: 'midterm' })

    expect(status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.results[0].ok).toBe(true)
    expect(state.updateOneCalls).toHaveLength(1)
    expect(state.updateOneCalls[0].filter).toEqual({
      branch: 'commonwealth',
      code: 'CS 103',
      studentUsername: 'a.castillo',
      professorUsername: 'm.reyes',
      academicYear: '2026-2027',
      semester: '1st Sem',
      midtermStatus: 'submitted',
    })
    expect(state.updateOneCalls[0].update).toEqual({
      $set: { midtermStatus: 'draft', gradeStatus: 'draft' },
    })
    expect(state.auditBatches).toHaveLength(1)
    const entry = state.auditBatches[0][0]
    expect(entry.period).toBe('midterm')
    expect(entry.action).toBe('withdraw')
    expect(entry.oldValue).toBe('submitted')
    expect(entry.newValue).toBe('draft')
    expect(entry.performedBy).toBe('m.reyes')
  })

  it('TOCTOU (update): a professor stamp flipped between the gate read and the write no-ops', async () => {
    // The gate reads state.row (owned by m.reyes, gate passes); the
    // write-time row has been reassigned to l.bautista — the mid-request
    // race the runbook cannot stage.
    state.writeRow = { ...baseRow(), professorUsername: 'l.bautista' }

    const { status, body } = await callPatch({ ...row, prelim: '88', midterm: '90' })

    expect(status).toBe(400)
    expect(body.ok).toBe(false)
    expect(body.results[0].ok).toBe(false)
    expect(body.results[0].reason).toBe('No change')
    // the write was attempted WITH the ownership key riding the filter...
    expect(state.updateOneCalls).toHaveLength(1)
    expect(state.updateOneCalls[0].filter.professorUsername).toBe('m.reyes')
    // ...and no audit may claim a change that did not land
    expect(state.auditBatches).toHaveLength(0)
  })

  it('TOCTOU (update): a period locked between the gate read and the write no-ops', async () => {
    // Gate read: prelim '' (editable). Write time: prelim submitted —
    // the $nin guard must refuse the write the gate would have denied.
    state.writeRow = { ...baseRow(), prelimStatus: 'submitted' }

    const { status, body } = await callPatch({ ...row, prelim: '88' })

    expect(status).toBe(400)
    expect(body.results[0].ok).toBe(false)
    expect(body.results[0].reason).toBe('No change')
    expect(state.updateOneCalls).toHaveLength(1)
    expect(state.updateOneCalls[0].filter.prelimStatus).toEqual({ $nin: ['submitted', 'released'] })
    expect(state.auditBatches).toHaveLength(0)
  })

  it('TOCTOU (withdraw): a stamp flipped between the gate read and the withdrawal no-ops', async () => {
    state.row = { ...baseRow(), midtermStatus: 'submitted' }
    state.writeRow = { ...baseRow(), midtermStatus: 'submitted', professorUsername: 'l.bautista' }

    const { status, body } = await callPatch({ ...row, withdraw: 'midterm' })

    expect(status).toBe(400)
    expect(body.results[0].ok).toBe(false)
    expect(body.results[0].reason).toBe('Not submitted')
    expect(state.updateOneCalls).toHaveLength(1)
    expect(state.updateOneCalls[0].filter.professorUsername).toBe('m.reyes')
    expect(state.updateOneCalls[0].filter.midtermStatus).toBe('submitted')
    expect(state.auditBatches).toHaveLength(0)
  })
})
