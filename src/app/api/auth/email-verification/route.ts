import { createHash, randomBytes } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { HttpError } from '@/lib/http'
import { getCollection } from '@/lib/mongodb/connection'
import { rateLimit } from '@/lib/rate-limit'
import { sessionVersionFilter } from '@/lib/session'
import { getAuthedSession } from '@/lib/session-auth'
import { errResponse, parseBody } from '@/lib/validation'

const requestSchema = z.object({ email: z.string().trim().max(254).pipe(z.email()) })
const confirmSchema = z.object({ token: z.string().regex(/^[\w-]{43}$/) })
const digest = (token: string) => createHash('sha256').update(token).digest('hex')

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthedSession(request)
    if (!session) throw new HttpError(401, 'Sign in to verify your email.')
    const { email } = await parseBody(request, requestSchema)

    const { APP_PUBLIC_ORIGIN, RESEND_API_KEY, EMAIL_VERIFICATION_FROM } = process.env
    if (!APP_PUBLIC_ORIGIN || !RESEND_API_KEY || !EMAIL_VERIFICATION_FROM) {
      throw new HttpError(503, 'Email verification is unavailable. Please try again later.')
    }
    const link = new URL('/verify-email', APP_PUBLIC_ORIGIN)
    if (link.protocol !== 'https:' && !(
      process.env.NODE_ENV === 'development' && link.protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(link.hostname)
    )) {
      throw new Error('Invalid email verification origin.')
    }

    const account = { username: session.username, branch: session.branch }
    const throttle = await rateLimit(`email-verification:${session.branch}:${session.username}`, 3, 15 * 60_000)
    if (!throttle.ok) {
      return Response.json(
        { ok: false, error: 'Please wait before requesting another verification email.' },
        { status: 429, headers: { 'Retry-After': String(throttle.retryAfterSec) } },
      )
    }

    const token = randomBytes(32).toString('base64url')
    const tokenHash = digest(token)
    link.hash = token
    const users = await getCollection('students')
    const result = await users.updateOne(
      { ...account, ...sessionVersionFilter(session.tv) },
      { $set: { emailVerification: { email, tokenHash, expiresAt: new Date(Date.now() + 30 * 60_000) } } },
    )
    if (!result.matchedCount) throw new HttpError(401, 'Sign in again to verify your email.')

    try {
      const sent = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        redirect: 'error',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: EMAIL_VERIFICATION_FROM,
          to: [email],
          subject: 'Verify your AICS Portal email address',
          text: `Confirm your email address in AICS Portal: ${link.href}\n\nThis link expires in 30 minutes.`,
        }),
        signal: AbortSignal.timeout(5_000),
      })
      if (!sent.ok) throw new Error('Email delivery request rejected.')
    } catch {
      await users.updateOne(
        { ...account, 'emailVerification.tokenHash': tokenHash },
        { $unset: { emailVerification: '' } },
      )
      throw new HttpError(503, 'Could not send a verification email. Please try again later.')
    }

    return Response.json({ ok: true })
  } catch (error) {
    if (error instanceof HttpError) return errResponse(error)
    console.error('Email verification request failed.')
    return Response.json({ ok: false, error: 'Email verification is unavailable.' }, { status: 503 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getAuthedSession(request)
    if (!session) throw new HttpError(401, 'Sign in to the account that requested this email.')
    const { token } = await parseBody(request, confirmSchema)
    const users = await getCollection('students')
    const now = new Date()
    const result = await users.updateOne(
      {
        username: session.username,
        branch: session.branch,
        ...sessionVersionFilter(session.tv),
        'emailVerification.tokenHash': digest(token),
        'emailVerification.expiresAt': { $gt: now },
      },
      [
        { $set: { email: '$emailVerification.email', emailVerifiedAt: now } },
        { $unset: 'emailVerification' },
      ],
    )
    if (!result.matchedCount) {
      throw new HttpError(400, 'This link is invalid or expired. Request a new email in Settings.')
    }
    return Response.json({ ok: true })
  } catch (error) {
    if (error instanceof HttpError) return errResponse(error)
    console.error('Email verification confirmation failed.')
    return Response.json({ ok: false, error: 'Email verification is unavailable.' }, { status: 503 })
  }
}
