import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookie, verifySessionToken, SESSION_COOKIE } from '@/lib/session'
import { getCollection } from '@/lib/mongodb/connection'

// POST /api/auth/logout — clears the session cookie AND revokes the token.
// Phase 6.5: logout bumps the user's tokenVersion, so a captured token
// replayed after logout 401s instead of authenticating (was 200).
export async function POST(request: NextRequest) {
  try {
    const raw = request.cookies.get(SESSION_COOKIE)?.value
    if (raw) {
      const claims = await verifySessionToken(raw)
      if (claims) {
        try {
          const col = await getCollection('students')
          await col.updateOne({ username: claims.username }, { $inc: { tokenVersion: 1 } })
        } catch (err) {
          console.error('Logout revocation bump failed:', err)
        }
      }
    }
  } catch (err) {
    console.error('Logout error:', err)
  }
  // Always clear the cookie, even when revocation failed — a 200 here
  // must never strand the browser on a dead session.
  const res = NextResponse.json({ ok: true })
  res.cookies.set(clearSessionCookie())
  return res
}
