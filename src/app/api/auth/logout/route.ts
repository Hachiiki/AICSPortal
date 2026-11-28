import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookie, getSession, sessionVersionFilter } from '@/lib/session'
import { getCollection } from '@/lib/mongodb/connection'

export async function POST(request: NextRequest) {
  let revoked = true
  try {
    const session = await getSession(request)
    if (session) {
      const students = await getCollection('students')
      await students.updateOne(
        { username: session.username, branch: session.branch, ...sessionVersionFilter(session.tv) },
        { $set: { tokenVersion: session.tv + 1 } },
      )
    }
  } catch {
    revoked = false
    console.error('Logout revocation failed.')
  }

  const response = revoked
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ ok: false, error: 'Signed out here, but session revocation could not be confirmed.' }, { status: 503 })
  response.cookies.set(clearSessionCookie())
  return response
}
