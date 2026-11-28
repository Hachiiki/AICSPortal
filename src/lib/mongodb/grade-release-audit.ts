import { randomUUID } from 'node:crypto'
import { getCollection } from './connection'
import type { MongoGradeAudit, MongoSubject } from '@/lib/mongodb/types'

export type PendingGradeRelease = MongoGradeAudit & { _id: string }
export const pendingAuditFilter = { 'pendingReleaseAudits.0': { $exists: true } }

export async function exportPendingGradeAudits(query: { branch: string; [field: string]: unknown }) {
  const subjects = await getCollection<MongoSubject>('subjects')
  const pending: MongoSubject[] = await subjects.find({ ...query, ...pendingAuditFilter })
    .project({ pendingReleaseAudits: 1 })
    .toArray()
  if (!pending.length) return
  const audits = await getCollection<MongoGradeAudit>('grade_audits')
  for (const row of pending) {
    const events = row.pendingReleaseAudits ?? []
    if (!events.length) continue
    await audits.bulkWrite(events.map((event) => ({
      updateOne: {
        filter: { _id: event._id, branch: query.branch },
        update: { $setOnInsert: event },
        upsert: true,
      },
    })), { ordered: false })
    await subjects.updateOne(
      { ...query, _id: row._id },
      { $pull: { pendingReleaseAudits: { _id: { $in: events.map((event) => event._id) } } } }
    )
  }
}

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
