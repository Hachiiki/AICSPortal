import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCollection } from '@/lib/mongodb/connection'
import { rateLimit } from '@/lib/rate-limit'
import { hashPassword, verifyPassword } from '@/lib/password'
import { requireCan } from '@/lib/authz'
import { parseBody, parseQuery, errResponse, selfQuerySchema } from '@/lib/validation'
import { HttpError } from '@/lib/http'
import { ONBOARDING_REGISTRY } from '@/lib/onboarding/registry'

// ---- Zod input schema (the only place password-change input is shaped) ----
const changePasswordSchema = z.object({
  currentPassword: z.string({ error: 'Current and new passwords are required.' }).min(1, {
    message: 'Current and new passwords are required.',
  }),
  newPassword: z
    .string({ error: 'Current and new passwords are required.' })
    .min(6, { message: 'New password must be at least 6 characters.' }),
})

// POST /api/auth/change-password?username=juan.santos
// Body: { currentPassword, newPassword }
//
// Verifies the current password (hash or legacy plaintext), then stores a scrypt hash.
// BUG-003 incremental: new writes are always hashed; legacy verifies then upgrades.
export async function POST(request: NextRequest) {
  try {
    const claimed = parseQuery(request, selfQuerySchema).username
    // C2.2: auth centralized (account.password update; the policy
    // passes the guard through and the route keeps its gates). The
    // legacy username query field rides the guard's spoof check: a
    // mismatched value is a 403 exactly where the old inline
    // comparison fired. Old-password verification and the tv bump
    // stay in the route.
    const {
      ctx: { actor },
    } = await requireCan(request, { kind: 'account.password' }, 'update', {
      claimedIdentity: claimed,
    })
    const username = claimed || actor.username
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
    }

    const { currentPassword, newPassword } = await parseBody(request, changePasswordSchema)

    const col = await getCollection('students')
    const student = await col.findOne({ username, branch: actor.branch })

    if (!student) {
      return NextResponse.json({ ok: false, error: 'Student not found.' }, { status: 404 })
    }

    // Verify current password (hash-aware, legacy plaintext fallback inside verifyPassword).
    const pwCheck = await verifyPassword(currentPassword, (student as any).password)
    if (!pwCheck.ok) {
      // BUG-013: throttle online guessing via the current-password oracle.
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown-ip'
      const limited = rateLimit(`cpw:${ip}:${username}`, 10, 15 * 60 * 1000)
      if (!limited.ok) {
        return NextResponse.json(
          { ok: false, error: 'Too many attempts. Please try again later.' },
          { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
        )
      }
      return NextResponse.json({ ok: false, error: 'Current password is incorrect.' }, { status: 401 })
    }

    if (currentPassword === newPassword) {
      return NextResponse.json({ ok: false, error: 'New password must be different from your current password.' }, { status: 400 })
    }

    // BUG-003: always store scrypt hash for new passwords.
    // Phase 6.5: bump tokenVersion so every pre-change token dies with the old password.
    const hashed = await hashPassword(newPassword)
    const result = await col.updateOne({ username, branch: actor.branch }, { $set: { password: hashed }, $inc: { tokenVersion: 1 } })
    if (result.matchedCount !== 1) {
      return NextResponse.json({ ok: false, error: 'Account changed. Please sign in again.' }, { status: 409 })
    }

    // The old session has just been revoked. Record the actual successful
    // action here, using the already-authorized actor, rather than relying
    // on a later client PATCH with an invalid token. This never blocks auth.
    let onboardingPersisted: boolean | undefined
    if (actor.role === 'student') {
      try {
        const progress = await getCollection('onboarding_states')
        await progress.updateOne(
          { branch: actor.branch, username: actor.username },
          { $set: { role: actor.role, version: ONBOARDING_REGISTRY.student.version, 'values.password': true, updatedAt: new Date() } },
          { upsert: true }
        )
        onboardingPersisted = true
      } catch {
        onboardingPersisted = false
        console.warn('Password changed; onboarding progress could not be saved.')
      }
    }
    return NextResponse.json({ ok: true, message: 'Password changed successfully.', onboardingPersisted })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Change password error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to change password.' }, { status: 500 })
  }
}
