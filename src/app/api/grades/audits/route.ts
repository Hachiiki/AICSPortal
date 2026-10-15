import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCollection } from '@/lib/mongodb/connection'
import { getAuthedSession as getSession } from '@/lib/session-auth'
import { parseQuery, errResponse } from '@/lib/validation'
import { HttpError } from '@/lib/http'

// ---- Zod input schema (the only place audit-filter input is shaped) ----
// limit: 1-200 whole number, default 50; junk silently reads as 50
// (the old parseInt path leaked NaN into .limit()).
const auditsGetQuerySchema = z.object({
  username: z.string().optional(),
  branch: z.string().optional(),
  subjectCode: z.string().optional(),
  studentUsername: z.string().optional(),
  limit: z.preprocess(
    (v) => (v === undefined ? 50 : v),
    z.coerce.number().int().min(1).max(200).catch(50)
  ),
})

export async function GET(request: NextRequest) {
  try {
    // Phase 6: audit trail belongs to the session faculty/admin, branch-forced.
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    if (session.role !== 'faculty' && session.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Unauthorized: faculty or admin only' }, { status: 403 })
    }
    const { username, branch, subjectCode, studentUsername, limit } = parseQuery(
      request,
      auditsGetQuerySchema
    )
    // Legacy username param must match the session when supplied.
    if (username && username !== session.username) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }
    // Branch is forced to the session branch; cross-branch reads rejected.
    if (branch && branch !== session.branch) {
      return NextResponse.json({ ok: false, error: 'Branch mismatch' }, { status: 403 })
    }

    const query: any = { branch: session.branch }
    if (subjectCode) query.subjectCode = subjectCode
    if (studentUsername) query.studentUsername = studentUsername

    const col = await getCollection('grade_audits')
    const audits = await col.find(query).sort({ performedAt: -1 }).limit(limit).toArray()

    return NextResponse.json({ ok: true, audits })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Grade audits error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to fetch audits.' }, { status: 500 })
  }
}
