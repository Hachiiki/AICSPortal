import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/connection'
import { getAuthedSession as getSession } from '@/lib/session-auth'
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
//  SCHEDULING: vercel.json registers this path as a daily cron
//  (03:00 UTC). Vercel cron sends `Authorization: Bearer
//  $CRON_SECRET` when that env var is set in the project; this
//  handler accepts exactly that header, or an authenticated admin
//  session (manual verification/ops). Until CRON_SECRET is
//  configured in the deployment environment, the cron invocation
//  will be rejected — set it before relying on scheduled runs.
//
//  Authorization note (requirement #3): a teacher cannot trigger
//  another teacher's deletions through this route — there is no
//  per-teacher parameter at all, and the two accepted callers
//  (cron secret, admin session) are both system-level. Faculty
//  sessions are rejected.
// ============================================================

async function authorize(request: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') === `Bearer ${secret}`) {
    return true
  }
  const session = await getSession(request)
  return !!session && session.role === 'admin'
}

async function runCleanup() {
  // Pure timestamp comparison — no formatted date strings anywhere.
  const cutoff = new Date(Date.now() - NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000)
  const col = await getCollection<MongoNotification>('notifications')
  const result = await col.deleteMany({ createdAt: { $lt: cutoff } })
  return { deleted: result.deletedCount ?? 0, cutoff: cutoff.toISOString() }
}

async function handle(request: NextRequest) {
  try {
    if (!(await authorize(request))) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }
    const { deleted, cutoff } = await runCleanup()
    // Idempotent and safe to repeat: only already-expired docs match.
    return NextResponse.json({ ok: true, deleted, cutoff, retentionDays: NOTIFICATION_RETENTION_DAYS })
  } catch (err) {
    console.error('Notification cleanup error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to run cleanup.' }, { status: 500 })
  }
}

// Vercel cron issues GET; POST is kept for manual admin operations.
export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
