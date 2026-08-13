import { NextRequest, NextResponse } from 'next/server'
import { submitTask } from '@/lib/mongodb/queries'

// PATCH /api/tasks/[taskId]/submit?username=juan.santos
// Sets submitted=true, submittedAt=now for the given task.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params
    const username = request.nextUrl.searchParams.get('username')

    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
    }

    const success = await submitTask(taskId, username)

    if (!success) {
      return NextResponse.json({ ok: false, error: 'Task not found or already submitted.' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, message: 'Task submitted successfully.' })
  } catch (err) {
    console.error('Submit task error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to submit task.' }, { status: 500 })
  }
}
