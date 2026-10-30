// GET/PATCH /api/onboarding/state — the self-service onboarding surface
// (onboarding plan, Phase 1).
//
// Identity derives EXCLUSIVELY from the authenticated session: the
// route accepts no username in the query or body, and both the read
// filter and the upsert are session-stamped {branch, username} from the
// resolved DB actor (ctx.actor) — the same structural self-only
// pattern as announcement.reads. The onboarding.state policy gates the
// surface; a client can only ever touch its own progress doc.
//
// Persistence is non-blocking by design: onboarding is progressive
// enhancement, so a DB read or write failure answers the computed
// state with persisted:false instead of failing the request. The
// client keeps working; the next healthy request heals the stored doc.
// On a failed READ the write is skipped: persisting a map computed off
// the defaults would wipe steps the failed read could not see.
//
// Indexes: {branch, username} unique on onboarding_states, created by
// the seed tooling (BUG-017 convention: never per request).

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCollection } from '@/lib/mongodb/connection'
import { requireCan } from '@/lib/authz'
import { parseBody, errResponse } from '@/lib/validation'
import { HttpError } from '@/lib/http'
import type { MongoOnboardingState } from '@/lib/mongodb/types'
import {
  applyUpdates,
  carryForward,
  registryFor,
  type OnboardingRoleSpec,
  type OnboardingState,
} from '@/lib/onboarding/registry'

// ---- Zod input schemas (the only place update input is shaped) ----

const patchSchema = z.object({
  updates: z.record(
    z.string(),
    z.boolean({ error: 'Step values must be true or false.' }),
    { error: 'Step updates must be an object.' }
  ),
})

// ---- helpers ------------------------------------------------------------

/**
 * The policy denies corrupt role strings, so a missing spec is
 * unreachable; this is the type-narrowing fallback that keeps the
 * handler honest if the policy row ever changes.
 */
function specOr403(role: string): OnboardingRoleSpec {
  const spec = registryFor(role)
  if (!spec) throw new HttpError(403, 'Forbidden.')
  return spec
}

/** Best-effort read: never throws; failures answer persisted:false with a null doc. */
async function findStored(actor: { branch: string; username: string }): Promise<{
  stored: MongoOnboardingState | null
  persisted: boolean
}> {
  try {
    const col = await getCollection<MongoOnboardingState>('onboarding_states')
    const stored = await col.findOne({ branch: actor.branch, username: actor.username })
    return { stored, persisted: true }
  } catch (err) {
    console.error('Onboarding state read failed:', err)
    return { stored: null, persisted: false }
  }
}

function stateResponse(role: string, spec: OnboardingRoleSpec, state: OnboardingState, persisted: boolean) {
  return NextResponse.json({
    ok: true,
    role,
    version: state.version,
    dimensions: spec.dimensions,
    values: state.values,
    persisted,
  })
}

// GET /api/onboarding/state
// Returns the caller's onboarding state normalized to the current
// registry (version carry-forward); no request input at all.
export async function GET(request: NextRequest) {
  try {
    const { ctx } = await requireCan(request, { kind: 'onboarding.state' }, 'read')
    const spec = specOr403(ctx.actor.role)
    const { stored, persisted } = await findStored(ctx.actor)
    const state = carryForward(spec, stored)
    return stateResponse(ctx.actor.role, spec, state, persisted)
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Onboarding state read error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to load onboarding state.' }, { status: 500 })
  }
}

// PATCH /api/onboarding/state
// Body: { updates: { [dimensionKey]: true | false } } — keys are
// validated against the actor's CURRENT registry; unknown keys are the
// client's mistake and answer 400 with the offending key.
export async function PATCH(request: NextRequest) {
  try {
    const { updates } = await parseBody(request, patchSchema)
    const { ctx } = await requireCan(request, { kind: 'onboarding.state' }, 'update')
    const spec = specOr403(ctx.actor.role)

    // Semantic validation against the actor's current registry.
    const known = new Set(spec.dimensions.map((d) => d.key))
    for (const key of Object.keys(updates)) {
      if (!known.has(key)) throw new HttpError(400, `Unknown onboarding step: ${key}`)
    }

    const { stored, persisted: readPersisted } = await findStored(ctx.actor)
    const state = carryForward(spec, stored)
    const values = applyUpdates(spec, state.values, updates)

    let persisted = readPersisted
    if (readPersisted) {
      try {
        const col = await getCollection<MongoOnboardingState>('onboarding_states')
        // Whole-map $set is last-write-wins between concurrent self
        // PATCHes; the surface is one user's own progress, so the race
        // is benign (worst case: a step re-marks).
        await col.updateOne(
          { branch: ctx.actor.branch, username: ctx.actor.username },
          { $set: { role: ctx.actor.role, version: state.version, values, updatedAt: new Date() } },
          { upsert: true }
        )
      } catch (err) {
        persisted = false
        console.error('Onboarding state save failed:', err)
      }
    }

    return stateResponse(ctx.actor.role, spec, { version: state.version, values }, persisted)
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Onboarding state update error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to save onboarding state.' }, { status: 500 })
  }
}
