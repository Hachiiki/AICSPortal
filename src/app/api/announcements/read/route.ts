import { NextRequest, NextResponse } from 'next/server'
import { getStudentByUsername } from '@/lib/mongodb/queries'
import { getCollection } from '@/lib/mongodb/connection'
import type { MongoAnnouncementRead } from '@/lib/mongodb/types'

// POST /api/announcements/read
// Body: { username, announcementId?, ids?, action }
// Records that a user read or dismissed announcements so the deck
// hides them on later visits. Accepts one id or many. Any role may
// record reads, but only for its own username and branch.
export async function POST(request: NextRequest) {
  try {
    const { username, announcementId, ids, action } = await request.json()
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
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
    await col.createIndex({ branch: 1, username: 1, announcementId: 1 }, { unique: true })
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
