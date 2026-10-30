// Route-level wiring tests for the onboarding state surface (Phase 1).
//
// registry.test.ts pins the carry-forward logic; policies.test.ts pins
// the decision table. These tests pin the ROUTE wiring the recovered
// scope demands: identity derives exclusively from the authenticated
// session (the read filter and the upsert are session-stamped
// {branch, username}, never anything the client sent), unknown
// dimension keys answer 400, and persistence failures never block the
// request (persisted:false answers, including the skip-write rule
// after a failed read).
//
// No database: the two server seams are substituted with bun:test
// mock.module — @/lib/mongodb/connection (getCollection) and
// @/lib/session-auth (getAuthedSession) — exactly the
// grades-update-write.test.ts pattern. Everything between the seams
// runs real code: resolveContext, the policy table, the registry, and
// the route's own filter composition.
//
// Lives with the policy-table suites so CI discovers it via
// `bun test src/lib/authz/` (dev-only file: it ports to main only by an
// explicit convention decision, like every non-production suite).

import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { NextRequest } from 'next/server'
import type { SessionClaims } from '@/lib/session'

// ---- fixtures (seed-shaped: juan.santos, commonwealth student) ----

const claims: SessionClaims = {
  username: 'juan.santos',
  role: 'student',
  branch: 'commonwealth',
  tv: 0,
}

const baseActor = {
  username: 'juan.santos',
  role: 'student',
  branch: 'commonwealth',
  fullName: 'Juan Dela Cruz Santos',
  academicYear: '2026-2027',
  semester: '1st Sem',
  yearLevel: '2nd Year',
  section: 'CS-2A',
}

const state = {
  actor: { ...baseActor },
  session: 'ok' as 'ok' | 'none',
  doc: null as Record<string, unknown> | null,
  readFails: false,
  writeFails: false,
  findOneQueries: [] as Record<string, unknown>[],
  updateOneCalls: [] as {
    filter: Record<string, unknown>
    update: Record<string, unknown>
    options: Record<string, unknown>
  }[],
}

function fakeStudents() {
  return {
    async findOne(query: Record<string, unknown>) {
      return Object.entries(query).every(([k, v]) => (state.actor as Record<string, unknown>)[k] === v)
        ? { ...state.actor }
        : null
    },
  }
}

function fakeOnboardingStates() {
  return {
    async findOne(query: Record<string, unknown>) {
      state.findOneQueries.push(query)
      if (state.readFails) throw new Error('simulated onboarding read failure')
      return state.doc ? { ...state.doc } : null
    },
    async updateOne(
      filter: Record<string, unknown>,
      update: Record<string, unknown>,
      options: Record<string, unknown>
    ) {
      state.updateOneCalls.push({ filter, update, options })
      if (state.writeFails) throw new Error('simulated onboarding write failure')
      return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0 }
    },
  }
}

// ---- the two server seams --------------------------------------------

mock.module('@/lib/session-auth', () => ({
  getAuthedSession: async () => (state.session === 'ok' ? { ...claims } : null),
}))

mock.module('@/lib/mongodb/connection', () => ({
  getCollection: async (name: string) => {
    if (name === 'students') return fakeStudents()
    if (name === 'onboarding_states') return fakeOnboardingStates()
    throw new Error(`onboarding-state-write test fake: unexpected collection "${name}"`)
  },
}))

// Imported AFTER the mocks are registered, so the route's module graph
// resolves the substituted seams.
const { GET, PATCH } = await import('@/app/api/onboarding/state/route')

// ---- helpers ----------------------------------------------------------

interface StateEnvelope {
  ok: boolean
  role: string
  version: number
  dimensions: { key: string; label: string }[]
  values: Record<string, boolean>
  persisted: boolean
  error?: string
}

function req(method: 'GET' | 'PATCH', body?: Record<string, unknown>): NextRequest {
  return new Request('http://localhost/api/onboarding/state', {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }) as unknown as NextRequest
}

async function callGet(): Promise<{ status: number; body: StateEnvelope }> {
  const res = await GET(req('GET'))
  return { status: res.status, body: (await res.json()) as StateEnvelope }
}

async function callPatch(body: Record<string, unknown>): Promise<{ status: number; body: StateEnvelope }> {
  const res = await PATCH(req('PATCH', body))
  return { status: res.status, body: (await res.json()) as StateEnvelope }
}

const allFalseStudent = {
  password: false,
  profile: false,
  photo: false,
  tour: false,
  announcements: false,
}

beforeEach(() => {
  state.actor = { ...baseActor }
  state.session = 'ok'
  state.doc = null
  state.readFails = false
  state.writeFails = false
  state.findOneQueries = []
  state.updateOneCalls = []
})

// ---- GET: session-stamped read wiring ---------------------------------

