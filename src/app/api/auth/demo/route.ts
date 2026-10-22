import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/connection'
import { sessionCookie, signSession } from '@/lib/session'
import { getAppEnv } from '@/lib/env'

// POST /api/auth/demo — dev-only one-click login for local development.
// Issues a real session for the seeded demo student WITHOUT any password
// in the client bundle (BUG-012 full fix). Returns 404 outside development.
// FIX-L5 (C3.12, issue #69): the gate reads the env.ts classification
// (APP_ENV > VERCEL_ENV > NODE_ENV), not NODE_ENV alone — an
// APP_ENV=production deployment that happens to run with
// NODE_ENV=development no longer exposes the demo login.
export async function POST() {
  if (getAppEnv() !== 'development') {
    return NextResponse.json({ ok: false, error: 'Not found.' }, { status: 404 })
  }
  const col = await getCollection('students')
  const demo = await col.findOne({ username: 'juan.santos' })
  if (!demo) {
    return NextResponse.json({ ok: false, error: 'Demo account not seeded.' }, { status: 404 })
  }
  const role = demo.role || 'student'
  const tv = typeof demo.tokenVersion === 'number' ? demo.tokenVersion : 0
  const token = await signSession({ username: demo.username, role, branch: demo.branch, tv })
  const res = NextResponse.json({ ok: true, username: demo.username, branch: demo.branch, role })
  res.cookies.set(sessionCookie(token))
  return res
}
