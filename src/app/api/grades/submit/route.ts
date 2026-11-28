import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { computedFinalINCasZero, gradePeriods, gradePeriodStatus, gradeStatusKeys, remarksFor, validGrade, type SubmittedGradeRow } from '@/lib/aics/grades'
import { requireCan } from '@/lib/authz'
import { HttpError } from '@/lib/http'
import { getCollection } from '@/lib/mongodb/connection'
import { exportPendingGradeAudits } from '@/lib/mongodb/grade-release-audit'
import type { MongoGradeAudit, MongoSubject } from '@/lib/mongodb/types'
import { errResponse, parseBody } from '@/lib/validation'

const gradeSubmitSchema = z.object({
  branch: z.string().min(1),
  subjectCode: z.string().min(1),
  academicYear: z.string().optional(),
  semester: z.string().optional(),
  period: z.enum([...gradePeriods, 'all']).optional(),
  note: z.string().max(2000).optional(),
  performedBy: z.string().optional(),
  rows: z.array(z.object({
    studentUsername: z.string().min(1),
    grades: z.partialRecord(z.enum(gradePeriods), z.object({
      previous: z.string(),
      value: z.string().refine(validGrade, 'Use a grade from 0 to 100 or INC.'),
    })),
  })).min(1).optional(),
}).superRefine(({ academicYear, semester, period, rows }, ctx) => {
  if (!rows) return
  const students = new Set(rows.map(row => row.studentUsername))
  if (academicYear === undefined || semester === undefined || students.size !== rows.length
    || rows.some(row => {
      const selected = Object.keys(row.grades)
      return !selected.length || (period && period !== 'all' && (selected.length !== 1 || selected[0] !== period))
    })) {
    ctx.addIssue({ code: 'custom', path: ['rows'], message: 'Select each student once, with a term and the periods to submit.' })
  }
})

export async function POST(request: NextRequest) {
  try {
    const { branch, subjectCode, academicYear, semester, period, note, performedBy, rows } = await parseBody(request, gradeSubmitSchema)
    const term = { academicYear: academicYear ?? '', semester: semester ?? '' }
    const { ctx, scope } = await requireCan(request, { kind: 'grade.submit', subjectCode, term, branch }, 'submit', { claimedIdentity: performedBy })
    const selectedPeriods = period && period !== 'all' ? [period] : gradePeriods
    const requested = rows && new Map(rows.map(row => [row.studentUsername, row.grades]))
    const col = await getCollection<MongoSubject>('subjects')
    const scoped = scope.subjectRows(subjectCode, term)
    const query = requested ? {
      ...scoped,
      // The grade sheet represents missing legacy term fields as blank.
      academicYear: term.academicYear || { $in: ['', null] },
      semester: term.semester || { $in: ['', null] },
      studentUsername: { $in: [...requested.keys()] },
    } : scoped
    const records = await col.find(query).toArray()
    const matchingCounts = new Map<string, number>()
    if (requested) {
      for (const row of records) matchingCounts.set(row.studentUsername, (matchingCounts.get(row.studentUsername) ?? 0) + 1)
    }
    const results: SubmittedGradeRow[] = []
    let writeWarning: string | undefined

    for (const row of records) {
      if (requested && matchingCounts.get(row.studentUsername) !== 1) continue
      const submitted = requested?.get(row.studentUsername)
      const intended = submitted ? selectedPeriods.filter(item => submitted[item]) : selectedPeriods
      const eligible = intended.filter(item => {
        const status = gradePeriodStatus(row, item)
        return submitted ? !status || status === 'draft' : status === 'draft'
      })
      if (!eligible.length || (submitted && (eligible.length !== intended.length
        || eligible.some(item => submitted[item]?.previous !== (row[item] ?? ''))))) continue

      const grades: SubmittedGradeRow['grades'] = {}
      const statuses: SubmittedGradeRow['statuses'] = {}
      const legacy = gradePeriods.every(item => row[gradeStatusKeys[item]] == null)
      if (legacy) {
        for (const item of gradePeriods) statuses[gradeStatusKeys[item]] = row.gradeStatus ?? ''
      }
      for (const item of eligible) {
        const input = submitted?.[item]
        if (input) grades[item] = input.value.trim().toUpperCase()
        statuses[gradeStatusKeys[item]] = 'submitted'
      }
      const gradeChanged = eligible.some(item => grades[item] !== undefined && grades[item] !== row[item])
      const final = gradeChanged && computedFinalINCasZero(
        grades.prelim ?? row.prelim, grades.midterm ?? row.midterm, grades.finals ?? row.finals,
      )
      const finalGrade = final || row.finalGrade || ''
      const remarks = final ? remarksFor(final) : row.remarks || ''
      const performedAt = new Date()
      const events = eligible.map((item): MongoGradeAudit & { _id: string } => ({
        _id: randomUUID(),
        branch, studentUsername: row.studentUsername, subjectCode: row.code,
        academicYear: row.academicYear ?? '', semester: row.semester ?? '',
        period: item, oldValue: row[item] || '', newValue: grades[item] ?? row[item] ?? '',
        action: 'submit', performedBy: ctx.actor.username, performedAt, note,
      }))
      try {
        const result = await col.updateOne({
          ...query, _id: row._id,
          prelim: row.prelim ?? null, midterm: row.midterm ?? null, finals: row.finals ?? null,
          prelimStatus: row.prelimStatus ?? null, midtermStatus: row.midtermStatus ?? null, finalsStatus: row.finalsStatus ?? null,
          gradeStatus: row.gradeStatus ?? null,
        }, {
          $set: { ...grades, ...statuses, gradeStatus: 'submitted', ...(final ? { finalGrade, remarks, finalGradeScale: 'percentage' } : {}) },
          $push: { pendingReleaseAudits: { $each: events } },
        })
        if (result.modifiedCount) results.push({ studentUsername: row.studentUsername, grades, statuses, finalGrade, remarks })
      } catch (error) {
        console.error('Grade submit write could not be confirmed.')
        writeWarning = 'Some grade updates could not be confirmed. Refresh the grade sheet before retrying.'
        break
      }
    }

    let auditWarning: string | undefined
    try {
      await exportPendingGradeAudits({ ...query })
    } catch (error) {
      console.error('Grade submit audit export pending.')
      auditWarning = 'Grade history was saved with the grade. Export to the audit collection is pending.'
    }
    return NextResponse.json({
      ok: true,
      message: `${results.length} grade record(s) submitted for approval.`,
      modifiedCount: results.length,
      results,
      ...(auditWarning && { auditWarning }),
      ...(writeWarning && { writeWarning }),
    })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Grade submit error.')
    return NextResponse.json({ ok: false, error: 'Failed to submit grades.' }, { status: 500 })
  }
}
