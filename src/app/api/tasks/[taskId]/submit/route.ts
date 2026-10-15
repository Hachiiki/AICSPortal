import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { submitTask } from '@/lib/mongodb/queries'
import { getAuthedSession as getSession } from '@/lib/session-auth'
import { parseQuery, errResponse, objectIdSchema } from '@/lib/validation'
import { HttpError } from '@/lib/http'

const submitQuerySchema = z.object({
  username: z.string().optional(),
})

// TEACHER CONTROL: Teachers can close submissions per task
// (task.submissionsClosed = true). Once closed, students
// can no longer submit; unsubmitted work displays as
// "Missing". "Overdue" only applies while submissions are
// still open past the due date.
//
// This endpoint enforces the rule server-side: any PATCH
// against a task with submissionsClosed=true is rejected
// with HTTP 403. The UI hides the submit button as well,
// but this is the authoritative guard — direct API calls
// also get blocked here.
//
// PATCH /api/tasks/[taskId]/submit?username=juan.santos
// Sets submitted=true, submittedAt=now for the given task.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params
    // Phase 6 (closes BUG-004 cross-user submit): only the session user may submit their own tasks.
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    // Route params are always strings; reject non-ObjectId shapes before ObjectId().
    const parsedId = objectIdSchema.safeParse(taskId)
    if (!parsedId.success) {
      return NextResponse.json({ ok: false, error: 'Task not found.' }, { status: 404 })
    }
    const username = parseQuery(request, submitQuerySchema).username || session.username

    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
    }
    if (username !== session.username) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }

    const result = await submitTask(parsedId.data, username)

    if (!result.ok) {
      if (result.reason === 'closed') {
        return NextResponse.json(
          { ok: false, error: 'Submissions for this task are closed.' },
          { status: 403 }
        )
      }
      return NextResponse.json(
        { ok: false, error: 'Task not found or already submitted.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ ok: true, message: 'Task submitted successfully.' })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Submit task error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to submit task.' }, { status: 500 })
  }
}
