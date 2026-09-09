import { NextRequest, NextResponse } from 'next/server'
import { getStudentByUsername, getAnnouncements } from '@/lib/mongodb/queries'
import { getCollection } from '@/lib/mongodb/connection'
import { getSession, spoofCheck } from '@/lib/session'
import type { MongoAnnouncement } from '@/lib/mongodb/types'

// GET /api/announcements?username=juan.santos
// Returns active announcements for the session user's branch, newest first.
// Phase 6: the username param must match the session (read markers are per-user).
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    const username = request.nextUrl.searchParams.get('username') || session.username
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
    }
    if (username !== session.username) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }

    const student = await getStudentByUsername(username)
    if (!student) {
      return NextResponse.json({ ok: false, error: 'Student not found.' }, { status: 404 })
    }

    const announcements = await getAnnouncements(student.branch)

    // Announcements this user already read or dismissed, so the
    // deck can hide them instead of replaying them every visit.
    const readsCol = await getCollection('announcement_reads')
    const reads = await readsCol
      .find({ branch: student.branch, username })
      .project({ announcementId: 1 })
      .toArray()

    const clientAnnouncements = announcements.map((a) => ({
      _id: a._id?.toString() || '',
      title: a.title,
      body: a.body,
      category: a.category,
      priority: a.priority,
      author: a.author,
      postedDate: a.postedDate instanceof Date ? a.postedDate.toISOString() : String(a.postedDate),
    }))

    return NextResponse.json({
      ok: true,
      announcements: clientAnnouncements,
      readIds: reads.map((r: any) => String(r.announcementId)),
    })
  } catch (err) {
    console.error('Announcements API error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to fetch announcements.' }, { status: 500 })
  }
}

// POST /api/announcements
// Body: { branch, title, body, category, priority?, expiryDate?, performedBy }
// Admin only. These posts render in the main announcement deck.
// Faculty reach students through POST /api/notifications instead,
// so teacher posts never land in the deck.
const VALID_CATEGORIES = ['academic', 'deadline', 'campus', 'holiday', 'general'] as const

export async function POST(request: NextRequest) {
  try {
    // Phase 6: author is the session admin; mismatched performedBy is a spoof attempt.
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { branch, title, body, category, priority, expiryDate, performedBy } = await request.json()
    const spoof = spoofCheck(session, performedBy)
    if (spoof) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }
    if (typeof branch !== 'string' || branch !== session.branch) {
      return NextResponse.json({ ok: false, error: 'Branch mismatch' }, { status: 403 })
    }
    if (!branch || !title || !body || !category) {
      return NextResponse.json({ ok: false, error: 'Branch, title, body, and category are required.' }, { status: 400 })
    }
    if (typeof title !== 'string' || title.trim().length === 0 || title.length > 120) {
      return NextResponse.json({ ok: false, error: 'Title must be 1-120 characters.' }, { status: 400 })
    }
    if (typeof body !== 'string' || body.trim().length === 0 || body.length > 2000) {
      return NextResponse.json({ ok: false, error: 'Body must be 1-2000 characters.' }, { status: 400 })
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ ok: false, error: 'Invalid category.' }, { status: 400 })
    }
    const safePriority = priority === 'urgent' ? 'urgent' : 'normal'
    let safeExpiry: Date | null = null
    if (expiryDate) {
      const parsed = new Date(expiryDate)
      if (isNaN(parsed.getTime())) {
        return NextResponse.json({ ok: false, error: 'Invalid expiry date.' }, { status: 400 })
      }
      safeExpiry = parsed
    }
    // Phase 6: author is the session user (legacy performedBy already spoof-checked; ignored).
    const performer = await getStudentByUsername(session.username)
    if (!performer || performer.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Unauthorized: admin only' }, { status: 403 })
    }
    if (performer.branch !== branch) {
      return NextResponse.json({ ok: false, error: 'Branch mismatch' }, { status: 403 })
    }
    const col = await getCollection<MongoAnnouncement>('announcements')
    const doc: MongoAnnouncement = {
      branch,
      title: title.trim(),
      body: body.trim(),
      category,
      priority: safePriority,
      author: performer.fullName,
      postedDate: new Date(),
      expiryDate: safeExpiry,
    }
    const result = await col.insertOne(doc as any)
    return NextResponse.json({ ok: true, message: 'Announcement posted.', id: result.insertedId.toString() })
  } catch (err) {
    console.error('Announcement post error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to post announcement.' }, { status: 500 })
  }
}
