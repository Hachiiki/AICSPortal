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

const periods = ['prelim', 'midterm', 'finals'] as const
const statusKeys = { prelim: 'prelimStatus', midterm: 'midtermStatus', finals: 'finalsStatus' } as const
type GradePeriod = (typeof periods)[number]
type GradeStatuses = Pick<MongoSubject, 'prelimStatus' | 'midtermStatus' | 'finalsStatus' | 'gradeStatus'>

export function gradePeriodStatus(row: GradeStatuses, period: GradePeriod): GradePeriodStatus | undefined {
  const hasPeriodStatuses = periods.some((item) => row[statusKeys[item]] != null)
  return hasPeriodStatuses ? row[statusKeys[period]] : row.gradeStatus
}

export function isFinalGradeReleased(row: GradeStatuses): boolean {
  return periods.every((period) => gradePeriodStatus(row, period) === 'released')
}

// Older rows have no scale stamp. Period grades above 5 identify a
// percentage record even when an incomplete quarter lowers the final.
export function releasedGradeAverages(rows: MongoSubject[]): { gpa: number | null; percentage: number | null } {
  let gpaUnits = 0
  let weightedGpa = 0
  let percentageUnits = 0
  let weightedPercentage = 0
  for (const row of rows) {
    if (!isFinalGradeReleased(row) || !row.finalGrade?.trim() || !(row.units > 0)) continue
    const grade = Number(row.finalGrade)
    if (!Number.isFinite(grade) || grade < 0 || grade > 100) continue
    const isPercentage = row.finalGradeScale === 'percentage'
      || grade > 5 || periods.some((period) => Number(row[period]) > 5)
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
