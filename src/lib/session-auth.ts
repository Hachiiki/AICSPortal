import type { NextRequest } from 'next/server'
import { getCollection } from '@/lib/mongodb/connection'
import { verifySessionToken, SESSION_COOKIE, type SessionClaims } from '@/lib/session'

export async function readAuthedSession(token: string): Promise<SessionClaims | null> {
  if (!token) return null
  const claims = await verifySessionToken(token)
  if (!claims) return null

  try {
    const users = await getCollection('students')
    const user = await users.findOne(
      { username: claims.username, branch: claims.branch },
      { projection: { tokenVersion: 1, role: 1 } },
    )
    if (!user || (user.tokenVersion ?? 0) !== claims.tv || (user.role ?? 'student') !== claims.role) return null
    return claims
  } catch {
    console.error('Session revocation check failed.')
    return null
  }
}

export function getAuthedSession(request: NextRequest): Promise<SessionClaims | null> {
  return readAuthedSession(request.cookies.get(SESSION_COOKIE)?.value ?? '')
}
