// Server-only actor resolution for the authz module (Phase 2 design 4.2).
//
// One canonical actor lookup replaces the ~26 scattered performer fetches in
// the routes and fixes the M2 stale-role class by construction: the role and
// branch used by every policy decision come from the DB doc, never from the
// JWT claims. The claims stay attached as advisory data (display name,
// spoof comparisons, tv already verified by getAuthedSession).
//
// MUST NOT be imported by proxy.ts or any client component (the mongodb
// driver is node-only). Runbook-tested via scripts/verify-authz.sh; no unit
// tests by plan decision P3.

import type { NextRequest } from 'next/server'
import { getAuthedSession } from '@/lib/session-auth'
import type { SessionClaims } from '@/lib/session'
import { getCollection } from '@/lib/mongodb/connection'
import type { Branch, Role } from '@/lib/mongodb/types'

export interface AuthzActor {
  username: string
  // Raw DB value, deliberately not normalized: corrupt rows (issue #67, the
  // rogue.role seed) carry strings outside the Role union, and those values
  // must keep failing every role equality check exactly as today's routes
  // do. FIX-L3 (C3.10) closes the source at login; this field stays raw.
  role: Role
  branch: Branch
  fullName: string
  // Current-term fields, already on the students doc. The term a faculty
  // member teaches "in" is theirs, not the subject's (tasks route rule).
  academicYear: string
  semester: string
  yearLevel: string
  section: string
}

export interface AuthzContext {
  actor: AuthzActor
  claims: SessionClaims
}

// Exactly the actor fields; nothing else crosses the policy boundary.
const ACTOR_PROJECTION = {
  username: 1,
  role: 1,
  branch: 1,
  fullName: 1,
  academicYear: 1,
  semester: 1,
  yearLevel: 1,
  section: 1,
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

export async function resolveContext(request: NextRequest): Promise<AuthzContext | null> {
  const claims = await getAuthedSession(request)
  if (!claims) return null
  try {
    const col = await getCollection('students')
    const doc = await col.findOne(
      { username: claims.username },
      { projection: ACTOR_PROJECTION }
    )
    if (!doc) return null
    const actor: AuthzActor = {
      username: claims.username,
      role: (typeof doc.role === 'string' ? doc.role : '') as Role,
      branch: (typeof doc.branch === 'string' ? doc.branch : '') as Branch,
      fullName: str(doc.fullName),
      academicYear: str(doc.academicYear),
      semester: str(doc.semester),
      yearLevel: str(doc.yearLevel),
      section: str(doc.section),
    }
    return { actor, claims }
  } catch (err) {
    console.error('authz resolveContext failed:', err)
    return null
  }
}
