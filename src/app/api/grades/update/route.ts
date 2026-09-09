import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/connection'
import { getSession, spoofCheck } from '@/lib/session'

function computedFinalINCasZero(pre: string, mid: string, fin: string): string {
  const norm = (v: string) => {
    if (!v) return null
    if (v.toUpperCase() === 'INC') return 0
    const n = parseFloat(v)
    return isNaN(n) ? null : n
  }
  const p = norm(pre)
  const m = norm(mid)
  const f = norm(fin)
  if (p === null || m === null || f === null) return ''
  return (p * 0.3 + m * 0.3 + f * 0.4).toFixed(2)
}
function remarksFor(final: string): string {
  if (!final) return ''
  if (final.toUpperCase() === 'INC') return 'INC'
  const v = parseFloat(final)
  if (isNaN(v)) return '—'
  if (v >= 90) return 'Excellent'
  if (v >= 85) return 'Very Good'
  if (v >= 80) return 'Good'
  if (v >= 75) return 'Passed'
  if (v >= 70) return 'Conditional'
  return 'Failed'
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { updates, performedBy } = body
    // Phase 6: writer is the session user. A mismatched performedBy is a
    // spoof attempt (403). The field is otherwise ignored — no dual-auth paths.
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    const spoof = spoofCheck(session, performedBy)
    if (spoof) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }
    const performedByUser = session.username

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ ok: false, error: 'No updates provided.' }, { status: 400 })
    }

    // Auth: writer must be the session faculty in the same branch.
    // (Session replaces the old optional-performer pattern — BUG-002.)
    const studentsCol = await getCollection('students')
    const performer = await studentsCol.findOne({ username: performedByUser })
    if (!performer || performer.role !== 'faculty') {
      return NextResponse.json({ ok: false, error: 'Unauthorized: faculty only' }, { status: 403 })
    }
    const performerBranch: string | null = performer.branch
    const performerName: string | null = performer.fullName
    if (performerBranch !== session.branch) {
      return NextResponse.json({ ok: false, error: 'Branch mismatch' }, { status: 403 })
    }

    const col = await getCollection('subjects')
    const auditCol = await getCollection('grade_audits')
    const results: { ok: boolean; studentUsername: string; subjectCode: string; reason?: string }[] = []
    let auditOk = true

    // BUG-008: grade values must be 0-100 (up to 2 decimals) or INC (case-insensitive).
    const validGrade = (v: unknown): boolean => {
      if (typeof v !== 'string') return false
      if (v.toUpperCase() === 'INC') return true
      return /^(100(\.0{1,2})?|[0-9]{1,2}(\.\d{1,2})?)$/.test(v.trim())
    }

    for (const update of updates) {
      const { studentUsername, subjectCode, branch, prelim, midterm, finals, finalGrade, remarks, academicYear, semester } = update

      // BUG-010: keys reaching Mongo filters must be strings; objects become operators.
      if (typeof studentUsername !== 'string' || !studentUsername || typeof subjectCode !== 'string' || !subjectCode || typeof branch !== 'string' || !branch) {
        results.push({ ok: false, studentUsername: String(studentUsername ?? ''), subjectCode: String(subjectCode ?? ''), reason: 'Invalid keys' })
        continue
      }
      if ((academicYear !== undefined && typeof academicYear !== 'string') || (semester !== undefined && typeof semester !== 'string')) {
        results.push({ ok: false, studentUsername, subjectCode, reason: 'Invalid term' })
        continue
      }

      // Branch guard: performer must match branch if provided
      if (performerBranch && performerBranch !== branch) {
        results.push({ ok: false, studentUsername, subjectCode, reason: 'Branch mismatch' })
        continue
      }

      // Fetch existing for audit and for finalGrade compute
      const existing = await col.findOne({ studentUsername, branch, code: subjectCode, ...(academicYear ? { academicYear } : {}), ...(semester ? { semester } : {}) })
      if (!existing) {
        results.push({ ok: false, studentUsername, subjectCode, reason: 'Not found' })
        continue
      }

      // BUG-008: enforce professor-of-record. Faculty may only edit their own sections.
      if (performerName && existing.professor !== performerName) {
        results.push({ ok: false, studentUsername, subjectCode, reason: 'Not your section' })
        continue
      }

      // BUG-008: validate grade values before they reach $set.
      let invalidReason: string | null = null
      for (const [label, val] of [['prelim', prelim], ['midterm', midterm], ['finals', finals]] as const) {
        if (val !== undefined && !validGrade(val)) {
          invalidReason = `Invalid ${label}`
          break
        }
      }
      if (invalidReason) {
        results.push({ ok: false, studentUsername, subjectCode, reason: invalidReason })
        continue
      }
      if (finalGrade !== undefined && !validGrade(finalGrade)) {
        results.push({ ok: false, studentUsername, subjectCode, reason: 'Invalid finalGrade' })
        continue
      }

      const setDoc: Record<string, string> = {}
      const auditEntries: any[] = []
      const now = new Date()

      const pushAudit = (period: string, oldVal: string, newVal: string) => {
        if (oldVal !== newVal) {
          auditEntries.push({
            branch,
            studentUsername,
            subjectCode,
            academicYear: existing.academicYear || academicYear || '',
            semester: existing.semester || semester || '',
            period,
            oldValue: oldVal || '',
            newValue: newVal || '',
            action: 'save',
            performedBy: performedByUser,
            performedAt: now,
          })
        }
      }

      if (prelim !== undefined) {
        const old = existing.prelim || ''
        const nv = String(prelim)
        setDoc.prelim = nv
        setDoc.prelimStatus = 'draft'
        setDoc.gradeStatus = 'draft'
        pushAudit('prelim', old, nv)
      }
      if (midterm !== undefined) {
        const old = existing.midterm || ''
        const nv = String(midterm)
        setDoc.midterm = nv
        setDoc.midtermStatus = 'draft'
        setDoc.gradeStatus = 'draft'
        pushAudit('midterm', old, nv)
      }
      if (finals !== undefined) {
        const old = existing.finals || ''
        const nv = String(finals)
        setDoc.finals = nv
        setDoc.finalsStatus = 'draft'
        setDoc.gradeStatus = 'draft'
        pushAudit('finals', old, nv)
      }

      // finalGrade: if explicitly provided use it, else compute with INC=0 if any of prelim/mid/finals changed
      let fg = finalGrade !== undefined ? String(finalGrade) : ''
      if (finalGrade === undefined && (prelim !== undefined || midterm !== undefined || finals !== undefined)) {
        const p = prelim !== undefined ? String(prelim) : existing.prelim || ''
        const m = midterm !== undefined ? String(midterm) : existing.midterm || ''
        const f = finals !== undefined ? String(finals) : existing.finals || ''
        const computed = computedFinalINCasZero(p, m, f)
        if (computed) {
          fg = computed
          setDoc.finalGrade = fg
          // INC as final when any period INC? computed returns '' for missing, but INC-as-0 returns numeric
          // If computed is numeric, set remarks accordingly
          const rm = remarksFor(computed)
          if (rm) setDoc.remarks = rm
        } else if (fg === '') {
          // if not computable, keep existing or clear
        }
        if (fg) pushAudit('finalGrade', existing.finalGrade || '', fg)
      } else if (finalGrade !== undefined) {
        setDoc.finalGrade = String(finalGrade)
        pushAudit('finalGrade', existing.finalGrade || '', String(finalGrade))
      }

      if (remarks !== undefined) {
        const old = existing.remarks || ''
        const nv = String(remarks)
        setDoc.remarks = nv
        pushAudit('finalGrade', old, nv)
      } else if (setDoc.remarks === undefined && fg) {
        // remarks already set via computed
      }

      if (Object.keys(setDoc).length === 0) {
        results.push({ ok: false, studentUsername, subjectCode, reason: 'No changes' })
        continue
      }

      const result = await col.updateOne(
        { studentUsername, branch, code: subjectCode, ...(academicYear ? { academicYear } : {}), ...(semester ? { semester } : {}) },
        { $set: setDoc }
      )

      if (auditEntries.length > 0) {
        // BUG-011: never swallow audit failures silently; flag them for observability.
        try {
          await auditCol.insertMany(auditEntries)
        } catch (auditErr) {
          console.error('Grade audit insert failed:', auditErr)
          auditOk = false
        }
      }

      results.push({
        ok: result.modifiedCount > 0,
        studentUsername,
        subjectCode,
        ...(result.modifiedCount === 0 ? { reason: 'No change' } : {}),
      })
    }

    const successCount = results.filter((r) => r.ok).length
    const failCount = results.filter((r) => !r.ok).length

    // BUG-014: honest envelope — ok reflects whether anything succeeded.
    const status = failCount === 0 ? 200 : successCount === 0 ? 400 : 207
    return NextResponse.json(
      {
        ok: successCount > 0,
        message: `${successCount} updated, ${failCount} skipped`,
        results,
        ...(auditOk ? {} : { auditWarning: 'Some grade audits failed to persist. See server logs.' }),
      },
      { status }
    )
  } catch (err) {
    console.error('Grade update error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to update grades.' }, { status: 500 })
  }
}
