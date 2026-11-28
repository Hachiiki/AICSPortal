import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { getCollection } from '@/lib/mongodb/connection'
import { requireCan } from '@/lib/authz'
import { parseBody, errResponse } from '@/lib/validation'
import { HttpError } from '@/lib/http'
import type { MongoEnrollment, MongoStudent } from '@/lib/mongodb/types'

// ============================================================
//  /api/admin/enrollment — registrar management surface
//
//  GET    list enrollment records (school-wide read, joined with
//         student identity) + count of students without records
//  PATCH  override the step tracker: { id, currentStep }
//         statuses recomputed (completed < current < upcoming)
//  POST   post a payment: { id, amount, date?, note? }
//         aggregates + a payments[] audit trail entry
//
//  Reads are school-wide (oversight, matches the dashboard); writes
//  are branch-scoped to the admin's OWN branch, same as every other
//  admin write endpoint. Identity always comes from the session.
// ============================================================

// ---- Zod input schemas (the only place registrar input is shaped) ----

const enrollmentOverrideSchema = z.object({
  id: z.string({ error: 'Enrollment record id is required.' }).min(1),
  currentStep: z
    .number({ error: 'currentStep must be a whole number.' })
    .int({ message: 'currentStep must be a whole number.' })
    .positive({ message: 'currentStep must be a whole number.' }),
})

const paymentPostSchema = z.object({
  id: z.string({ error: 'Enrollment record id is required.' }).min(1),
  amount: z
    .number({ error: 'Amount must be greater than zero.' })
    .finite({ message: 'Amount must be greater than zero.' })
    .positive({ message: 'Amount must be greater than zero.' }),
  date: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z
      .string()
      .refine((v) => !isNaN(new Date(v).getTime()), { message: 'Invalid payment date.' })
      .optional()
  ),
  note: z.string().trim().max(200, { message: 'Note must be at most 200 characters.' }).optional(),
})

function toCentavos(amount: number): number {
  return Math.round(amount * 100)
}

// ------------------------------------------------------------
// GET /api/admin/enrollment
// ------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    // C2.1: session + admin-role gate centralized (admin.enrollment read,
    // school-wide by design per D1).
    await requireCan(request, { kind: 'admin.enrollment' }, 'read')

    // getCollection<T> returns `any` (see connection.ts), so a typed
    // helper keeps the Promise.all tuple inference intact downstream.
    async function fetchAll<T>(name: string, filter: Record<string, unknown>): Promise<T[]> {
      const col = await getCollection<T>(name)
      return col.find(filter).toArray()
    }

    const [enrollments, students] = await Promise.all([
      fetchAll<MongoEnrollment>('enrollments', {}),
      fetchAll<MongoStudent>('students', { role: 'student' }),
    ])

    // Only the directory fields below are ever serialized back —
    // passwords and tokenVersion never leave this handler.
    const studentsByUsername = new Map(students.map((s) => [s.username, s]))

    const records = enrollments.map((e) => {
      const student = studentsByUsername.get(e.studentUsername)
      return {
        _id: e._id?.toString() ?? '',
        branch: e.branch,
        studentUsername: e.studentUsername,
        academicYear: e.academicYear,
        semester: e.semester,
        currentStep: e.currentStep,
        steps: (e.steps ?? []).map((s) => ({ step: s.step, label: s.label, description: s.description, status: s.status, date: s.date })),
        assessment: {
          totalAssessment: e.assessment?.totalAssessment ?? 0,
          amountPaid: e.assessment?.amountPaid ?? 0,
          balance: e.assessment?.balance ?? 0,
          paymentStatus: e.assessment?.paymentStatus ?? 'unpaid',
          paymentDeadline: e.assessment?.paymentDeadline ?? null,
          paymentDate: e.assessment?.paymentDate ?? null,
        },
        payments: (e.payments ?? []).map((p) => ({ amount: p.amount, date: p.date, postedBy: p.postedBy, note: p.note ?? null })),
        student: student
          ? {
              fullName: student.fullName,
              studentNumber: student.studentNumber ?? '',
              programShort: student.programShort ?? '',
              yearLevel: student.yearLevel ?? '',
              section: student.section ?? '',
              enrollmentStatus: student.enrollmentStatus ?? '',
            }
          : null,
      }
    })

    // Students without an enrollment record — the registrar's to-do
    // gap. Counted per branch so the number stays meaningful when
    // more branches come online.
    const withRecords = new Set(enrollments.map((e) => e.studentUsername))
    const withoutRecords = students.filter((s) => !withRecords.has(s.username)).length

    records.sort((a, b) =>
      a.branch.localeCompare(b.branch) || a.studentUsername.localeCompare(b.studentUsername)
    )

    return NextResponse.json({
      ok: true,
      records,
      withoutRecords,
    })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Admin enrollment list error.')
    return NextResponse.json({ ok: false, error: 'Failed to load enrollment records.' }, { status: 500 })
  }
}

