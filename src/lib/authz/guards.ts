// Route sugar over the policy table (Phase 2 design section 4.5).
//
// One import, one line per handler:
//   const { ctx, rel, scope } = await requireCan(request, resource, action, opts)
// Throws HttpError(status, error) on deny; routes keep their existing
// { ok: false, error } envelope via the shared errResponse helper.
//
// requireCan internally: resolveContext (401), spoofCheck on the legacy
// claimed identity (403), can() over the policy table, then the HttpError
// throw with the decision's status and message. requireRole stays available
// for the handful of surfaces where a role check is the whole rule.
//
// MUST NOT be imported by proxy.ts or client components.

import type { NextRequest } from 'next/server'
import { HttpError } from '@/lib/http'
import { spoofCheck } from '@/lib/session'
import type { Role } from '@/lib/mongodb/types'
import { resolveContext, type AuthzContext } from './context'
import { createRelations, type Relations } from './relations'
import { createScopes, type AuthzScopes } from './scopes'
import { can } from './policies'
import { decisionToHttpError, type Action, type AuthzResource } from './types'

// The decision -> HttpError mapping lives in types.ts (pure import chain,
// unit-testable under bun); re-exported here so routes import everything
// from the guard module.
export { decisionToHttpError } from './types'

export interface Guarded {
  ctx: AuthzContext
  rel: Relations
  scope: AuthzScopes
}

export interface GuardOpts {
  /**
   * Legacy claimed identity: the username/performedBy body field routes
   * still accept. Semantics preserved from src/lib/session.ts spoofCheck —
   * undefined/null passes, anything else must equal the session username
   * or the call is a 403 'Forbidden'.
   */
  claimedIdentity?: unknown
}

async function guardBase(request: NextRequest, opts?: GuardOpts): Promise<AuthzContext> {
  const ctx = await resolveContext(request)
  if (!ctx) throw new HttpError(401, 'Unauthorized')
  const spoof = spoofCheck(ctx.claims, opts?.claimedIdentity)
  if (spoof) throw new HttpError(403, 'Forbidden')
  return ctx
}

export async function requireCan(
  request: NextRequest,
  resource: AuthzResource,
  action: Action,
  opts?: GuardOpts
): Promise<Guarded> {
  const ctx = await guardBase(request, opts)
  const rel = createRelations(ctx)
  const decision = await can(ctx, rel, resource, action)
  const err = decisionToHttpError(decision)
  if (err) throw err
  return { ctx, rel, scope: createScopes(ctx) }
}

export async function requireRole(
  request: NextRequest,
  role: Role,
  opts?: GuardOpts
): Promise<Guarded> {
  const ctx = await guardBase(request, opts)
  if (ctx.actor.role !== role) throw new HttpError(403, `Unauthorized: ${role} only`)
  return { ctx, rel: createRelations(ctx), scope: createScopes(ctx) }
}
