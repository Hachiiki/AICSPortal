import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getStudentByUsername } from '@/lib/mongodb/queries'
import { getCollection } from '@/lib/mongodb/connection'
import { requireCan } from '@/lib/authz'
import { parseBody, errResponse } from '@/lib/validation'
import { HttpError } from '@/lib/http'
import type { MongoAnnouncementRead } from '@/lib/mongodb/types'

// ---- Zod input schemas (the only place read-marker input is shaped) ----
// BUG-010: username must be a string pre-query; ids must be strings (no [object Object] rows).

const readMarkBaseSchema = z.object({
  username: z.string({ error: 'Username is required.' }).min(1),
  announcementId: z.string().optional(),
  ids: z.array(z.string(), { error: 'An announcement id is required.' }).optional(),
})

const readMarkPostSchema = readMarkBaseSchema.extend({
  action: z.enum(['read', 'dismissed'], { error: 'Action must be read or dismissed.' }),
})

/** announcementId wins over ids[]; both may be absent (caller then 400s). */
function toIdList(announcementId?: string, ids?: string[]): string[] {
  return announcementId ? [announcementId] : Array.isArray(ids) ? ids : []
}

// POST /api/announcements/read
// Body: { username, announcementId?, ids?, action }
// Phase 6: users record reads for their own session username only.
export async function POST(request: NextRequest) {
  try {
    const { username, announcementId, ids, action } = await parseBody(request, readMarkPostSchema)
    // C2.2: auth + username-self gate centralized (announcement.reads
    // markRead; the policy self-scopes via the session-stamped filter
    // keys, and the legacy username field rides the guard's spoof
    // check: a mismatched value is a 403 exactly where the old inline
    // comparison fired). The L4 ids cap is validation and stays in the
    // route until FIX-L4 (C3.11).
    await requireCan(request, { kind: 'announcement.reads' }, 'markRead', {
      claimedIdentity: username,
    })
    const idList = toIdList(announcementId, ids)
    if (idList.length === 0) {
      return NextResponse.json({ ok: false, error: 'An announcement id is required.' }, { status: 400 })
    }
    const user = await getStudentByUsername(username)
    if (!user) {
      return NextResponse.json({ ok: false, error: 'User not found.' }, { status: 404 })
    }
    const col = await getCollection<MongoAnnouncementRead>('announcement_reads')
    // BUG-017: index created by seed/migration tooling, not per request.
    const now = new Date()
    const ops = idList.map((id) => ({
      updateOne: {
        filter: { branch: user.branch, username, announcementId: String(id) },
        update: { $set: { action, at: now } },
        upsert: true,
      },
    }))
    await col.bulkWrite(ops as any)
    return NextResponse.json({ ok: true, marked: idList.length })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Announcement read error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to record read.' }, { status: 500 })
  }
}

// DELETE /api/announcements/read
// Body: { username, announcementId?, ids? } — reverses marks (toast Undo).
// Same guards as POST: session user only, string ids, branch-scoped delete.
export async function DELETE(request: NextRequest) {
  try {
    const { username, announcementId, ids } = await parseBody(request, readMarkBaseSchema)
    // C2.2: auth + username-self gate centralized (announcement.reads
    // delete; same spoof-check mapping as POST).
    await requireCan(request, { kind: 'announcement.reads' }, 'delete', {
      claimedIdentity: username,
    })
    const idList = toIdList(announcementId, ids)
    if (idList.length === 0) {
      return NextResponse.json({ ok: false, error: 'An announcement id is required.' }, { status: 400 })
    }
    const user = await getStudentByUsername(username)
    if (!user) {
      return NextResponse.json({ ok: false, error: 'User not found.' }, { status: 404 })
    }
    const col = await getCollection<MongoAnnouncementRead>('announcement_reads')
    const res = await col.deleteMany({ branch: user.branch, username, announcementId: { $in: idList } })
    return NextResponse.json({ ok: true, unmarked: res.deletedCount })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Announcement unmark error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to undo dismissal.' }, { status: 500 })
  }
}
