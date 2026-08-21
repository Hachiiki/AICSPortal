import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/connection'

// PATCH /api/student/update?username=juan.santos
// Updates editable student fields: phone, email, address,
// emergencyContactName, emergencyContactNumber, photoUrl.
//
// Password changes go through /api/auth/change-password, not here.
export async function PATCH(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get('username')
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
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
        updateDoc[field] = body[field].trim()
      }
    }

    if (Object.keys(updateDoc).length === 0) {
      return NextResponse.json({ ok: false, error: 'No valid fields to update.' }, { status: 400 })
    }

    const col = await getCollection('students')
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
