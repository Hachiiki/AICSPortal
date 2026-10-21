import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCollection } from '@/lib/mongodb/connection'
import { spoofCheck } from '@/lib/session'
import { requireCan, resolveContext, createRelations, can, decisionToHttpError } from '@/lib/authz'
import { parseBody, parseQuery, errResponse } from '@/lib/validation'
import { HttpError } from '@/lib/http'

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
//    Faculty or admin of the same branch. LEGACY(H2): no section
//    ownership — any same-branch faculty reads any section until
//    FIX-H2 (C3.4, issue #60).
//  POST /api/attendance
//    Body: { branch, sectionKey, date, records, performedBy }
//    Faculty only, same branch. Upserts the session. LEGACY(H2):
//    no ownership or roster validation until C3.4. The L2 quirk
//    (claimed branch vs the JWT branch claim answers 400, not the
//    taxonomy's 403) stays route-kept until FIX-L2 (C3.9).
// ============================================================

// ---- Zod input schemas (the only place attendance input is shaped) ----

const attendanceGetQuerySchema = z.object({
  username: z.string().optional(),
  sectionKey: z.string({ error: 'Username and sectionKey are required.' }).min(1, {
    message: 'Username and sectionKey are required.',
  }),
  date: z.string().optional(),
})

const ATTENDANCE_REQUIRED = 'Branch, sectionKey, date, and records are required.'

const attendancePostSchema = z.object({
  branch: z.string({ error: ATTENDANCE_REQUIRED }).min(1, { message: ATTENDANCE_REQUIRED }),
  sectionKey: z.string({ error: ATTENDANCE_REQUIRED }).min(1, { message: ATTENDANCE_REQUIRED }),
  date: z
    .string({ error: ATTENDANCE_REQUIRED })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be YYYY-MM-DD.' }),
  records: z.record(z.string(), z.enum(['present', 'absent'], { error: 'Records must map usernames to present or absent.' })),
  // Legacy spoof-check field; identity always comes from the session.
  performedBy: z.string().optional(),
  // BUG-015: existing sessions require an explicit overwrite confirmation.
  allowOverwrite: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { username: usernameParam, sectionKey, date } = parseQuery(request, attendanceGetQuerySchema)
    // C2.5: auth + username-self + role gates centralized
    // (attendance read: faculty or admin, DB role; LEGACY(H2) no
    // section ownership). The username query field rides the guard's
    // spoof check; the branch-scoped query below stays route-kept
    // (branch from the session claim, as today).
    const {
      ctx: { actor, claims },
    } = await requireCan(request, { kind: 'attendance', sectionKey }, 'read', {
      claimedIdentity: usernameParam,
    })
    const username = usernameParam || actor.username
    if (!username || !sectionKey) {
      return NextResponse.json({ ok: false, error: 'Username and sectionKey are required.' }, { status: 400 })
    }
    const col = await getCollection('attendance')
    const query: Record<string, string> = { branch: claims.branch, sectionKey }
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
    if (err instanceof HttpError) return errResponse(err)
    console.error('Attendance read error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to load attendance.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // C2.5: canonical actor first (the L2 quirk must fire before the
    // policy's branch parity, preserving today's exact denial order).
    const ctx = await resolveContext(request)
    if (!ctx) throw new HttpError(401, 'Unauthorized')

    const { branch, sectionKey, date, records, performedBy, allowOverwrite } = await parseBody(
      request,
      attendancePostSchema
    )
    const spoof = spoofCheck(ctx.claims, performedBy)
    if (spoof) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }
    // L2 quirk, route-kept until FIX-L2 (C3.9): the claimed branch vs
    // the JWT branch claim answers 400 with the required-fields
    // message, not the taxonomy's 403.
    if (branch !== ctx.claims.branch) {
      return NextResponse.json({ ok: false, error: ATTENDANCE_REQUIRED }, { status: 400 })
    }
    // C2.5: faculty role + the DB-side branch parity twin centralized
    // (attendance update; LEGACY(H2): no ownership or roster
    // validation until C3.4).
    const gate = decisionToHttpError(
      await can(ctx, createRelations(ctx), { kind: 'attendance', sectionKey, branch }, 'update')
    )
    if (gate) throw gate
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
          $set: { records, takenBy: ctx.actor.username, takenAt: new Date() },
          $push: { history: { updatedAt: new Date(), updatedBy: ctx.actor.username, changedFields } as any },
        },
        { upsert: true }
      )
    } else {
      await col.updateOne(
        { branch, sectionKey, date },
        { $set: { records, takenBy: ctx.actor.username, takenAt: new Date() } },
        { upsert: true }
      )
    }
    const present = Object.values(records).filter((s) => s === 'present').length
    const absent = Object.values(records).length - present
    return NextResponse.json({ ok: true, message: `Attendance saved: ${present} present, ${absent} absent.`, present, absent })
  } catch (err: any) {
    if (err instanceof HttpError) return errResponse(err)
    if (err?.code === 11000) {
      return NextResponse.json({ ok: false, error: 'That session was just saved. Reload and try again.' }, { status: 409 })
    }
    console.error('Attendance save error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to save attendance.' }, { status: 500 })
  }
}
