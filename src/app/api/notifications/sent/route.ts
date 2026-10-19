import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getStudentByUsername } from '@/lib/mongodb/queries'
import { getCollection } from '@/lib/mongodb/connection'
import { getAuthedSession as getSession } from '@/lib/session-auth'
import { parseQuery, errResponse, usernameSchema } from '@/lib/validation'
import { HttpError } from '@/lib/http'
import { NOTIFICATION_RETENTION_DAYS } from '@/lib/aics/notifications'
import type { MongoNotification } from '@/lib/mongodb/types'

// ============================================================
//  Sent history API — GET /api/notifications/sent
//  Query: ?sentBy=<username>&page=1&pageSize=5
// ============================================================
//
//  Faculty announcement history, three guarantees per the product
//  decision (2026-10):
//
//  1. GROUPED. One POST fans out one doc per student; every doc of
//     that send shares the exact same `createdAt` timestamp. This
//     route collapses them into one group per send, so the panel
//     reads "Sent to BS2AA · 40 students" instead of 40 rows.
//     Recipients (with resolved names/sections) ride along inside
//     each group for on-demand expansion — no duplicate records.
//
//  2. PAGINATED (server-side). `page`/`pageSize` are applied AFTER
//     grouping, newest first, so the browser only ever holds one
//     page of sends. Over-large `page` values clamp to the last
//     page so a shrinking history (expiry/deletion) can never
//     strand the client on an empty page.
//
//  3. EXPIRED AFTER 30 DAYS. The Mongo filter itself carries
//     `createdAt >= now - NOTIFICATION_RETENTION_DAYS`, so expired
//     sends are invisible here no matter the page, filter, or call
//     pattern — expiry is not just a UI illusion. Timestamps are
//     compared as Dates, never formatted strings.
//
//  Authorization mirrors the old ?sentBy= branch: the outbox
//  belongs to the session user only (staff cannot read each
//  other's), the performer must exist as faculty/admin, and the
//  branch must match the session.
// ============================================================

// Default page size for the faculty sent panel. 5 per the product
// decision; the query param stays available for other callers.
const DEFAULT_PAGE_SIZE = 5

const sentQuerySchema = z.object({
  sentBy: usernameSchema,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(DEFAULT_PAGE_SIZE),
})

interface RecipientAcc {
  username: string
  subjectCode: string
  sectionKey: string
  read: boolean
}

interface GroupAcc {
  key: string
  title: string
  body: string
  taskId: string | null
  createdAt: Date
  recipients: RecipientAcc[]
  readCount: number
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { sentBy, page, pageSize } = parseQuery(request, sentQuerySchema)

