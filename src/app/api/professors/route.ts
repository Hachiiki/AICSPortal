import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getStudentByUsername, getProfessors } from '@/lib/mongodb/queries'
import { getCollection } from '@/lib/mongodb/connection'
import { getAuthedSession as getSession } from '@/lib/session-auth'
import type { MongoProfessor } from '@/lib/mongodb/types'

// ADMIN CONTROL: Professor directory details (office
// hours, room, contact) are maintained by Admin. Students
// have read-only access.
//
// GET /api/professors?username=juan.santos
// Returns all professors for the student's branch. The client
// joins them with the student's current-term subjects by name.
export async function GET(request: NextRequest) {
  try {
    // Phase 6: branch directory reads require a session; username must be self.
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    const username = request.nextUrl.searchParams.get('username') || session.username
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
    }
    if (username !== session.username) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }

    const student = await getStudentByUsername(username)
    if (!student) {
      return NextResponse.json({ ok: false, error: 'Student not found.' }, { status: 404 })
    }

    const professors = await getProfessors(student.branch)

    const clientProfessors = professors.map((p) => ({
      _id: p._id?.toString() || '',
      name: p.name,
      email: p.email,
      officeHours: p.officeHours,
      room: p.room,
    }))

    return NextResponse.json({ ok: true, professors: clientProfessors })
  } catch (err) {
    console.error('Professors API error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to fetch professors.' }, { status: 500 })
  }
}

// ------------------------------------------------------------
// ADMIN CONTROL — professor directory writes (this branch only)
//
// POST /api/professors            { name, email, officeHours, room }
// PATCH /api/professors           { id, name?, email?, officeHours?, room? }
// DELETE /api/professors?id=...
//
// The professor `name` joins to subject.professor and `email` to
// subject.professorEmail — renaming a professor here does NOT
// rewrite subject rows, so the manage UI warns before a rename.
// ------------------------------------------------------------

async function requireAdmin(request: NextRequest) {
  const session = await getSession(request)
  if (!session) {
    return { error: NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 }) }
  }
  const performer = await getStudentByUsername(session.username)
  if (!performer || performer.role !== 'admin') {
    return { error: NextResponse.json({ ok: false, error: 'Unauthorized: admin only' }, { status: 403 }) }
  }
  return { performer }
}

interface ProfessorFields {
  name?: string
  email?: string
  officeHours?: string
  room?: string
}

/** Validate the mutable fields. Returns cleaned values or an error string. */
function validateFields(fields: ProfessorFields): { ok: true; values: Required<ProfessorFields> } | { ok: false; error: string } {
  const name = typeof fields.name === 'string' ? fields.name.trim() : undefined
  if (name !== undefined && (name.length === 0 || name.length > 120)) {
    return { ok: false, error: 'Name must be 1-120 characters.' }
  }
  const email = typeof fields.email === 'string' ? fields.email.trim() : undefined
  if (email !== undefined && (email.length === 0 || email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return { ok: false, error: 'Enter a valid email address.' }
  }
  const officeHours = typeof fields.officeHours === 'string' ? fields.officeHours.trim() : undefined
  if (officeHours !== undefined && officeHours.length > 120) {
    return { ok: false, error: 'Office hours must be at most 120 characters.' }
  }
  const room = typeof fields.room === 'string' ? fields.room.trim() : undefined
  if (room !== undefined && room.length > 120) {
    return { ok: false, error: 'Room must be at most 120 characters.' }
  }
  return { ok: true, values: { name: name ?? '', email: email ?? '', officeHours: officeHours ?? '', room: room ?? '' } }
}

// POST /api/professors (admin) — add a directory entry
export async function POST(request: NextRequest) {
  try {
    const gate = await requireAdmin(request)
    if ('error' in gate) return gate.error
    const { performer } = gate

    const fields = await request.json()
    const check = validateFields(fields)
    if (!check.ok) {
      return NextResponse.json({ ok: false, error: check.error }, { status: 400 })
    }
    if (!check.values.name || !check.values.email) {
      return NextResponse.json({ ok: false, error: 'Name and email are required.' }, { status: 400 })
    }

    const col = await getCollection<MongoProfessor>('professors')
    const doc: MongoProfessor = {
      branch: performer.branch,
      name: check.values.name,
      email: check.values.email,
      officeHours: check.values.officeHours || 'TBA',
      room: check.values.room || 'TBA',
    }
    try {
      const result = await col.insertOne(doc as any)
      return NextResponse.json({ ok: true, message: 'Professor added.', id: result.insertedId.toString() })
    } catch (err: any) {
      if (err?.code === 11000) {
        return NextResponse.json({ ok: false, error: 'A professor with that name already exists in this branch.' }, { status: 409 })
      }
      throw err
    }
  } catch (err) {
    console.error('Professor create error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to add professor.' }, { status: 500 })
  }
}

// PATCH /api/professors (admin) — edit a directory entry
export async function PATCH(request: NextRequest) {
  try {
    const gate = await requireAdmin(request)
    if ('error' in gate) return gate.error
    const { performer } = gate

    const { id, ...fields } = await request.json()
    let idFilter: ObjectId
    try {
      idFilter = new ObjectId(id)
    } catch {
      return NextResponse.json({ ok: false, error: 'Professor not found.' }, { status: 404 })
    }

    const check = validateFields(fields)
    if (!check.ok) {
      return NextResponse.json({ ok: false, error: check.error }, { status: 400 })
    }
    const update: Record<string, string> = {}
    if (fields.name !== undefined) update.name = check.values.name
    if (fields.email !== undefined) update.email = check.values.email
    if (fields.officeHours !== undefined) update.officeHours = check.values.officeHours || 'TBA'
    if (fields.room !== undefined) update.room = check.values.room || 'TBA'
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ ok: false, error: 'Nothing to update.' }, { status: 400 })
    }

    const col = await getCollection<MongoProfessor>('professors')
    let result
    try {
      result = await col.updateOne({ _id: idFilter, branch: performer.branch }, { $set: update })
    } catch (err: any) {
      if (err?.code === 11000) {
        return NextResponse.json({ ok: false, error: 'Another professor in this branch already uses that name.' }, { status: 409 })
      }
      throw err
    }
    if (result.matchedCount === 0) {
      return NextResponse.json({ ok: false, error: 'Professor not found.' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, message: 'Professor updated.' })
  } catch (err) {
    console.error('Professor update error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to update professor.' }, { status: 500 })
  }
}

// DELETE /api/professors?id=... (admin) — remove a directory entry.
// Subject rows keep their professor/professorEmail strings; only the
// directory card disappears from the student Professors page.
export async function DELETE(request: NextRequest) {
  try {
    const gate = await requireAdmin(request)
    if ('error' in gate) return gate.error
    const { performer } = gate

    const id = request.nextUrl.searchParams.get('id')
    let idFilter: ObjectId
    try {
      idFilter = new ObjectId(id ?? '')
    } catch {
      return NextResponse.json({ ok: false, error: 'Professor not found.' }, { status: 404 })
    }
    const col = await getCollection<MongoProfessor>('professors')
    const result = await col.deleteOne({ _id: idFilter, branch: performer.branch })
    if (result.deletedCount === 0) {
      return NextResponse.json({ ok: false, error: 'Professor not found.' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, message: 'Professor removed.' })
  } catch (err) {
    console.error('Professor delete error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to remove professor.' }, { status: 500 })
  }
}
