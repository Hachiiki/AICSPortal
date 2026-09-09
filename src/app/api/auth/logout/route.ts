import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/session'

// POST /api/auth/logout — clears the session cookie.
export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(clearSessionCookie())
  return res
}
