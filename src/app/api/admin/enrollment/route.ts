import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getStudentByUsername } from '@/lib/mongodb/queries'
import { getCollection } from '@/lib/mongodb/connection'
import { getAuthedSession as getSession } from '@/lib/session-auth'
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

async function requireAdmin(request: NextRequest) {
  const session = await getSession(request)
  if (!session) {
    return { error: NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 }) }
  }
  const performer = await getStudentByUsername(session.username)
  if (!performer || performer.role !== 'admin') {
    return { error: NextResponse.json({ ok: false, error: 'Unauthorized: admin only' }, { status: 403 }) }
  }
  return { performer }
}

// ------------------------------------------------------------
// GET /api/admin/enrollment
// ------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const gate = await requireAdmin(request)
    if ('error' in gate) return gate.error

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
    console.error('Admin enrollment list error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to load enrollment records.' }, { status: 500 })
  }
}

// ------------------------------------------------------------
// PATCH /api/admin/enrollment — override the step tracker
// Body: { id, currentStep }
// ------------------------------------------------------------
export async function PATCH(request: NextRequest) {
  try {
    const gate = await requireAdmin(request)
    if ('error' in gate) return gate.error
    const { performer } = gate

    const { id, currentStep } = await request.json()
    let idFilter: ObjectId
    try {
      idFilter = new ObjectId(id)
    } catch {
      return NextResponse.json({ ok: false, error: 'Enrollment record not found.' }, { status: 404 })
    }

    const col = await getCollection<MongoEnrollment>('enrollments')
    const existing = await col.findOne({ _id: idFilter })
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Enrollment record not found.' }, { status: 404 })
    }
    if (existing.branch !== performer.branch) {
      return NextResponse.json({ ok: false, error: 'This record belongs to another branch.' }, { status: 403 })
    }

    const stepCount = (existing.steps ?? []).length
    if (typeof currentStep !== 'number' || !Number.isInteger(currentStep) || currentStep < 1 || currentStep > stepCount) {
      return NextResponse.json({ ok: false, error: `currentStep must be 1-${stepCount}.` }, { status: 400 })
    }

    // Override semantics: steps before the cursor are completed, the
    // cursor step is current, the rest are upcoming — same shape the
    // student tracker renders.
    const steps = (existing.steps ?? []).map((s) => ({
      ...s,
      status: (s.step < currentStep ? 'completed' : s.step === currentStep ? 'current' : 'upcoming') as typeof s.status,
    }))

    await col.updateOne({ _id: idFilter }, { $set: { currentStep, steps } })
    return NextResponse.json({ ok: true, message: `Step tracker set to ${currentStep} of ${stepCount}.` })
  } catch (err) {
    console.error('Admin enrollment override error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to override step tracker.' }, { status: 500 })
  }
}

// ------------------------------------------------------------
// POST /api/admin/enrollment — post a payment
// Body: { id, amount, date?, note? }
// ------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const gate = await requireAdmin(request)
    if ('error' in gate) return gate.error
    const { performer } = gate

    const { id, amount, date, note } = await request.json()
    let idFilter: ObjectId
    try {
      idFilter = new ObjectId(id)
    } catch {
      return NextResponse.json({ ok: false, error: 'Enrollment record not found.' }, { status: 404 })
    }

    const col = await getCollection<MongoEnrollment>('enrollments')
    const existing = await col.findOne({ _id: idFilter })
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Enrollment record not found.' }, { status: 404 })
    }
    if (existing.branch !== performer.branch) {
      return NextResponse.json({ ok: false, error: 'This record belongs to another branch.' }, { status: 403 })
    }

    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: 'Amount must be greater than zero.' }, { status: 400 })
    }
    const totalAssessment = existing.assessment?.totalAssessment ?? 0
    const amountPaid = existing.assessment?.amountPaid ?? 0
    const balance = existing.assessment?.balance ?? totalAssessment - amountPaid
    if (amount > balance) {
      return NextResponse.json(
        { ok: false, error: `Payment exceeds the remaining balance of ${balance}.` },
        { status: 400 }
      )
    }

    let receivedAt: string
    if (date) {
      const parsed = new Date(date)
      if (isNaN(parsed.getTime())) {
        return NextResponse.json({ ok: false, error: 'Invalid payment date.' }, { status: 400 })
      }
      receivedAt = date
    } else {
      receivedAt = new Date().toISOString().slice(0, 10)
    }
    const safeNote = typeof note === 'string' ? note.trim().slice(0, 200) : undefined

    const newPaid = amountPaid + amount
    const newBalance = Math.max(0, totalAssessment - newPaid)
    const paymentStatus = newBalance === 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid'
    const paymentDate = newBalance === 0 ? receivedAt : existing.assessment?.paymentDate ?? null

    await col.updateOne(
      { _id: idFilter },
      {
        $set: {
          'assessment.amountPaid': newPaid,
          'assessment.balance': newBalance,
          'assessment.paymentStatus': paymentStatus,
          'assessment.paymentDate': paymentDate,
        },
        $push: {
          payments: { amount, date: receivedAt, postedBy: performer.username, note: safeNote },
        },
      }
    )
    return NextResponse.json({
      ok: true,
      message: `Payment posted. Remaining balance ${newBalance}.`,
      balance: newBalance,
      paymentStatus,
    })
  } catch (err) {
    console.error('Admin payment post error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to post payment.' }, { status: 500 })
  }
}
