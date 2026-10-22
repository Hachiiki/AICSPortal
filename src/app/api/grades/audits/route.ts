import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCollection } from '@/lib/mongodb/connection'
import { requireCan, professorOwnership } from '@/lib/authz'
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
    const { username, branch, subjectCode, studentUsername, limit } = parseQuery(
      request,
      auditsGetQuerySchema
    )
    // C2.5: auth + username-self + role gates centralized
    // (grade.audits read: faculty or admin, DB role). FIX-M1 (C3.5):
    // faculty reads are scoped below to the caller's professor-of-record
    // subjects (any term); admin keeps the branch view (issue #61). The
    // legacy username param rides the guard's spoof check; the branch
    // forcing and cross-branch rejection stay route-kept.
    const {
      ctx: { actor, claims },
    } = await requireCan(
      request,
      { kind: 'grade.audits', subjectCode, studentUsername },
      'read',
      { claimedIdentity: username }
    )
    // Branch is forced to the session branch; cross-branch reads rejected.
    if (branch && branch !== claims.branch) {
      return NextResponse.json({ ok: false, error: 'Branch mismatch' }, { status: 403 })
    }

    const query: any = { branch: claims.branch }
    if (subjectCode) query.subjectCode = subjectCode
    if (studentUsername) query.studentUsername = studentUsername

    // FIX-M1 (C3.5, issue #61): faculty see audits for their own
    // professor-of-record subjects only (any term — the codes set is the
    // strict ownership key over subjects rows, no term filter). An explicit
    // subjectCode filter is intersected with the load: a subject the
    // caller does not teach returns nothing, fail-closed on unstamped
    // or mismatched stamps. Admin keeps the unscoped branch view.
    if (actor.role === 'faculty') {
      // A1 phase 3 (issue #72): the faculty codes set uses the strict
      // ownership key (username equality only).
      // The claims.branch key is a preserved route quirk.
      const subjectsCol = await getCollection('subjects')
      const rows = await subjectsCol
        .find({
          branch: claims.branch,
          ...professorOwnership(actor.username),
        })
        .project({ code: 1 })
        .toArray()
      const codes = [...new Set(rows.map((r: any) => r.code))]
      if (subjectCode) {
        if (!codes.includes(subjectCode)) query.subjectCode = { $in: [] as string[] }
      } else {
        query.subjectCode = { $in: codes }
      }
    }

    const col = await getCollection('grade_audits')
    const audits = await col.find(query).sort({ performedAt: -1 }).limit(limit).toArray()

    return NextResponse.json({ ok: true, audits })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Grade audits error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to fetch audits.' }, { status: 500 })
  }
}
