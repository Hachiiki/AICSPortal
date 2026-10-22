import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCollection } from '@/lib/mongodb/connection'
import { requireCan } from '@/lib/authz'
import { parseBody, parseQuery, errResponse, selfQuerySchema } from '@/lib/validation'
import { moderateContent } from '@/lib/moderation'
import { HttpError } from '@/lib/http'

// ---- Zod input schema (the only place profile-edit input is shaped) ----
// Whitelist of editable fields; everything else is stripped.
const profileUpdateSchema = z.object({
  phone: z.string().trim().max(500, { message: 'Invalid phone.' }).optional(),
  // Data quality: empty clears the field; anything else must be a
  // plausible email (same shape the login/help surfaces rely on).
  email: z
    .string()
    .trim()
    .max(500, { message: 'Invalid email.' })
    .refine((v) => v.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: 'Invalid email. Use a format like name@example.com.',
    })
    .optional(),
  address: z.string().trim().max(500, { message: 'Invalid address.' }).optional(),
  emergencyContactName: z.string().trim().max(500, { message: 'Invalid emergencyContactName.' }).optional(),
  emergencyContactNumber: z.string().trim().max(500, { message: 'Invalid emergencyContactNumber.' }).optional(),
  // BUG-005: photoUrl is rendered in an img tag — require http(s) + length cap.
  photoUrl: z
    .string()
    .trim()
    .max(2000, { message: 'Invalid photo URL.' })
    .refine((v) => v.length === 0 || /^https?:\/\/.+/i.test(v), { message: 'Invalid photo URL.' })
    .optional(),
})

// PATCH /api/student/update?username=juan.santos
// Updates editable student fields: phone, email, address,
// emergencyContactName, emergencyContactNumber, photoUrl.
//
// Phase 6 (closes BUG-005 auth gap): only the session user may edit
// their own profile (admins may edit same-branch profiles).
// Password changes go through /api/auth/change-password, not here.
export async function PATCH(request: NextRequest) {
  try {
    const username = parseQuery(request, selfQuerySchema).username
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
    }
    // C2.2: self-or-admin gate centralized (student.profile update).
    // The role is the DB value, so a stale JWT admin claim no longer
    // passes here (FIX-M2 rider, issue #62); the admin path's target
    // 404 and branch-mismatch checks stay route-kept.
    const {
      ctx: { actor },
    } = await requireCan(request, { kind: 'student.profile', username }, 'update')

    const body = await parseBody(request, profileUpdateSchema)

    const updateDoc: Record<string, string> = {}
    for (const [field, value] of Object.entries(body)) {
      if (value !== undefined) updateDoc[field] = value
    }

    if (Object.keys(updateDoc).length === 0) {
      return NextResponse.json({ ok: false, error: 'No valid fields to update.' }, { status: 400 })
    }

    // Content moderation: free-text profile fields plus the photo URL
    // (rule 4 applies — untrusted image hosts flag for review).
    const verdict = await moderateContent({
      surface: 'profile',
      fields: {
        phone: body.phone,
        email: body.email,
        address: body.address,
        emergencyContactName: body.emergencyContactName,
        emergencyContactNumber: body.emergencyContactNumber,
      },
      urlFields: { photoUrl: body.photoUrl },
      actor: { username: actor.username, role: actor.role, branch: actor.branch },
    })
    if (!verdict.ok) return verdict.response

    const col = await getCollection('students')
    // Admins editing another profile must stay in-branch.
    if (username !== actor.username) {
      const target = await col.findOne({ username })
      if (!target) {
        return NextResponse.json({ ok: false, error: 'Student not found.' }, { status: 404 })
      }
      if (target.branch !== actor.branch) {
        return NextResponse.json({ ok: false, error: 'Branch mismatch' }, { status: 403 })
      }
    }
    const result = await col.updateOne({ username }, { $set: updateDoc })

    if (result.matchedCount === 0) {
      return NextResponse.json({ ok: false, error: 'Student not found.' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, message: 'Profile updated successfully.' })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Profile update error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to update profile.' }, { status: 500 })
  }
}
