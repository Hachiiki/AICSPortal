// Server-only session verification with revocation (Phase 6.5).
//
// Unlike session.ts (edge-safe, signature-only), this module compares the
// token's `tv` claim against the user's CURRENT tokenVersion in the DB.
// Logout and password changes bump the DB value, so replayed pre-logout
// tokens 401 even though their signature is still valid.
//
// MUST NOT be imported by middleware.ts (Edge runtime cannot load the
// mongodb driver). All /api routes use getAuthedSession; middleware keeps
// the signature-only check as a fast path (stale tokens pass middleware
// but die at the route, and the client bounces to login on 401).

import type { NextRequest } from 'next/server'
import { getCollection } from '@/lib/mongodb/connection'
import { verifySessionToken, SESSION_COOKIE, type SessionClaims } from '@/lib/session'

export async function getAuthedSession(request: NextRequest): Promise<SessionClaims | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return null
  const claims = await verifySessionToken(token)
  if (!claims) return null
  try {
    const col = await getCollection('students')
    const user = await col.findOne(
      { username: claims.username },
      { projection: { tokenVersion: 1 } }
    )
    if (!user) return null
    const current = typeof user.tokenVersion === 'number' ? user.tokenVersion : 0
    if (current !== claims.tv) return null
    return claims
  } catch (err) {
    console.error('Session revocation check failed:', err)
    return null
  }
}