// ------------------------------------------------------------
// PATCH /api/admin/enrollment — override the step tracker
// Body: { id, currentStep }
// ------------------------------------------------------------
export async function PATCH(request: NextRequest) {
  try {
    const { scope } = await requireCan(request, { kind: 'admin.enrollment' }, 'update')
    const { id, currentStep } = await parseBody(request, enrollmentOverrideSchema)
    let idFilter: ObjectId
    try {
      idFilter = new ObjectId(id)
    } catch {
      return NextResponse.json({ ok: false, error: 'Enrollment record not found.' }, { status: 404 })
    }

    const target = { _id: idFilter, ...scope.branchDocs() }
    const col = await getCollection<MongoEnrollment>('enrollments')
    const existing = await col.findOne(target)
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Enrollment record not found.' }, { status: 404 })
    }

    const stepCount = (existing.steps ?? []).length
    if (currentStep > stepCount) {
      return NextResponse.json({ ok: false, error: `currentStep must be 1-${stepCount}.` }, { status: 400 })
    }

    // Override semantics: steps before the cursor are completed, the
    // cursor step is current, the rest are upcoming — same shape the
    // student tracker renders.
    const steps = (existing.steps ?? []).map((s) => ({
      ...s,
      status: (s.step < currentStep ? 'completed' : s.step === currentStep ? 'current' : 'upcoming') as typeof s.status,
    }))

    const result = await col.updateOne(target, { $set: { currentStep, steps } })
    if (result.matchedCount !== 1) {
      return NextResponse.json({ ok: false, error: 'Enrollment record not found.' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, message: `Step tracker set to ${currentStep} of ${stepCount}.` })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Admin enrollment override error.')
    return NextResponse.json({ ok: false, error: 'Failed to override step tracker.' }, { status: 500 })
  }
}

// ------------------------------------------------------------
// POST /api/admin/enrollment — post a payment
// Body: { id, amount, date?, note? }
// ------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const { ctx: { actor }, scope } = await requireCan(request, { kind: 'admin.enrollment' }, 'create')
    const { id, amount, date, note } = await parseBody(request, paymentPostSchema)
    const payment = toCentavos(amount)
    if (!Number.isSafeInteger(payment) || payment < 1 || payment / 100 !== amount) {
      return NextResponse.json(
        { ok: false, error: 'Enter a payment amount with at most two decimal places.' },
        { status: 400 }
      )
    }
    let idFilter: ObjectId
    try {
      idFilter = new ObjectId(id)
    } catch {
      return NextResponse.json({ ok: false, error: 'Enrollment record not found.' }, { status: 404 })
    }

    const receivedAt = date ?? new Date().toISOString().slice(0, 10)
    const target = { _id: idFilter, ...scope.branchDocs() }
    const col = await getCollection<MongoEnrollment>('enrollments')
    let current: MongoEnrollment | null = await col.findOne(target)
    for (let attempt = 0; attempt < 4; attempt++) {
      if (!current) {
        return NextResponse.json({ ok: false, error: 'Enrollment record not found.' }, { status: 404 })
      }
      const assessment = current.assessment
      const total = toCentavos(assessment?.totalAssessment ?? 0)
      const paid = toCentavos(assessment?.amountPaid ?? 0)
      if (!Number.isSafeInteger(total) || !Number.isSafeInteger(paid) || total < 0 || paid < 0) {
        throw new HttpError(409, 'The stored assessment needs reconciliation before posting payments.')
      }
      const outstanding = Math.max(0, total - paid)
      if (payment > outstanding) {
        throw new HttpError(400, `Payment exceeds the remaining balance of ${(outstanding / 100).toFixed(2)}.`)
      }

      const newPaid = paid + payment
      const newBalance = (total - newPaid) / 100
      const paymentStatus = newBalance === 0 ? 'paid' : 'partial'
      const result = await col.updateOne(
        {
          ...target,
          'assessment.totalAssessment': assessment?.totalAssessment ?? null,
          'assessment.amountPaid': assessment?.amountPaid ?? null,
        },
        {
          $set: {
            'assessment.amountPaid': newPaid / 100,
            'assessment.balance': newBalance,
            'assessment.paymentStatus': paymentStatus,
            'assessment.paymentDate': newBalance === 0 ? receivedAt : assessment?.paymentDate ?? null,
          },
          $push: { payments: { amount, date: receivedAt, postedBy: actor.username, note: note || undefined } },
        }
      )
      if (result.matchedCount === 1) {
        return NextResponse.json({
          ok: true,
          message: `Payment posted. Remaining balance ${newBalance.toFixed(2)}.`,
          balance: newBalance,
          paymentStatus,
        })
      }
      current = await col.findOne(target)
    }
    throw new HttpError(409, 'The assessment changed while posting payment. Refresh and try again.')
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Admin payment post error.')
    return NextResponse.json({ ok: false, error: 'Failed to post payment.' }, { status: 500 })
  }
}
