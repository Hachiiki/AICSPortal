import { NextRequest, NextResponse } from 'next/server'
import { getStudentByUsername } from '@/lib/mongodb/queries'
import { getCollection } from '@/lib/mongodb/connection'
import type { MongoNotification } from '@/lib/mongodb/types'

// ============================================================
//  Notifications API — section-targeted faculty messages
// ============================================================
//
//  Faculty posts never touch the announcements collection, so
//  they never appear in the main announcement deck. They fan
//  out here as one doc per targeted student, and students read
//  them in the Topbar bell inbox.
//
//  GET /api/notifications?username=
//    The student's own docs, newest first. Students only.
//  GET /api/notifications?sentBy=
//    Docs a faculty member sent, newest first. Faculty or admin.
//  POST /api/notifications
//    Body: { branch, title, body, sectionKeys[], performedBy }
//    Faculty only. sectionKeys must come from the performer's
//    own teaching load — anything else is rejected.
//  PATCH /api/notifications
//    Body: { username, id? | all? } — marks one or all read.
// ============================================================

function toClient(d: any) {
  return {
    _id: d._id?.toString() || '',
    title: d.title,
    body: d.body,
    fromName: d.fromName,
    subjectCode: d.subjectCode,
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt),
    read: d.read === true,
  }
}

export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get('username')
    const sentBy = request.nextUrl.searchParams.get('sentBy')
    if (!username && !sentBy) {
      return NextResponse.json({ ok: false, error: 'Username or sentBy is required.' }, { status: 400 })
    }
    if (username) {
      const student = await getStudentByUsername(username)
      if (!student) {
        return NextResponse.json({ ok: false, error: 'Student not found.' }, { status: 404 })
      }
      const col = await getCollection<MongoNotification>('notifications')
      const docs = await col
        .find({ branch: student.branch, studentUsername: username })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray()
      return NextResponse.json({ ok: true, notifications: docs.map(toClient) })
    }
    const performer = await getStudentByUsername(sentBy as string)
    if (!performer || (performer.role !== 'faculty' && performer.role !== 'admin')) {
      return NextResponse.json({ ok: false, error: 'Unauthorized: faculty or admin only' }, { status: 403 })
    }
    const col = await getCollection<MongoNotification>('notifications')
    const docs = await col
      .find({ branch: performer.branch, fromUsername: sentBy })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()
    return NextResponse.json({ ok: true, notifications: docs.map(toClient) })
  } catch (err) {
    console.error('Notifications read error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to load notifications.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { branch, title, body, sectionKeys, performedBy } = await request.json()
    if (!branch || !title || !body || !Array.isArray(sectionKeys) || sectionKeys.length === 0) {
      return NextResponse.json({ ok: false, error: 'Branch, title, body, and at least one section are required.' }, { status: 400 })
    }
    if (typeof title !== 'string' || title.trim().length === 0 || title.length > 120) {
      return NextResponse.json({ ok: false, error: 'Title must be 1-120 characters.' }, { status: 400 })
    }
    if (typeof body !== 'string' || body.trim().length === 0 || body.length > 2000) {
      return NextResponse.json({ ok: false, error: 'Body must be 1-2000 characters.' }, { status: 400 })
    }
    if (!performedBy) {
      return NextResponse.json({ ok: false, error: 'Unauthorized: performedBy is required' }, { status: 403 })
    }
    const performer = await getStudentByUsername(performedBy)
    if (!performer || performer.role !== 'faculty') {
      return NextResponse.json({ ok: false, error: 'Unauthorized: faculty only' }, { status: 403 })
    }
    if (performer.branch !== branch) {
      return NextResponse.json({ ok: false, error: 'Branch mismatch' }, { status: 403 })
    }

    // Resolve the performer's own sections from their teaching load.
    // Requested keys outside this set are rejected, so a teacher can
    // never notify another teacher's students.
    const subjectsCol = await getCollection('subjects')
    const taught = await subjectsCol
      .find({ branch, professor: performer.fullName })
      .project({ code: 1, academicYear: 1, semester: 1, studentUsername: 1 })
      .toArray()
    const owned = new Map<string, { code: string; students: Set<string> }>()
    for (const d of taught as any[]) {
      const key = `${d.code}|${d.academicYear || ''}|${d.semester || ''}`
      let entry = owned.get(key)
      if (!entry) {
        entry = { code: d.code, students: new Set() }
        owned.set(key, entry)
      }
      if (d.studentUsername) entry.students.add(d.studentUsername)
    }
    const targets = (sectionKeys as string[]).filter((k) => owned.has(k))
    if (targets.length === 0) {
      return NextResponse.json({ ok: false, error: 'None of the chosen sections are in your teaching load.' }, { status: 403 })
    }

    const now = new Date()
    const docs: MongoNotification[] = []
    for (const key of targets) {
      const entry = owned.get(key)!
      for (const studentUsername of entry.students) {
        docs.push({
          branch,
          studentUsername,
          title: title.trim(),
          body: body.trim(),
          fromName: performer.fullName,
          fromUsername: performedBy,
          sectionKey: key,
          subjectCode: entry.code,
          createdAt: now,
          read: false,
          readAt: null,
        })
      }
    }
    if (docs.length === 0) {
      return NextResponse.json({ ok: false, error: 'The chosen sections have no enrolled students.' }, { status: 400 })
    }
    const col = await getCollection<MongoNotification>('notifications')
    await col.createIndex({ branch: 1, studentUsername: 1, createdAt: -1 })
    await col.createIndex({ branch: 1, fromUsername: 1, createdAt: -1 })
    const result = await col.insertMany(docs as any)
    const sections = targets.length
    return NextResponse.json({
      ok: true,
      message: `Sent to ${result.insertedCount} students in ${sections} section${sections === 1 ? '' : 's'}.`,
      notified: result.insertedCount,
      sections,
    })
  } catch (err) {
    console.error('Notification send error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to send notification.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { username, id, all } = await request.json()
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
    }
    const student = await getStudentByUsername(username)
    if (!student) {
      return NextResponse.json({ ok: false, error: 'Student not found.' }, { status: 404 })
    }
    const col = await getCollection<MongoNotification>('notifications')
    const base = { branch: student.branch, studentUsername: username }
    // Readers may only mark their own docs. No performer check is
    // possible without sessions, so the query itself is scoped to
    // the reader's own username and branch.
    if (all === true) {
      const result = await col.updateMany({ ...base, read: false }, { $set: { read: true, readAt: new Date() } })
      return NextResponse.json({ ok: true, marked: result.modifiedCount })
    }
    if (!id) {
      return NextResponse.json({ ok: false, error: 'Notification id or all is required.' }, { status: 400 })
    }
    const { ObjectId } = await import('mongodb')
    let oid: any
    try {
      oid = new ObjectId(id)
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid notification id.' }, { status: 400 })
    }
    await col.updateOne({ ...base, _id: oid }, { $set: { read: true, readAt: new Date() } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Notification read error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to update notification.' }, { status: 500 })
  }
}
