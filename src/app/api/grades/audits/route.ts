import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/connection'

export async function GET(request: NextRequest) {
  try {
    const branch = request.nextUrl.searchParams.get('branch')
    const subjectCode = request.nextUrl.searchParams.get('subjectCode')
    const studentUsername = request.nextUrl.searchParams.get('studentUsername')
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '50', 10), 200)

    const query: any = {}
    if (branch) query.branch = branch
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
