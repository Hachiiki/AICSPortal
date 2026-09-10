import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/connection'
import { spoofCheck } from '@/lib/session'
import { getAuthedSession as getSession } from '@/lib/session-auth'

// ============================================================
//  Attendance API
// ============================================================
//
//  One doc per section session:
//    { branch, sectionKey, date, takenBy, records, takenAt }
//  sectionKey is `code|academicYear|semester`, the same key the
//  faculty roster hook builds. records maps student username to
//  'present' or 'absent'.
//
//  GET /api/attendance?username=&sectionKey=[&date=]
//    Faculty or admin of the same branch. Without date, returns
//    every session for the section plus the latest record map.
//  POST /api/attendance
//    Body: { branch, sectionKey, date, records, performedBy }
//    Faculty only, same branch. Upserts the session.
// ============================================================

async function getPerformer(username: string | null) {
  if (!username || typeof username !== 'string') return null
  const studentsCol = await getCollection('students')
  return studentsCol.findOne({ username })
}

export async function GET(request: NextRequest) {
  try {
    // Phase 6: reader is the session user; branch comes from the session.
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    const username = request.nextUrl.searchParams.get('username') || session.username
    const sectionKey = request.nextUrl.searchParams.get('sectionKey')
    const date = request.nextUrl.searchParams.get('date')
    if (!username || !sectionKey) {
      return NextResponse.json({ ok: false, error: 'Username and sectionKey are required.' }, { status: 400 })
    }
    if (username !== session.username) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }
    const performer = await getPerformer(session.username)
    if (!performer || (performer.role !== 'faculty' && performer.role !== 'admin')) {
      return NextResponse.json({ ok: false, error: 'Unauthorized: faculty or admin only' }, { status: 403 })
    }
    const col = await getCollection('attendance')
    const query: Record<string, string> = { branch: session.branch, sectionKey }
    const sessionList = await col
      .find(query)
      .project({ date: 1, takenBy: 1, takenAt: 1 })
      .sort({ date: -1 })
      .toArray()
    let records: Record<string, string> | null = null
    if (date) {
      const doc = await col.findOne({ ...query, date })
      if (doc) records = doc.records || {}
    } else if (sessionList.length) {
      const latest = await col.findOne({ ...query, date: (sessionList[0] as any).date })
      if (latest) records = latest.records || {}
    }
    return NextResponse.json({
      ok: true,
      sessions: sessionList.map((s: any) => ({ date: s.date, takenBy: s.takenBy, takenAt: s.takenAt })),
      records,
    })
  } catch (err) {
    console.error('Attendance read error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to load attendance.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Phase 6: taker is the session faculty; mismatched performedBy is a spoof attempt.
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { branch, sectionKey, date, records, performedBy, allowOverwrite } = await request.json()
    const spoof = spoofCheck(session, performedBy)
    if (spoof) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }
    // BUG-010: branch/sectionKey/date must be strings pre-query; objects become operators.
    if (typeof branch !== 'string' || branch !== session.branch || typeof sectionKey !== 'string' || !sectionKey || typeof date !== 'string' || !date) {
      return NextResponse.json({ ok: false, error: 'Branch, sectionKey, date, and records are required.' }, { status: 400 })
    }
    if (!branch || !sectionKey || !date || !records || typeof records !== 'object') {
      return NextResponse.json({ ok: false, error: 'Branch, sectionKey, date, and records are required.' }, { status: 400 })
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ ok: false, error: 'Date must be YYYY-MM-DD.' }, { status: 400 })
    }
    // Phase 6: taker is the session faculty (legacy performedBy already spoof-checked; ignored).
    const performer = await getPerformer(session.username)
    if (!performer || performer.role !== 'faculty') {
      return NextResponse.json({ ok: false, error: 'Unauthorized: faculty only' }, { status: 403 })
    }
    if (performer.branch !== branch) {
      return NextResponse.json({ ok: false, error: 'Branch mismatch' }, { status: 403 })
    }
    for (const [studentUsername, status] of Object.entries(records)) {
      if (typeof studentUsername !== 'string' || (status !== 'present' && status !== 'absent')) {
        return NextResponse.json({ ok: false, error: 'Records must map usernames to present or absent.' }, { status: 400 })
      }
    }
    const col = await getCollection('attendance')
    // BUG-017: unique index is created by seed/migration tooling, not per request.
    // BUG-015: silent overwrite guard — existing session requires explicit allowOverwrite.
    const existing = await col.findOne({ branch, sectionKey, date })
    if (existing && allowOverwrite !== true) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Attendance already exists for this session. Resubmit with allowOverwrite:true to update.',
          existing: { takenBy: (existing as any).takenBy, takenAt: (existing as any).takenAt, records: (existing as any).records },
        },
        { status: 409 }
      )
    }
    if (existing && allowOverwrite === true) {
      const prevRecords = (existing as any).records || {}
      const changedFields = Object.keys(records).filter((k) => prevRecords[k] !== (records as Record<string, string>)[k])
      await col.updateOne(
        { branch, sectionKey, date },
        {
          $set: { records, takenBy: session.username, takenAt: new Date() },
          $push: { history: { updatedAt: new Date(), updatedBy: session.username, changedFields } as any },
        },
        { upsert: true }
      )
    } else {
      await col.updateOne(
        { branch, sectionKey, date },
        { $set: { records, takenBy: session.username, takenAt: new Date() } },
        { upsert: true }
      )
    }
    const present = Object.values(records).filter((s) => s === 'present').length
    const absent = Object.values(records).length - present
    return NextResponse.json({ ok: true, message: `Attendance saved: ${present} present, ${absent} absent.`, present, absent })
  } catch (err: any) {
    if (err?.code === 11000) {
      return NextResponse.json({ ok: false, error: 'That session was just saved. Reload and try again.' }, { status: 409 })
    }
    console.error('Attendance save error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to save attendance.' }, { status: 500 })
  }
}
