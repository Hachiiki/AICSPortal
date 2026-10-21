// Unit tests for the guard mapping (plan P3: bun test, dev-only).
// Scope per plan: the decision -> HttpError status/message mapping only;
// requireCan/requireRole request paths are runbook-tested in stage 2.

import { describe, expect, it } from 'bun:test'
// Import from types.ts (pure chain), NOT guards.ts: the mongodb driver's
// module load hits node:v8 APIs Bun has not implemented, so guards.ts's
// graph is runbook territory, not bun-test territory.
import { DENY_STATUS, allow, deny, decisionToHttpError, type DenyCode } from './types'
import { HttpError } from '@/lib/http'

describe('guard decision -> HttpError mapping', () => {
  it('allow maps to null (nothing to throw)', () => {
    expect(decisionToHttpError(allow())).toBeNull()
  })

  it('every deny code maps to an HttpError with the taxonomy status and message', () => {
    for (const code of Object.keys(DENY_STATUS) as DenyCode[]) {
      const d = deny(code, `message for ${code}`)
      const err = decisionToHttpError(d)
      expect(err).toBeInstanceOf(HttpError)
      expect(err!.status).toBe(DENY_STATUS[code])
      expect(err!.message).toBe(`message for ${code}`)
    }
  })

  it('the three status tiers round-trip through HttpError', () => {
    expect(decisionToHttpError(deny('unauthenticated', 'x'))!.status).toBe(401)
    expect(decisionToHttpError(deny('role', 'x'))!.status).toBe(403)
    expect(decisionToHttpError(deny('notFound', 'x'))!.status).toBe(404)
  })

  it('the mapping helper is a pure function over decisions', () => {
    expect(typeof decisionToHttpError).toBe('function')
    // determinism: same decision, same error shape
    const e1 = decisionToHttpError(deny('spoof', 'Forbidden.'))
    const e2 = decisionToHttpError(deny('spoof', 'Forbidden.'))
    expect(e1!.status).toBe(e2!.status)
    expect(e1!.message).toBe(e2!.message)
  })
})
