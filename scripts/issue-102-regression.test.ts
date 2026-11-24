import { beforeEach, expect, mock, setSystemTime, test } from 'bun:test'
import { computeStatus, type Task } from '../src/lib/aics/tasks'
import { isFinalGradeReleased, releasedGradeAverages } from '../src/lib/aics/grades'
import type { MongoSubject } from '../src/lib/mongodb/types'

const actor = { username: 'qa.staff', branch: 'qa-campus', role: 'faculty', fullName: 'QA Staff', academicYear: '2026-2027', semester: '1st Sem' }
const ctx = { actor, claims: { username: actor.username, branch: actor.branch, role: actor.role } }
const studentUsername = 'qa.student'
const subjectCode = 'QA 101'
const collection = new Map<string, any>()
const cursor = (rows: any[]) => ({ toArray: async () => structuredClone(rows), project() { return this }, sort() { return this } })

mock.module('next/server', () => ({ NextResponse: Response, NextRequest: Request }))
mock.module('mongodb', () => ({
  ObjectId: class {
    constructor(readonly value: string) {}
    toString() { return this.value }
  },
}))
mock.module('@/lib/authz', () => ({
  can: async () => ({ ok: true }),
  createRelations: () => ({}),
  decisionToHttpError: () => null,
  requireCan: async () => ({ ctx }),
  resolveContext: async () => ctx,
  professorOwnership: (professorUsername: string) => ({ professorUsername }),
}))
mock.module('@/lib/session', () => ({ spoofCheck: () => null }))
mock.module('@/lib/mongodb/connection', () => ({
  getCollection: async (name: string) => {
    if (!collection.has(name)) throw new Error('Missing test collection ' + name)
    return collection.get(name)
  },
}))
mock.module('@/lib/mongodb/queries', () => ({
  getStudentByUsername: async () => actor,
  getTasksForStudentCurrentTerm: async () => [],
}))
mock.module('@/lib/moderation', () => ({ moderateContent: async () => ({ ok: true }) }))

const { POST: pay } = await import('../src/app/api/admin/enrollment/route')
const { POST: saveAttendance } = await import('../src/app/api/attendance/route')
const { POST: releaseGrade } = await import('../src/app/api/grades/release/route')
const { POST: postTask, PATCH: toggleTask } = await import('../src/app/api/tasks/route')
const { GET: readFacultyTasks } = await import('../src/app/api/faculty/tasks/route')

function request(method: string, body?: unknown) {
  const req = new Request('http://localhost.invalid/', { method, body: body === undefined ? undefined : JSON.stringify(body) })
  return Object.assign(req, { nextUrl: new URL(req.url) }) as any
}

beforeEach(() => collection.clear())

function paymentFixture(totalAssessment: number, amountPaid = 0) {
  const assessment = { totalAssessment, amountPaid, balance: totalAssessment - amountPaid, paymentDate: null }
  const payments: { amount: number }[] = []
  collection.set('enrollments', {
    findOne: async () => ({ branch: actor.branch, assessment: { ...assessment } }),
    updateOne: async (filter: any, { $set, $push }: any) => {
      if (filter.branch !== actor.branch
        || filter['assessment.totalAssessment'] !== assessment.totalAssessment
        || filter['assessment.amountPaid'] !== assessment.amountPaid) return { matchedCount: 0 }
      assessment.amountPaid = $set['assessment.amountPaid']
      assessment.balance = $set['assessment.balance']
      payments.push($push.payments)
      return { matchedCount: 1 }
    },
  })
  return { assessment, payments }
}

test('an older fractional assessment settles at the exact centavo balance', async () => {
  const record = paymentFixture(0.30, 0.10)
  const response = await pay(request('POST', { id: '100000000000000000000001', amount: 0.20 }))
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ balance: 0, paymentStatus: 'paid' })
  expect(record.assessment.amountPaid).toBe(0.30)
  expect(record.payments).toHaveLength(1)
})

test('two valid payments can complete while keeping assessment totals and history in sync', async () => {
  const record = paymentFixture(100)
  const post = () => pay(request('POST', { id: '100000000000000000000001', amount: 50 }))
  const responses = await Promise.all([post(), post()])
  expect(responses.map((res) => res.status)).toEqual([200, 200])
  expect(record.payments.reduce((sum, row) => sum + row.amount, 0)).toBe(100)
  expect(record.assessment.amountPaid).toBe(100)
  expect(record.assessment.balance).toBe(0)
})

test('one attendance session can be created for a class and date', async () => {
  let saved: any = null
  collection.set('attendance', {
    findOne: async () => structuredClone(saved),
    insertOne: async (doc: any) => {
      if (saved && saved._id === doc._id) throw Object.assign(new Error('Duplicate session'), { code: 11000 })
      saved = doc
      return { acknowledged: true }
    },
  })
  collection.set('subjects', { find: () => cursor([{ studentUsername, academicYear: actor.academicYear, semester: actor.semester }]) })
  const initial = { branch: actor.branch, sectionKey: [subjectCode, actor.academicYear, actor.semester].join('|'), date: '2026-11-24', records: { [studentUsername]: 'present' } }
  const responses = await Promise.all([
    saveAttendance(request('POST', initial)),
    saveAttendance(request('POST', initial)),
  ])
  expect(responses.map(res => res.status).sort()).toEqual([200, 409])
  expect(saved.records).toEqual(initial.records)
  expect(saved.history).toBeUndefined()
  expect(saved.revision).toBeTruthy()
})

