import { randomUUID } from 'node:crypto'
import type { MongoGradeAudit, MongoSubject } from '@/lib/mongodb/types'

export type PendingGradeRelease = MongoGradeAudit & { _id: string }

export function gradeReleaseAudit(
  row: MongoSubject,
  period: PendingGradeRelease['period'],
  action: 'release' | 'unrelease',
  performedBy: string,
  performedAt: Date,
): PendingGradeRelease {
  const value = period === 'all' || period === 'finalGrade' ? '' : row[period] ?? ''
  return {
    _id: randomUUID(),
    branch: row.branch,
    studentUsername: row.studentUsername,
    subjectCode: row.code,
    academicYear: row.academicYear ?? '',
    semester: row.semester ?? '',
    period,
    action,
    oldValue: action === 'unrelease' ? 'released' : value,
    newValue: action === 'unrelease' ? 'submitted' : value,
    performedBy,
    performedAt,
  }
}
