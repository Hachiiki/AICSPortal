import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/connection'

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

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ ok: false, error: 'No updates provided.' }, { status: 400 })
    }

    // Simple auth: performedBy must be a faculty in the same branch
    let performerBranch: string | null = null
    let performerName: string | null = null
    if (performedBy) {
      const studentsCol = await getCollection('students')
      const performer = await studentsCol.findOne({ username: performedBy })
      if (!performer || performer.role !== 'faculty') {
        return NextResponse.json({ ok: false, error: 'Unauthorized: faculty only' }, { status: 403 })
      }
      performerBranch = performer.branch
      performerName = performer.fullName
    }

    const col = await getCollection('subjects')
    const auditCol = await getCollection('grade_audits')
    const results: { ok: boolean; studentUsername: string; subjectCode: string }[] = []

    for (const update of updates) {
      const { studentUsername, subjectCode, branch, prelim, midterm, finals, finalGrade, remarks, academicYear, semester } = update

      if (!studentUsername || !subjectCode || !branch) {
        results.push({ ok: false, studentUsername, subjectCode })
        continue
      }

      // Branch guard: performer must match branch if provided
      if (performerBranch && performerBranch !== branch) {
        results.push({ ok: false, studentUsername, subjectCode })
        continue
      }

      // Fetch existing for audit and for finalGrade compute
      const existing = await col.findOne({ studentUsername, branch, code: subjectCode, ...(academicYear ? { academicYear } : {}), ...(semester ? { semester } : {}) })
      if (!existing) {
        results.push({ ok: false, studentUsername, subjectCode })
        continue
      }

      // Optional: ensure faculty teaches this subject
      if (performerName && existing.professor !== performerName) {
        // Allow if performer is faculty but not the assigned professor? For now allow, but log
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
            performedBy: performedBy || 'unknown',
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
        results.push({ ok: false, studentUsername, subjectCode })
        continue
      }

      const result = await col.updateOne(
        { studentUsername, branch, code: subjectCode, ...(academicYear ? { academicYear } : {}), ...(semester ? { semester } : {}) },
        { $set: setDoc }
      )

      if (auditEntries.length > 0) {
        try { await auditCol.insertMany(auditEntries) } catch {}
      }

      results.push({
        ok: result.modifiedCount > 0,
        studentUsername,
        subjectCode,
      })
    }

    const successCount = results.filter((r) => r.ok).length
    const failCount = results.filter((r) => !r.ok).length

    return NextResponse.json({
      ok: true,
      message: `${successCount} updated, ${failCount} skipped`,
      results,
    })
  } catch (err) {
    console.error('Grade update error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to update grades.' }, { status: 500 })
  }
}
