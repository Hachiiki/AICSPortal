import { NextRequest, NextResponse } from 'next/server'
import { getStudentByCredentials } from '@/lib/mongodb/queries'
import { asString, HttpError } from '@/lib/http'
import { rateLimit } from '@/lib/rate-limit'
import { verifyPassword } from '@/lib/password'
import { getCollection } from '@/lib/mongodb/connection'
import { sessionCookie, signSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // BUG-001: reject non-string credentials before they reach Mongo filters.
    // Operator objects (e.g. {"$ne":null}) are truthy but must never become query operators.
    const username = asString(body?.username, 'Username')
    const password = asString(body?.password, 'Password')
    // BUG-003 incremental: lookup by username only, verify hash (or legacy plaintext + upgrade).
    // getStudentByCredentials kept for compat but no longer carries the password into the filter.
    const studentsCol = await getCollection('students')
    const candidate = await studentsCol.findOne({ username })
    let student: any = null
    if (candidate) {
      const check = await verifyPassword(password, (candidate as any).password)
      if (check.ok) {
        student = candidate
        // Hash-on-first-login upgrade for legacy plaintext (single-doc, safe).
        if (check.upgradedHash) {
          try {
            await studentsCol.updateOne({ username }, { $set: { password: check.upgradedHash } })
          } catch (upgradeErr) {
            console.error('Password upgrade failed:', upgradeErr)
          }
        }
      } else {
        // Fallback to legacy exact-match path for docs where password field shape differs.
        student = await getStudentByCredentials(username, password)
      }
    }
    if (!student) {
      // BUG-013: in-memory fixed-window throttle (10 fails / 15min per IP+username).
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown-ip'
      const check = rateLimit(`login:${ip}:${username}`, 10, 15 * 60 * 1000)
      if (!check.ok) {
        return NextResponse.json(
          { ok: false, error: 'Too many login attempts. Please try again later.' },
          { status: 429, headers: { 'Retry-After': String(check.retryAfterSec) } }
        )
      }
      return NextResponse.json({ ok: false, error: 'Invalid username or password.' }, { status: 401 })
    }
    // Phase 6: identity lives in a signed httpOnly session cookie.
    // The JSON body is display-only for client routing; the server
    // never trusts it — every route reads getSession(request).
    const role = student.role || 'student'
    const token = await signSession({ username: student.username, role, branch: student.branch })
    const res = NextResponse.json({
      ok: true,
      username: student.username,
      branch: student.branch,
      role,
    })
    res.cookies.set(sessionCookie(token))
    return res
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status })
    }
    console.error('Login error:', err)
    // Don't leak internal errors to the client. If MongoDB is down, the
    // student sees a generic auth-failure message rather than a 500 stack.
    return NextResponse.json({ ok: false, error: 'Unable to reach the authentication service. Please try again.' }, { status: 503 })
  }
}
