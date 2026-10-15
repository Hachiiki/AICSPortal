import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { getStudentByUsername, getProfessors } from '@/lib/mongodb/queries'
import { getCollection } from '@/lib/mongodb/connection'
import { getAuthedSession as getSession } from '@/lib/session-auth'
import { parseBody, parseQuery, errResponse, idQuerySchema } from '@/lib/validation'
import { HttpError } from '@/lib/http'
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
    const username = parseQuery(request, professorsGetQuerySchema).username || session.username
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
    if (err instanceof HttpError) return errResponse(err)
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

// ---- Zod input schemas (the only place professor input is shaped) ----

const professorsGetQuerySchema = z.object({
  username: z.string().optional(),
})

/** Each mutable field: optional string, trimmed, ≤120 chars (empty after trim = clear). */
const professorField = (label: string) =>
  z
    .string({ error: `${label} must be at most 120 characters.` })
    .max(120, { message: `${label} must be at most 120 characters.` })
    .trim()
    .optional()
    .transform((v) => v ?? '')

const professorCreateSchema = z.object({
  name: professorField('Name'),
  email: professorField('Email'),
  officeHours: professorField('Office hours'),
  room: professorField('Room'),
})

const professorPatchSchema = z.object({
  id: z.string({ error: 'Professor id is required.' }).min(1),
  name: professorField('Name').optional(),
  email: z
    .string({ error: 'Enter a valid email address.' })
    .trim()
    .max(120, { message: 'Enter a valid email address.' })
    .refine((e) => e.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e), { message: 'Enter a valid email address.' })
    .optional()
    .transform((v) => v ?? ''),
  officeHours: professorField('Office hours').optional(),
  room: professorField('Room').optional(),
})

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

// POST /api/professors (admin) — add a directory entry
export async function POST(request: NextRequest) {
  try {
    const gate = await requireAdmin(request)
    if ('error' in gate) return gate.error
    const { performer } = gate

    const fields = await parseBody(request, professorCreateSchema)
    if (!fields.name || !fields.email) {
      return NextResponse.json({ ok: false, error: 'Name and email are required.' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
      return NextResponse.json({ ok: false, error: 'Enter a valid email address.' }, { status: 400 })
    }

    const col = await getCollection<MongoProfessor>('professors')
    const doc: MongoProfessor = {
      branch: performer.branch,
      name: fields.name,
      email: fields.email,
      officeHours: fields.officeHours || 'TBA',
      room: fields.room || 'TBA',
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
    if (err instanceof HttpError) return errResponse(err)
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

    const { id, ...fields } = await parseBody(request, professorPatchSchema)
    let idFilter: ObjectId
    try {
      idFilter = new ObjectId(id)
    } catch {
      return NextResponse.json({ ok: false, error: 'Professor not found.' }, { status: 404 })
    }

    const update: Record<string, string> = {}
    if (fields.name !== undefined && fields.name !== '') update.name = fields.name
    if (fields.email !== undefined && fields.email !== '') update.email = fields.email
    if (fields.officeHours !== undefined) update.officeHours = fields.officeHours || 'TBA'
    if (fields.room !== undefined) update.room = fields.room || 'TBA'
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
    if (err instanceof HttpError) return errResponse(err)
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

    const query = parseQuery(request, idQuerySchema)
    let idFilter: ObjectId
    try {
      idFilter = new ObjectId(query.id)
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
    if (err instanceof HttpError) return errResponse(err)
    console.error('Professor delete error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to remove professor.' }, { status: 500 })
  }
}
