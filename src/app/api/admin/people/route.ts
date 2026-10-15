import { NextRequest, NextResponse } from 'next/server'
import { getStudentByUsername } from '@/lib/mongodb/queries'
import { getCollection } from '@/lib/mongodb/connection'
import { getAuthedSession as getSession } from '@/lib/session-auth'
import type { MongoStudent } from '@/lib/mongodb/types'

// GET /api/admin/people
// Every student, faculty, and admin account across ALL branches —
// the admin "view everyone" directory. Admin-only.
//
// Read-only and school-wide by design (the branch overview on the
// dashboard needs cross-branch visibility); write endpoints elsewhere
// stay scoped to the admin's own branch.
//
// Passwords and tokenVersion are never selected out of the database.
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    const performer = await getStudentByUsername(session.username)
    if (!performer || performer.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Unauthorized: admin only' }, { status: 403 })
    }

    const col = await getCollection<MongoStudent>('students')
    const users = await col
      .find({})
      .project({
        password: 0,
        tokenVersion: 0,
      })
      .toArray()

    // Branch display names (from any user doc that carries one).
    const branchNames = new Map<string, string>()
    for (const u of users) {
      if (u.branch_name && !branchNames.has(u.branch)) branchNames.set(u.branch, u.branch_name)
    }

    const people = users
      .map((u) => ({
        username: u.username,
        fullName: u.fullName,
        role: u.role ?? 'student',
        branch: u.branch,
        branchName: branchNames.get(u.branch) ?? u.branch,
        studentNumber: u.studentNumber ?? '',
        programShort: u.programShort ?? '',
        program: u.program ?? '',
        yearLevel: u.yearLevel ?? '',
        section: u.section ?? '',
        enrollmentStatus: u.enrollmentStatus ?? '',
        email: u.email ?? '',
        gpa: u.gpa ?? '',
        deanLister: Boolean(u.deanLister),
        photoUrl: u.photoUrl ?? undefined,
      }))
      .sort((a, b) => {
        // Faculty first, then admins, then students; within a group,
        // branch then name — mirrors how a registrar scans a roster.
        const roleOrder = (r: string) => (r === 'faculty' ? 0 : r === 'admin' ? 1 : 2)
        return (
          roleOrder(a.role) - roleOrder(b.role) ||
          a.branch.localeCompare(b.branch) ||
          a.fullName.localeCompare(b.fullName)
        )
      })

    return NextResponse.json({
      ok: true,
      people,
      branches: Array.from(branchNames, ([branch, branchName]) => ({ branch, branchName })),
      counts: {
        total: people.length,
        students: people.filter((p) => p.role === 'student').length,
        faculty: people.filter((p) => p.role === 'faculty').length,
        admins: people.filter((p) => p.role === 'admin').length,
      },
    })
  } catch (err) {
    console.error('Admin people API error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to load directory.' }, { status: 500 })
  }
}