describe('GET /api/onboarding/state — session-stamped wiring', () => {
  it('the read filter is exactly the session-stamped {branch, username} keys', async () => {
    const { status, body } = await callGet()

    expect(status).toBe(200)
    expect(body.ok).toBe(true)
    expect(state.findOneQueries).toHaveLength(1)
    expect(state.findOneQueries[0]).toEqual({ branch: 'commonwealth', username: 'juan.santos' })
  })

  it('no stored doc answers the current registry version with every dimension false', async () => {
    const { body } = await callGet()

    expect(body.version).toBe(1)
    expect(body.values).toEqual(allFalseStudent)
    expect(body.persisted).toBe(true)
    expect(body.dimensions).toHaveLength(5)
  })

  it('a stored doc carries done steps forward', async () => {
    state.doc = {
      branch: 'commonwealth',
      username: 'juan.santos',
      role: 'student',
      version: 1,
      values: { password: true, tour: true },
      updatedAt: new Date(),
    }

    const { body } = await callGet()

    expect(body.values).toEqual({
      password: true,
      profile: false,
      photo: false,
      tour: true,
      announcements: false,
    })
  })

  it('a retired dimension drops out and newer dimensions start false (carry-forward)', async () => {
    state.doc = {
      branch: 'commonwealth',
      username: 'juan.santos',
      role: 'student',
      version: 0,
      values: { password: true, legacyStep: true },
      updatedAt: new Date(),
    }

    const { body } = await callGet()

    expect(body.version).toBe(1)
    expect(body.values).toEqual({ ...allFalseStudent, password: true })
  })

  it('a read failure is non-blocking: 200 with defaults and persisted false', async () => {
    state.readFails = true

    const { status, body } = await callGet()

    expect(status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.persisted).toBe(false)
    expect(body.values).toEqual(allFalseStudent)
  })

  it('no session is a 401', async () => {
    state.session = 'none'

    const { status } = await callGet()

    expect(status).toBe(401)
  })

  it('a corrupt actor role answers 403 (issue #67 class, policy denies it)', async () => {
    state.actor = { ...baseActor, role: 'rogue' }

    const { status } = await callGet()

    expect(status).toBe(403)
  })
})

// ---- PATCH: self-stamped upsert wiring --------------------------------

describe('PATCH /api/onboarding/state — self-stamped upsert wiring', () => {
  it('the upsert filter is session-stamped and the write carries role, registry version, merged values', async () => {
    const { status, body } = await callPatch({ updates: { password: true } })

    expect(status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.values).toEqual({ ...allFalseStudent, password: true })

    expect(state.updateOneCalls).toHaveLength(1)
    const write = state.updateOneCalls[0]
    expect(write.filter).toEqual({ branch: 'commonwealth', username: 'juan.santos' })
    expect(write.options).toEqual({ upsert: true })

    const set = write.update.$set as Record<string, unknown>
    expect(set.role).toBe('student')
    expect(set.version).toBe(1)
    expect(set.values).toEqual({ ...allFalseStudent, password: true })
    expect(set.updatedAt).toBeInstanceOf(Date)
  })

  it('an update merges over the stored state (done steps stay done)', async () => {
    state.doc = {
      branch: 'commonwealth',
      username: 'juan.santos',
      role: 'student',
      version: 1,
      values: { tour: true },
      updatedAt: new Date(),
    }

    const { body } = await callPatch({ updates: { password: true } })

    expect(body.values).toEqual({
      password: true,
      profile: false,
      photo: false,
      tour: true,
      announcements: false,
    })
  })

  it('an explicit false marks a done step back to not done', async () => {
    state.doc = {
      branch: 'commonwealth',
      username: 'juan.santos',
      role: 'student',
      version: 1,
      values: { password: true },
      updatedAt: new Date(),
    }

    const { body } = await callPatch({ updates: { password: false } })

    expect(body.values).toEqual(allFalseStudent)
  })

  it('unknown dimension keys are a 400 with the offending key, and nothing is written', async () => {
    const { status, body } = await callPatch({ updates: { hackThePlanet: true } })

    expect(status).toBe(400)
    expect(body.ok).toBe(false)
    expect(body.error).toContain('Unknown onboarding step')
    expect(state.updateOneCalls).toHaveLength(0)
  })

  it('non-boolean update values are a 400', async () => {
    const { status } = await callPatch({ updates: { password: 'yes' } })

    expect(status).toBe(400)
    expect(state.updateOneCalls).toHaveLength(0)
  })

  it('malformed JSON is a 400', async () => {
    const res = await PATCH(
      new Request('http://localhost/api/onboarding/state', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: '{oops',
      }) as unknown as NextRequest
    )

    expect(res.status).toBe(400)
  })

  it('a write failure is non-blocking: 200 with the computed state and persisted false', async () => {
    state.writeFails = true

    const { status, body } = await callPatch({ updates: { password: true } })

    expect(status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.persisted).toBe(false)
    expect(body.values).toEqual({ ...allFalseStudent, password: true })
  })

  it('a failed read skips the write: no updateOne at all, persisted false', async () => {
    state.readFails = true

    const { status, body } = await callPatch({ updates: { password: true } })

    expect(status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.persisted).toBe(false)
    // The skip-write rule: a map computed off the defaults must never
    // reach the database, or it would wipe steps the failed read could
    // not see.
    expect(state.updateOneCalls).toHaveLength(0)
  })

  it('no session is a 401', async () => {
    state.session = 'none'

    const { status } = await callPatch({ updates: { password: true } })

    expect(status).toBe(401)
  })

  it('a corrupt actor role answers 403 and nothing is written', async () => {
    state.actor = { ...baseActor, role: 'rogue' }

    const { status } = await callPatch({ updates: { password: true } })

    expect(status).toBe(403)
    expect(state.updateOneCalls).toHaveLength(0)
  })
})
