import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { HttpError } from '@/lib/http'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { PasswordServiceBusyError, verifyPassword } from '@/lib/password'
import { MAX_PASSWORD_LENGTH } from '@/lib/password-policy'
import { getCollection } from '@/lib/mongodb/connection'
import { isSessionRole, sessionCookie, sessionVersionFilter, signSession, SESSION_MAX_AGE_SECS, REMEMBER_MAX_AGE_SECS } from '@/lib/session'
import { parseBody, errResponse, usernameSchema } from '@/lib/validation'

const loginSchema = z.object({
  username: usernameSchema,
  password: z.string({ error: 'Password is required.' }).min(1).max(MAX_PASSWORD_LENGTH),
  rememberMe: z.boolean().optional().default(false),
})

const invalidCredentials = () =>
  NextResponse.json({ ok: false, error: 'Invalid username or password.' }, { status: 401 })

export async function POST(request: NextRequest) {
  try {
    const { username, password, rememberMe } = await parseBody(request, loginSchema)
    const throttle = await rateLimit(`login:${clientIp(request)}:${username}`, 10, 15 * 60_000)
    if (!throttle.ok) {
      return NextResponse.json(
        { ok: false, error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(throttle.retryAfterSec) } }
      )
    }

    const students = await getCollection('students')
    const candidate = await students.findOne(
      { username },
      { projection: { password: 1, role: 1, branch: 1, tokenVersion: 1 } },
    )
    const check = await verifyPassword(password, candidate?.password)
    if (!candidate || !check.ok) return invalidCredentials()

    const role = candidate.role ?? 'student'
    const branch = candidate.branch
    if (!isSessionRole(role) || typeof branch !== 'string' || !branch) {
      return NextResponse.json(
        { ok: false, error: 'Your account has invalid access settings. Contact the registrar.' },
        { status: 403 },
      )
    }

    const tv = candidate.tokenVersion ?? 0
    if (!Number.isSafeInteger(tv) || tv < 0) return invalidCredentials()

    if (check.upgradedHash) {
      const result = await students.updateOne(
        { _id: candidate._id, password: candidate.password, ...sessionVersionFilter(tv) },
        { $set: { password: check.upgradedHash } },
      )
      // A concurrent sign-in may have upgraded the same password. A
      // concurrent password change must prevent this sign-in.
      if (!result.matchedCount) {
        const updated = await students.findOne(
          { _id: candidate._id, ...sessionVersionFilter(tv) },
          { projection: { password: 1 } },
        )
        if (!updated || !(await verifyPassword(password, updated.password, { upgrade: false })).ok) {
          return invalidCredentials()
        }
      }
    }

    const maxAgeSecs = rememberMe ? REMEMBER_MAX_AGE_SECS : SESSION_MAX_AGE_SECS
    const token = await signSession({ username, role, branch, tv }, maxAgeSecs)
    const res = NextResponse.json({ ok: true, username, branch, role })
    res.cookies.set(sessionCookie(token, maxAgeSecs))
    return res
  } catch (err) {
    if (err instanceof PasswordServiceBusyError) {
      return NextResponse.json(
        { ok: false, error: 'The password service is busy. Please try again shortly.' },
        { status: 503, headers: { 'Retry-After': '5' } },
      )
    }
    if (err instanceof HttpError) return errResponse(err)
    console.error('Login error.')
    return NextResponse.json(
      { ok: false, error: 'Unable to reach the authentication service. Please try again.' },
      { status: 503 },
    )
  }
}
