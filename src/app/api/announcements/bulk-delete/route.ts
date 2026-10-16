import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { getStudentByUsername } from '@/lib/mongodb/queries'
import { getCollection } from '@/lib/mongodb/connection'
import { getAuthedSession as getSession } from '@/lib/session-auth'
import { parseBody, objectIdSchema, errResponse } from '@/lib/validation'
import { HttpError } from '@/lib/http'
import type { MongoAnnouncement } from '@/lib/mongodb/types'

// ------------------------------------------------------------
// POST /api/announcements/bulk-delete (admin) — remove many
// Body: { ids: string[] } — 1-200 announcement ids (24-hex each).
//
// The manage page's bulk bar sends the checkbox selection here.
// Branch-scoped like the single DELETE: ids from other branches
// simply do not match, and a request that matches nothing reads
// as 404. Read markers for every deleted post are dropped in the
// same request so the collection never accumulates orphans.
// No moderation pass: deletion never introduces user-authored
// text (the single DELETE is unmoderated for the same reason).
// ------------------------------------------------------------

const bulkDeleteSchema = z.object({
  ids: z
    .array(objectIdSchema)
    .min(1, { message: 'Select at least one announcement.' })
    .max(200, { message: 'Bulk delete is capped at 200 announcements per request.' }),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    const performer = await getStudentByUsername(session.username)
    if (!performer || performer.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Unauthorized: admin only' }, { status: 403 })
    }

    const { ids } = await parseBody(request, bulkDeleteSchema)

    const col = await getCollection<MongoAnnouncement>('announcements')
    const result = await col.deleteMany({
      _id: { $in: ids.map((id) => new ObjectId(id)) },
      branch: performer.branch,
    })
    if (result.deletedCount === 0) {
      return NextResponse.json({ ok: false, error: 'No matching announcements.' }, { status: 404 })
    }

    // Read markers reference announcements by id string; remove them
    // for everything deleted so nothing dangles (single DELETE does
    // the same per id).
    const readsCol = await getCollection('announcement_reads')
    await readsCol.deleteMany({ branch: performer.branch, announcementId: { $in: ids } })

    return NextResponse.json({
      ok: true,
      deleted: result.deletedCount,
      message: `Deleted ${result.deletedCount} announcement${result.deletedCount === 1 ? '' : 's'}.`,
    })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Announcement bulk delete error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to delete announcements.' }, { status: 500 })
  }
}
