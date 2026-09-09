import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/connection'
import { getStudentByUsername } from '@/lib/mongodb/queries'

export async function GET(request: NextRequest) {
  try {
    // BUG-007: audit trail was fully public. Require a faculty/admin username
    // (caller-supplied until sessions land — BUG-009) + branch scoping.
    const username = request.nextUrl.searchParams.get('username')
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    const performer = await getStudentByUsername(username)
    if (!performer || (performer.role !== 'faculty' && performer.role !== 'admin')) {
      return NextResponse.json({ ok: false, error: 'Unauthorized: faculty or admin only' }, { status: 403 })
    }
    const branch = request.nextUrl.searchParams.get('branch')
    // Branch must match the performer's branch; cross-branch reads rejected.
    if (branch && branch !== performer.branch) {
      return NextResponse.json({ ok: false, error: 'Branch mismatch' }, { status: 403 })
    }
    const subjectCode = request.nextUrl.searchParams.get('subjectCode')
    const studentUsername = request.nextUrl.searchParams.get('studentUsername')
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '50', 10), 200)

    const query: any = { branch: performer.branch }
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
