import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/connection'
import { rateLimit } from '@/lib/rate-limit'
import { hashPassword, verifyPassword } from '@/lib/password'

// POST /api/auth/change-password?username=juan.santos
// Body: { currentPassword, newPassword }
//
// Verifies the current password (hash or legacy plaintext), then stores a scrypt hash.
// BUG-003 incremental: new writes are always hashed; legacy verifies then upgrades.
export async function POST(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get('username')
    if (!username || typeof username !== 'string') {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
    }

    const { currentPassword, newPassword } = await request.json()

    if (typeof currentPassword !== 'string' || !currentPassword || typeof newPassword !== 'string' || !newPassword) {
      return NextResponse.json({ ok: false, error: 'Current and new passwords are required.' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ ok: false, error: 'New password must be at least 6 characters.' }, { status: 400 })
    }

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
    const hashed = await hashPassword(newPassword)
    await col.updateOne({ username }, { $set: { password: hashed } })

    return NextResponse.json({ ok: true, message: 'Password changed successfully.' })
  } catch (err) {
    console.error('Change password error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to change password.' }, { status: 500 })
  }
}
