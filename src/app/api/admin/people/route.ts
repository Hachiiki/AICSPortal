import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/connection'
import { requireCan } from '@/lib/authz'
import { errResponse } from '@/lib/validation'
import { HttpError } from '@/lib/http'
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
    // C2.1: session + admin-role gate centralized (admin.directory read,
    // school-wide by design per D1; issue #78 registry row).
    await requireCan(request, { kind: 'admin.directory' }, 'read')

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
    if (err instanceof HttpError) return errResponse(err)
    console.error('Admin people API error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to load directory.' }, { status: 500 })
  }
}
