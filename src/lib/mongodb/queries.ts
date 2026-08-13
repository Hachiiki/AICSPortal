import { getCollection } from './connection'
import type { MongoStudent, MongoSubject, MongoCourse, MongoSession, MongoTask, Branch } from './types'

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

export async function submitTask(
  taskId: string,
  studentUsername: string
): Promise<boolean> {
  const col = await getCollection<MongoTask>('tasks')
  const result = await col.updateOne(
    { _id: taskId as any, studentUsername },
    { $set: { submitted: true, submittedAt: new Date() } }
  )
  return result.modifiedCount > 0
}
