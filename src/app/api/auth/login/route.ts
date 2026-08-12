import { NextRequest, NextResponse } from 'next/server'
import { getStudentByCredentials } from '@/lib/mongodb/queries'

// POST /api/auth/login
// Body: { username, password }
// Returns: { ok: true, username, branch } on success, { ok: false, error } on failure
export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { ok: false, error: 'Username and password are required.' },
        { status: 400 }
      )
    }

    const student = await getStudentByCredentials(username, password)

    if (!student) {
      return NextResponse.json(
        { ok: false, error: 'Invalid username or password.' },
        { status: 401 }
      )
    }

    // Return only the non-sensitive fields needed by the client
    return NextResponse.json({
      ok: true,
      username: student.username,
      branch: student.branch,
    })
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json(
      { ok: false, error: 'An error occurred during login.' },
      { status: 500 }
    )
  }
}
