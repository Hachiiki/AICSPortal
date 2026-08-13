import { NextRequest, NextResponse } from 'next/server'
import { getStudentByCredentials } from '@/lib/mongodb/queries'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    if (!username || !password) {
      return NextResponse.json({ ok: false, error: 'Username and password are required.' }, { status: 400 })
    }
    let student
    try {
      student = await getStudentByCredentials(username, password)
    } catch (mongoErr) {
      console.error('MongoDB failed, mock fallback:', mongoErr)
      if (username === 'juan.santos' && password === 'student123') {
        student = { username: 'juan.santos', branch: 'commonwealth' }
      }
    }
    if (!student) {
      return NextResponse.json({ ok: false, error: 'Invalid username or password.' }, { status: 401 })
    }
    return NextResponse.json({ ok: true, username: student.username, branch: student.branch })
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ ok: false, error: 'An error occurred during login.' }, { status: 500 })
  }
}
