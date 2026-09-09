import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/connection'
import { getSession } from '@/lib/session'

// PATCH /api/student/update?username=juan.santos
// Updates editable student fields: phone, email, address,
// emergencyContactName, emergencyContactNumber, photoUrl.
//
// Phase 6 (closes BUG-005 auth gap): only the session user may edit
// their own profile (admins may edit same-branch profiles).
// Password changes go through /api/auth/change-password, not here.
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    const username = request.nextUrl.searchParams.get('username')
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
    }
    if (username !== session.username && session.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    // Whitelist editable fields only. Everything else is ignored.
    const allowedFields = [
      'phone',
      'email',
      'address',
      'emergencyContactName',
      'emergencyContactNumber',
      'photoUrl',
    ]

    const updateDoc: Record<string, string> = {}
    for (const field of allowedFields) {
      if (typeof body[field] === 'string') {
        const trimmed = body[field].trim()
        // BUG-005 partial: photoUrl is rendered in an img tag — require http(s) + length cap.
        if (field === 'photoUrl') {
          if (trimmed.length > 2000 || (trimmed.length > 0 && !/^https?:\/\/.+/i.test(trimmed))) {
            return NextResponse.json({ ok: false, error: 'Invalid photo URL.' }, { status: 400 })
          }
        } else if (trimmed.length > 500) {
          return NextResponse.json({ ok: false, error: `Invalid ${field}.` }, { status: 400 })
        }
        updateDoc[field] = trimmed
      }
    }
    // NOTE: caller-vs-target auth still requires server sessions (BUG-009).
    // Full IDOR fix (401/403 on cross-user writes) is NEEDS_APPROVAL breaking change.

    if (Object.keys(updateDoc).length === 0) {
      return NextResponse.json({ ok: false, error: 'No valid fields to update.' }, { status: 400 })
    }

    const col = await getCollection('students')
    // Admins editing another profile must stay in-branch.
    if (username !== session.username) {
      const target = await col.findOne({ username })
      if (!target) {
        return NextResponse.json({ ok: false, error: 'Student not found.' }, { status: 404 })
      }
      if (target.branch !== session.branch) {
        return NextResponse.json({ ok: false, error: 'Branch mismatch' }, { status: 403 })
      }
    }
    const result = await col.updateOne({ username }, { $set: updateDoc })

    if (result.matchedCount === 0) {
      return NextResponse.json({ ok: false, error: 'Student not found.' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, message: 'Profile updated successfully.' })
  } catch (err) {
    console.error('Profile update error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to update profile.' }, { status: 500 })
  }
}