test('grade release saves its pending audit and can export it on a later request', async () => {
  let exportAvailable = false
  const exported = new Map<string, unknown>()
  const row = { _id: 'grade-row', branch: actor.branch, studentUsername, code: subjectCode, prelim: '80', prelimStatus: 'submitted', pendingReleaseAudits: [] as any[] }
  collection.set('subjects', {
    find: (query: any) => cursor(query['pendingReleaseAudits.0']
      ? (row.pendingReleaseAudits.length ? [row] : [])
      : row.prelimStatus === 'submitted' ? [row] : []),
    bulkWrite: async (ops: any[]) => {
      const { filter, update } = ops[0].updateOne
      expect(filter.prelimStatus).toBe('submitted')
      Object.assign(row, update.$set)
      row.pendingReleaseAudits.push(...update.$push.pendingReleaseAudits.$each)
      return { modifiedCount: 1 }
    },
    updateOne: async (_filter: unknown, update: any) => {
      row.pendingReleaseAudits = row.pendingReleaseAudits.filter(event => !update.$pull.pendingReleaseAudits._id.$in.includes(event._id))
      return { modifiedCount: 1 }
    },
  })
  collection.set('grade_audits', {
    bulkWrite: async (ops: any[]) => {
      if (!exportAvailable) throw new Error('Injected audit export interruption')
      for (const { updateOne } of ops) {
        const id = updateOne.filter._id
        if (!exported.has(id)) exported.set(id, updateOne.update.$setOnInsert)
      }
    },
  })
  const release = () => releaseGrade(request('POST', { branch: actor.branch, subjectCode, period: 'prelim' }))
  expect(await (await release()).json()).toMatchObject({ ok: true, modifiedCount: 1, auditWarning: expect.any(String) })
  expect(row.prelimStatus).toBe('released')
  expect(row.pendingReleaseAudits).toHaveLength(1)
  exportAvailable = true
  expect(await (await release()).json()).toMatchObject({ ok: true, modifiedCount: 0 })
  expect(row.pendingReleaseAudits).toHaveLength(0)
  expect(exported.size).toBe(1)
  await release()
  expect(exported.size).toBe(1)
})

test('same-titled assignments stay separate when faculty close one group', async () => {
  const tasks: any[] = []
  collection.set('subjects', { find: () => cursor([{ code: subjectCode, academicYear: actor.academicYear, semester: actor.semester, studentUsername }]) })
  collection.set('notifications', { insertMany: async () => ({}) })
  collection.set('tasks', {
    insertMany: async (rows: any[]) => { tasks.push(...rows); return { insertedCount: rows.length, insertedIds: {} } },
    find: () => cursor(tasks),
    updateMany: async (filter: any, { $set }: any) => {
      const matches = tasks.filter(task => task.assignmentId === filter.assignmentId)
      for (const task of matches) Object.assign(task, $set)
      return { matchedCount: matches.length, modifiedCount: matches.length }
    },
  })
  const base = { branch: actor.branch, subjectCode, title: 'Week four', dueDate: '2026-11-25', type: 'Quiz' }
  expect((await postTask(request('POST', { ...base, maxScore: 10 }))).ok).toBe(true)
  expect((await postTask(request('POST', { ...base, maxScore: 20 }))).ok).toBe(true)
  const { groups } = await (await readFacultyTasks(request('GET'))).json()
  expect(groups).toHaveLength(2)
  expect(new Set(groups.map((group: any) => group.assignmentId)).size).toBe(2)
  expect((await toggleTask(request('PATCH', { ...base, assignmentId: groups[0].assignmentId, submissionsClosed: true }))).ok).toBe(true)
  expect(tasks.map(task => task.submissionsClosed)).toEqual([true, false])
})

test('date-only tasks remain open through the selected Manila day', () => {
  const task = {
    dueDate: '2026-11-24T00:00:00.000Z', score: null, submitted: false, submissionsClosed: false,
  } as Task
  try {
    setSystemTime(new Date('2026-11-24T15:59:59.000Z'))
    expect(computeStatus(task).status).toBe('NEEDS_ATTENTION')
    setSystemTime(new Date('2026-11-24T16:00:00.000Z'))
    expect(computeStatus(task).sub).toBe('Overdue')
  } finally {
    setSystemTime()
  }
})

test('a partial release never enters the GPA and old and new grading scales stay separate', () => {
  const partiallyReleased = { gradeStatus: 'released', prelimStatus: 'released', finalsStatus: 'submitted', finalGrade: '92', units: 3 } as MongoSubject
  expect(isFinalGradeReleased(partiallyReleased)).toBe(false)
  const legacy = { gradeStatus: 'released', finalGrade: '1.75', units: 3 } as MongoSubject
  const percentage = { prelimStatus: 'released', midtermStatus: 'released', finalsStatus: 'released', prelim: '90', finalGrade: '91', units: 4 } as MongoSubject
  expect(releasedGradeAverages([partiallyReleased, legacy, percentage])).toEqual({ gpa: 1.75, percentage: 91 })
})
