import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/connection'

// POST /api/auth/change-password?username=juan.santos
// Body: { currentPassword, newPassword }
//
// Verifies the current password, then sets the new one.
// NOTE: Passwords are stored in plaintext for this demo.
// In production, use bcrypt to hash and compare.
export async function POST(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get('username')
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
    }

    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
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

    // Verify current password (plaintext comparison for demo)
    if (student.password !== currentPassword) {
      return NextResponse.json({ ok: false, error: 'Current password is incorrect.' }, { status: 401 })
    }

    if (currentPassword === newPassword) {
      return NextResponse.json({ ok: false, error: 'New password must be different from your current password.' }, { status: 400 })
    }

    await col.updateOne({ username }, { $set: { password: newPassword } })

    return NextResponse.json({ ok: true, message: 'Password changed successfully.' })
  } catch (err) {
    console.error('Change password error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to change password.' }, { status: 500 })
  }
}
