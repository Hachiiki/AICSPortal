import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/connection'
import { requireCan } from '@/lib/authz'
import { hasCronBearer } from '@/lib/cron-auth'
import { isSameOriginMutation } from '@/lib/request-origin'
import { errResponse } from '@/lib/validation'
import { HttpError } from '@/lib/http'
import { NOTIFICATION_RETENTION_DAYS } from '@/lib/aics/notifications'
import type { MongoNotification } from '@/lib/mongodb/types'

// ============================================================
//  Notification retention cleanup — GET|POST /api/notifications/cleanup
// ============================================================
//
//  Physically deletes notification docs older than
//  NOTIFICATION_RETENTION_DAYS (30). This is the backend half of
//  the announcement-history expiry: the sent endpoint already
//  filters expired sends out of every query, so this job exists to
//  keep the collection from growing forever — it never decides
//  visibility on its own.
//
//  WHAT IT DELETES (documented per the expiry decision):
//    - notifications docs with createdAt < now - 30 days, across
//      all branches. These are the per-student fan-out copies of
//      faculty section messages AND task-announcement bell
//      notifications.
//    - Read receipts (read/readAt) ride along with their docs.
//      After 30 days the message itself is expired, so the receipt
//      has no feature left to serve — the student bell inbox shows
//      at most the latest 50 and these docs are long past that.
//
//  WHAT IT NEVER TOUCHES:
//    - The `announcements` collection (admin deck, has its own
//      expiryDate field) — a completely separate feature.
//    - `tasks` docs — task fan-out notifications may expire but the
//      tasks themselves stay until their own lifecycle ends.
//    - Anything newer than the cutoff, in any view.
//
//  Vercel cron sends a bearer-authenticated GET. Manual maintenance
//  uses POST with a same-origin admin session. Authorization is enforced
//  here as well as at the request proxy.
// ============================================================

async function runCleanup() {
  // Pure timestamp comparison — no formatted date strings anywhere.
  const cutoff = new Date(Date.now() - NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000)
  const col = await getCollection<MongoNotification>('notifications')
  const result = await col.deleteMany({ createdAt: { $lt: cutoff } })
  return { deleted: result.deletedCount ?? 0, cutoff: cutoff.toISOString() }
}

async function handle(authorize: () => Promise<unknown>) {
  try {
    await authorize()
    const { deleted, cutoff } = await runCleanup()
    return NextResponse.json(
      { ok: true, deleted, cutoff, retentionDays: NOTIFICATION_RETENTION_DAYS },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    if (error instanceof HttpError) return errResponse(error)
    console.error('Notification cleanup failed.')
    return NextResponse.json({ ok: false, error: 'Failed to run cleanup.' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return handle(async () => {
    if (!hasCronBearer(request.headers)) throw new HttpError(401, 'Unauthorized')
  })
}

export function HEAD() {
  return new NextResponse(null, { status: 405, headers: { Allow: 'GET, POST' } })
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    if (!isSameOriginMutation(request)) throw new HttpError(403, 'This request must come from the portal.')
    await requireCan(request, { kind: 'notification.cleanup' }, 'cleanup')
  })
}
