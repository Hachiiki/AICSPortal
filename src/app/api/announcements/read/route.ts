import { NextRequest, NextResponse } from 'next/server'
import { getStudentByUsername } from '@/lib/mongodb/queries'
import { getCollection } from '@/lib/mongodb/connection'
import { getAuthedSession as getSession } from '@/lib/session-auth'
import type { MongoAnnouncementRead } from '@/lib/mongodb/types'

// POST /api/announcements/read
// Body: { username, announcementId?, ids?, action }
// Phase 6: users record reads for their own session username only.
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { username, announcementId, ids, action } = await request.json()
    // BUG-010: username must be a string pre-query; ids must be strings (no [object Object] rows).
    // Phase 6: username must be the session user.
    if (typeof username !== 'string' || !username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
    }
    if (username !== session.username) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }
    if (announcementId !== undefined && typeof announcementId !== 'string') {
      return NextResponse.json({ ok: false, error: 'An announcement id is required.' }, { status: 400 })
    }
    if (ids !== undefined && (!Array.isArray(ids) || !ids.every((x: unknown) => typeof x === 'string'))) {
      return NextResponse.json({ ok: false, error: 'An announcement id is required.' }, { status: 400 })
    }
    const idList: string[] = announcementId ? [announcementId] : Array.isArray(ids) ? ids : []
    if (idList.length === 0) {
      return NextResponse.json({ ok: false, error: 'An announcement id is required.' }, { status: 400 })
    }
    if (action !== 'read' && action !== 'dismissed') {
      return NextResponse.json({ ok: false, error: 'Action must be read or dismissed.' }, { status: 400 })
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
    console.error('Announcement read error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to record read.' }, { status: 500 })
  }
}
