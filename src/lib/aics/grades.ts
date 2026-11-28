import type { GradePeriodStatus, MongoSubject } from '@/lib/mongodb/types'

// INC = 0 for finalGrade math (per user decision)
export function computedFinalINCasZero(pre: string, mid: string, fin: string): string {
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

export function remarksFor(final: string): string {
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

export const gradePeriods = ['prelim', 'midterm', 'finals'] as const
export const gradeStatusKeys = { prelim: 'prelimStatus', midterm: 'midtermStatus', finals: 'finalsStatus' } as const
export type GradePeriod = (typeof gradePeriods)[number]

export function validGrade(value: string): boolean {
  return value.toUpperCase() === 'INC' || /^(100(\.0{1,2})?|[0-9]{1,2}(\.\d{1,2})?)$/.test(value.trim())
}

export type GradeSubmission = {
  studentUsername: string
  grades: Partial<Record<GradePeriod, { previous: string; value: string }>>
}

export type SubmittedGradeRow = {
  studentUsername: string
  grades: Partial<Record<GradePeriod, string>>
  statuses: Partial<Record<(typeof gradeStatusKeys)[GradePeriod], GradePeriodStatus>>
  finalGrade: string
  remarks: string
}
export function acknowledgeDraftGrade(
  row: Record<GradePeriod, string> & { original: Record<GradePeriod | 'finalGrade', string> },
  period: GradePeriod,
  submittedValue: string,
  finalGrade?: string,
) {
  const original = {
    ...row.original,
    [period]: submittedValue,
    finalGrade: finalGrade ?? row.original.finalGrade,
  }
  return { original, dirty: gradePeriods.some((field) => row[field] !== original[field]) }
}

type GradeStatuses = Pick<MongoSubject, 'prelimStatus' | 'midtermStatus' | 'finalsStatus' | 'gradeStatus'>

export function gradePeriodStatus(row: GradeStatuses, period: GradePeriod): GradePeriodStatus | undefined {
  const hasPeriodStatuses = gradePeriods.some((item) => row[gradeStatusKeys[item]] != null)
  return hasPeriodStatuses ? row[gradeStatusKeys[period]] : row.gradeStatus
}

export function isFinalGradeReleased(row: GradeStatuses): boolean {
  return gradePeriods.every((period) => gradePeriodStatus(row, period) === 'released')
}

// Older rows have no scale stamp. Period grades above 5 identify a
// percentage record even when an incomplete quarter lowers the final.
export function releasedGradeAverages(rows: MongoSubject[]): { gpa: number | null; percentage: number | null } {
  let gpaUnits = 0
  let weightedGpa = 0
  let percentageUnits = 0
  let weightedPercentage = 0
  for (const row of rows) {
    if (!isFinalGradeReleased(row) || !Number.isFinite(row.units) || row.units <= 0) continue
    const value = String(row.finalGrade ?? '').trim()
    if (!value) continue
    const grade = Number(value)
    if (!Number.isFinite(grade) || grade < 0 || grade > 100) continue
    const isPercentage = row.finalGradeScale === 'percentage'
      || grade > 5 || gradePeriods.some((period) => Number(row[period]) > 5)
    if (isPercentage) {
      percentageUnits += row.units
      weightedPercentage += grade * row.units
    } else if (grade >= 1) {
      gpaUnits += row.units
      weightedGpa += grade * row.units
    }
  }
  return {
    gpa: gpaUnits ? weightedGpa / gpaUnits : null,
    percentage: percentageUnits ? weightedPercentage / percentageUnits : null,
  }
}
