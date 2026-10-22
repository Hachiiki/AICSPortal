import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCollection } from '@/lib/mongodb/connection'
import { rateLimit } from '@/lib/rate-limit'
import { hashPassword, verifyPassword } from '@/lib/password'
import { requireCan } from '@/lib/authz'
import { parseBody, parseQuery, errResponse, selfQuerySchema } from '@/lib/validation'
import { HttpError } from '@/lib/http'

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
    const student = await col.findOne({ username })

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
    await col.updateOne({ username }, { $set: { password: hashed }, $inc: { tokenVersion: 1 } })

    return NextResponse.json({ ok: true, message: 'Password changed successfully.' })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Change password error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to change password.' }, { status: 500 })
  }
}