    // Own outbox only — same boundary the old flat query enforced.
    const performer = await getStudentByUsername(sentBy)
    if (!performer || (performer.role !== 'faculty' && performer.role !== 'admin')) {
      return NextResponse.json({ ok: false, error: 'Unauthorized: faculty or admin only' }, { status: 403 })
    }
    if (sentBy !== session.username || performer.branch !== session.branch) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }

    // 30-day window baked into the query itself (requirement #3).
    const cutoff = new Date(Date.now() - NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    const col = await getCollection<MongoNotification>('notifications')
    const docs = await col
      .find(
        { branch: performer.branch, fromUsername: sentBy, createdAt: { $gte: cutoff } },
        {
          projection: {
            title: 1,
            body: 1,
            taskId: 1,
            createdAt: 1,
            studentUsername: 1,
            sectionKey: 1,
            subjectCode: 1,
            read: 1,
          },
        }
      )
      .sort({ createdAt: -1 })
      .toArray()

    // ---- Collapse the fan-out into one group per send ----
    // All docs of one POST share the exact same createdAt Date, so
    // `epoch|title` is a faithful send identity (same-millisecond
    // distinct sends are not a real-world case).
    const groups = new Map<string, GroupAcc>()
    for (const d of docs) {
      const createdAt = d.createdAt instanceof Date ? d.createdAt : new Date(d.createdAt)
      const key = `${createdAt.getTime()}|${d.title}`
      let acc = groups.get(key)
      if (!acc) {
        acc = {
          key: createdAt.toISOString(),
          title: d.title,
          body: d.body,
          taskId: typeof d.taskId === 'string' ? d.taskId : null,
          createdAt,
          recipients: [],
          readCount: 0,
        }
        groups.set(key, acc)
      }
      if (acc.taskId === null && typeof d.taskId === 'string') acc.taskId = d.taskId
      if (d.read) acc.readCount += 1
      acc.recipients.push({
        username: d.studentUsername,
        subjectCode: d.subjectCode,
        sectionKey: d.sectionKey,
        read: d.read === true,
      })
    }

    // Docs arrived newest-first, so Map insertion order is already
    // newest-first — but sort explicitly to not rely on that.
    const all = Array.from(groups.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    const total = all.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    // Clamp: an expired/deleted send can shrink totalPages under the
    // requested page — serve the last page instead of an empty one.
    const safePage = Math.min(page, totalPages)
    const pageGroups = total === 0 ? [] : all.slice((safePage - 1) * pageSize, safePage * pageSize)

    // ---- Resolve recipient names/sections for just this page ----
    // One $in lookup instead of per-recipient queries; students whose
    // records are gone keep '' and fall back to their username.
    const usernames = Array.from(new Set(pageGroups.flatMap((g) => g.recipients.map((r) => r.username))))
    const studentsCol = await getCollection('students')
    const studentDocs = usernames.length
      ? await studentsCol
          .find({ username: { $in: usernames } }, { projection: { username: 1, fullName: 1, section: 1 } })
          .toArray()
      : []
    const studentInfo = new Map<string, { fullName: string; section: string }>()
    for (const s of studentDocs as any[]) {
      studentInfo.set(s.username, { fullName: s.fullName || '', section: s.section || '' })
    }

    const payload = pageGroups.map((g) => {
      // Per subject-class summary with the student sections inside it.
      const sectionsMap = new Map<string, { sectionKey: string; subjectCode: string; count: number; names: Map<string, number> }>()
      const recipients = g.recipients.map((r) => {
        const info = studentInfo.get(r.username)
        let sec = sectionsMap.get(r.sectionKey)
        if (!sec) {
          sec = { sectionKey: r.sectionKey, subjectCode: r.subjectCode, count: 0, names: new Map() }
          sectionsMap.set(r.sectionKey, sec)
        }
        sec.count += 1
        if (info?.section) sec.names.set(info.section, (sec.names.get(info.section) || 0) + 1)
        return {
          username: r.username,
          fullName: info?.fullName || '',
          section: info?.section || '',
          subjectCode: r.subjectCode,
          read: r.read,
        }
      })
      recipients.sort((a, b) => (a.fullName || a.username).localeCompare(b.fullName || b.username))
      const sections = Array.from(sectionsMap.values()).map((s) => ({
        sectionKey: s.sectionKey,
        subjectCode: s.subjectCode,
        count: s.count,
        // Most-common student section first (matches roster derivation).
        sectionNames: Array.from(s.names.entries())
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .map(([name]) => name),
      }))
      sections.sort((a, b) => b.count - a.count || a.subjectCode.localeCompare(b.subjectCode))
      return {
        key: g.key,
        title: g.title,
        body: g.body,
        createdAt: g.createdAt.toISOString(),
        total: g.recipients.length,
        readCount: g.readCount,
        taskId: g.taskId,
        sections,
        recipients,
      }
    })

    return NextResponse.json({
      ok: true,
      groups: payload,
      page: total === 0 ? 1 : safePage,
      pageSize,
      total,
      totalPages: total === 0 ? 1 : totalPages,
      cutoff: cutoff.toISOString(),
    })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Sent history read error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to load sent history.' }, { status: 500 })
  }
}
