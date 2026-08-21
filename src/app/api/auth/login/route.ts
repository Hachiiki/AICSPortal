import { NextRequest, NextResponse } from 'next/server'
import { getStudentByCredentials } from '@/lib/mongodb/queries'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    if (!username || !password) {
      return NextResponse.json({ ok: false, error: 'Username and password are required.' }, { status: 400 })
    }
    const student = await getStudentByCredentials(username, password)
    if (!student) {
      return NextResponse.json({ ok: false, error: 'Invalid username or password.' }, { status: 401 })
    }
    return NextResponse.json({
      ok: true,
      username: student.username,
      branch: student.branch,
      role: student.role || 'student',
    })
  } catch (err) {
    console.error('Login error:', err)
    // Don't leak internal errors to the client. If MongoDB is down, the
    // student sees a generic auth-failure message rather than a 500 stack.
    return NextResponse.json({ ok: false, error: 'Unable to reach the authentication service. Please try again.' }, { status: 503 })
  }
}
