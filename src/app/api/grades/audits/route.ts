import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/connection'
import { getSession } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    // Phase 6: audit trail belongs to the session faculty/admin, branch-forced.
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    if (session.role !== 'faculty' && session.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Unauthorized: faculty or admin only' }, { status: 403 })
    }
    // Legacy username param must match the session when supplied.
    const username = request.nextUrl.searchParams.get('username')
    if (username && username !== session.username) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }
    const branch = request.nextUrl.searchParams.get('branch')
    // Branch is forced to the session branch; cross-branch reads rejected.
    if (branch && branch !== session.branch) {
      return NextResponse.json({ ok: false, error: 'Branch mismatch' }, { status: 403 })
    }
    const subjectCode = request.nextUrl.searchParams.get('subjectCode')
    const studentUsername = request.nextUrl.searchParams.get('studentUsername')
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '50', 10), 200)

    const query: any = { branch: session.branch }
    if (subjectCode) query.subjectCode = subjectCode
    if (studentUsername) query.studentUsername = studentUsername

    const col = await getCollection('grade_audits')
    const audits = await col.find(query).sort({ performedAt: -1 }).limit(limit).toArray()

    return NextResponse.json({ ok: true, audits })
  } catch (err) {
    console.error('Grade audits error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to fetch audits.' }, { status: 500 })
  }
}
