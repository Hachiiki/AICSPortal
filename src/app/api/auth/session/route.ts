import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

// GET /api/auth/session — returns the current session claims or 401.
// The client calls this on load instead of reading localStorage flags.
export async function GET(request: NextRequest) {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ ok: true, ...session })
}
