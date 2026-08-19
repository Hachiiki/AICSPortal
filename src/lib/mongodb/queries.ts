import { ObjectId } from 'mongodb'
import { getCollection } from './connection'
import type { MongoStudent, MongoSubject, MongoCourse, MongoSession, MongoTask, MongoEvent, MongoProfessor, Branch } from './types'

// ============================================================
//  Data access layer — all queries are scoped by branch
// ============================================================

export async function getStudentByCredentials(
  username: string,
  password: string
): Promise<MongoStudent | null> {
  const col = await getCollection<MongoStudent>('students')
  return col.findOne({ username, password })
}

export async function getStudentByUsername(
  username: string
): Promise<MongoStudent | null> {
  const col = await getCollection<MongoStudent>('students')
  return col.findOne({ username })
}

export async function getSubjectsForStudent(
  studentUsername: string,
  branch: Branch
): Promise<MongoSubject[]> {
  const col = await getCollection<MongoSubject>('subjects')
  return col.find({ studentUsername, branch }).toArray()
}

export async function getCourses(branch: Branch): Promise<MongoCourse[]> {
  const col = await getCollection<MongoCourse>('courses')
  return col.find({ branch }).toArray()
}

export async function getSessions(branch: Branch): Promise<MongoSession[]> {
  const col = await getCollection<MongoSession>('sessions')
  return col.find({ branch }).toArray()
}

// VISIBILITY RULE: Students only see tasks of the ACTIVE
// term. When the sem/year ends, tasks are hidden from
// students but NOT deleted. Admin and Teacher roles can
// see full task history (to be wired when those roles
// exist).
export async function getTasksForStudentCurrentTerm(
  studentUsername: string,
  branch: Branch,
  currentTerm: { academicYear: string; semester: string }
): Promise<MongoTask[]> {
  const col = await getCollection<MongoTask>('tasks')
  return col.find({
    studentUsername,
    branch,
    'term.academicYear': currentTerm.academicYear,
    'term.semester': currentTerm.semester,
  }).toArray()
}

// TEACHER CONTROL: Teachers can close submissions per task
// (task.submissionsClosed = true). Once closed, students
// can no longer submit; unsubmitted work displays as
// "Missing". "Overdue" only applies while submissions are
// still open past the due date.
//
// This query-level guard rejects any submit attempt for a
// task whose submissionsClosed flag is true (or missing with
// an already-submitted record). The route handler also
// returns 403 in this case — defense in depth.
export async function submitTask(
  taskId: string,
  studentUsername: string
): Promise<{ ok: boolean; reason?: 'closed' | 'not_found' }> {
  const col = await getCollection<MongoTask>('tasks')
  let idFilter: any
  try {
    idFilter = new ObjectId(taskId)
  } catch {
    return { ok: false, reason: 'not_found' }
  }
  // Atomic guard: only update if NOT closed and NOT already submitted.
  const result = await col.updateOne(
    {
      _id: idFilter,
      studentUsername,
      submitted: false,
      submissionsClosed: { $ne: true },
    },
    { $set: { submitted: true, submittedAt: new Date() } }
  )
  if (result.modifiedCount > 0) return { ok: true }
  // Distinguish "closed" from "not found" so the route can return 403 vs 404.
  const task = await col.findOne({ _id: idFilter, studentUsername })
  if (!task) return { ok: false, reason: 'not_found' }
  return { ok: false, reason: 'closed' }
}

// ADMIN CONTROL: Events are created/edited/deleted by
// Admin only. Students have read-only access to this
// calendar. The admin UI for managing events will be
// wired when the admin portal exists.
//
// This query returns ALL events for the branch (no
// student-scoping needed since events are school-wide,
// not per-student). The client filters by visible range.
export async function getEvents(branch: Branch): Promise<MongoEvent[]> {
  const col = await getCollection<MongoEvent>('events')
  return col.find({ branch }).sort({ date: 1 }).toArray()
}

// ADMIN CONTROL: Professor directory details (office
// hours, room, contact) are maintained by Admin. Students
// have read-only access.
//
// Returns all professors for the branch. The client joins
// them with the student's current-term subjects by name.
export async function getProfessors(branch: Branch): Promise<MongoProfessor[]> {
  const col = await getCollection<MongoProfessor>('professors')
  return col.find({ branch }).toArray()
}
