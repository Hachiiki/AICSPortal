import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/connection'
import { sessionCookie, signSession } from '@/lib/session'

// POST /api/auth/demo — dev-only one-click login for local development.
// Issues a real session for the seeded demo student WITHOUT any password
// in the client bundle (BUG-012 full fix). Returns 404 outside development.
export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ ok: false, error: 'Not found.' }, { status: 404 })
  }
  const col = await getCollection('students')
  const demo = await col.findOne({ username: 'juan.santos' })
  if (!demo) {
    return NextResponse.json({ ok: false, error: 'Demo account not seeded.' }, { status: 404 })
  }
  const role = demo.role || 'student'
  const token = await signSession({ username: demo.username, role, branch: demo.branch })
  const res = NextResponse.json({ ok: true, username: demo.username, branch: demo.branch, role })
  res.cookies.set(sessionCookie(token))
  return res
}
