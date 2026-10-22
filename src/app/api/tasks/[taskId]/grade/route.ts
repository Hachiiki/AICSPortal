import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { getCollection } from '@/lib/mongodb/connection'
import { spoofCheck } from '@/lib/session'
import { resolveContext, createRelations, can, decisionToHttpError } from '@/lib/authz'
import { parseBody, errResponse } from '@/lib/validation'
import { HttpError } from '@/lib/http'
import type { MongoTask } from '@/lib/mongodb/types'

// ============================================================
//  Task grading API — PATCH /api/tasks/[taskId]/grade
// ============================================================
//
//  Body: { score, feedback?, performedBy?, branch? }
//    score: number, 0..maxScore (required)
//    feedback: string up to 2000 chars, or null to clear (optional;
//      omitted leaves existing feedback untouched)
//  C2.4: faculty role + the current-term teaching-load check on the
//  FETCHED task's subject run in the task grade policy case (past-
//  term tasks stay gradeable under a current-term load, preserved);
//  the optional body-branch and fetched-task branch parity checks
//  stay route-kept, as today.
//
//  Decision (plan non-goal, refs #32): task scores do NOT write
//  grade_audits rows. Tasks are not grades; if score history is
//  wanted later, record that decision in #32 first.
// ============================================================

// ---- Zod input schemas (the only place grading input is shaped) ----

const taskGradeSchema = z.object({
  // BUG-010: score must be a real number before any range comparison.
  score: z
    .number({ error: 'Score must be a number.' })
    .finite({ message: 'Score must be a number.' }),
  // string ≤2000, or null to clear; omitted leaves existing feedback untouched.
  feedback: z
    .string({ error: 'Feedback must be text.' })
    .max(2000, { message: 'Feedback must be at most 2000 characters.' })
    .nullish(),
  // Legacy spoof-check field; identity always comes from the session.
  performedBy: z.string().optional(),
  // BUG-010: branch, when supplied, must be a string and match the session.
  branch: z.string().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params
    // C2.4: canonical actor first (the resource needs the fetched task).
    const ctx = await resolveContext(request)
    if (!ctx) throw new HttpError(401, 'Unauthorized')

    // BUG-010: taskId must be a plain string before it reaches ObjectId().
    if (typeof taskId !== 'string' || !taskId) {
      return NextResponse.json({ ok: false, error: 'Task id is required.' }, { status: 400 })
    }
    let oid: ObjectId
    try {
      oid = new ObjectId(taskId)
    } catch {
      return NextResponse.json({ ok: false, error: 'Task not found.' }, { status: 404 })
    }
    const { score, feedback, performedBy, branch } = await parseBody(request, taskGradeSchema)
    // Phase 6: grader is the session user; mismatched performedBy is a spoof attempt.
    const spoof = spoofCheck(ctx.claims, performedBy)
    if (spoof) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }
    // BUG-010: branch, when supplied, must match the session (route-kept).
    if (branch !== undefined && branch !== ctx.claims.branch) {
      return NextResponse.json({ ok: false, error: 'Branch mismatch' }, { status: 403 })
    }

    const col = await getCollection<MongoTask>('tasks')
    const task = (await col.findOne({ _id: oid } as any)) as MongoTask | null
    if (!task) {
      return NextResponse.json({ ok: false, error: 'Task not found.' }, { status: 404 })
    }
    if (task.branch !== ctx.claims.branch) {
      return NextResponse.json({ ok: false, error: 'Branch mismatch' }, { status: 403 })
    }
    // C2.4: faculty role + teaching load on the fetched task's subject
    // centralized (task grade).
    const gate = decisionToHttpError(
      await can(ctx, createRelations(ctx), { kind: 'task', taskId, subjectCode: task.subjectCode }, 'grade')
    )
    if (gate) throw gate

    const max = Number(task.maxScore)
    if (!isFinite(max) || max <= 0) {
      return NextResponse.json({ ok: false, error: 'Task has no valid max score.' }, { status: 400 })
    }
    if (score < 0 || score > max) {
      return NextResponse.json({ ok: false, error: `Score must be between 0 and ${max}.` }, { status: 400 })
    }

    const set: Record<string, unknown> = { score }
    if (typeof feedback === 'string') {
      set.feedback = feedback.trim().slice(0, 2000)
    } else if (feedback === null) {
      set.feedback = null
    }
    // Branch-scoped write: the filter re-asserts the tenant.
    const result = await col.updateOne({ _id: oid, branch: ctx.claims.branch } as any, { $set: set })
    if (result.matchedCount === 0) {
      return NextResponse.json({ ok: false, error: 'Task not found.' }, { status: 404 })
    }
    return NextResponse.json({
      ok: true,
      message: `Graded ${score} / ${max}.`,
      task: {
        _id: taskId,
        score,
        maxScore: max,
        feedback: set.feedback !== undefined ? set.feedback : task.feedback,
      },
    })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Task grade error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to grade task.' }, { status: 500 })
  }
}
