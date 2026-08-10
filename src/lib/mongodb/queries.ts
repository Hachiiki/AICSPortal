import { getCollection } from './connection'
import type { MongoStudent, MongoSubject, MongoCourse, MongoSession, Branch } from './types'

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
