// ============================================================
//  MongoDB document types
// ============================================================
//  These mirror the existing Student / Subject / Session types
//  but include a `branch` field for branch-based scoping and an
//  `_id` field from MongoDB.
// ============================================================

export type Branch = 'commonwealth' | (string & {}) // extensible for future branches

export interface MongoStudent {
  _id?: string
  branch: Branch
  username: string
  password: string // NOTE: plaintext for demo only — hash with bcrypt in production
  fullName: string
  firstName: string
  lastName: string
  middleName: string
  photoUrl?: string
  studentNumber: string
  program: string
  programShort: string
  yearLevel: string
  section: string
  semester: string
  academicYear: string
  enrollmentStatus: string
  deanLister: boolean
  deanListerSemester: string
  gpa: string
  email: string
  phone: string
  address: string
  emergencyContactName: string
  emergencyContactNumber: string
  branch_name: string // e.g. "AICS Commonwealth"
  branchAddress: string
  documents: {
    name: string
    submitted: boolean
    dateSubmitted: string | null
  }[]
}

export interface MongoCourse {
  _id?: string
  branch: Branch
  code: string
  title: string
  shortTitle: string
  color: 'blue' | 'green' | 'amber' | 'violet' | 'red'
}

export interface MongoSession {
  _id?: string
  branch: Branch
  code: string
  day: 0 | 1 | 2 | 3 | 4 | 5 // 0 = Monday
  start: number // decimal hours, e.g. 8 = 8:00 AM, 9.5 = 9:30 AM
  end: number
  room: string
}

export interface MongoSubject {
  _id?: string
  branch: Branch
  studentUsername: string // which student this enrollment belongs to
  code: string
  title: string
  units: number
  professor: string
  professorEmail: string
  schedule: string // human-readable, e.g. "Mon / Wed 8:00 - 9:30 AM"
  room: string
  midterm: string
  finals: string
  finalGrade: string
  remarks: string
  // Term fields (added for academics module — backward compatible)
  academicYear?: string // e.g. "2025-2026"
  semester?: string // e.g. "1st Sem"
  yearLevel?: string // e.g. "1st Year"
  status?: string // "completed" | "in-progress"
}

export type TaskType = 'Activity' | 'Quiz' | 'Test' | 'Project'

export interface MongoTask {
  _id?: string
  branch: Branch
  studentUsername: string
  subjectCode: string
  term: {
    academicYear: string
    semester: string
    yearLevel: string
  }
  title: string
  type: TaskType
  description?: string
  dueDate: Date
  postedDate: Date
  submitted: boolean
  submittedAt: Date | null
  score: number | null
  maxScore: number | null
  feedback: string | null
  // TEACHER CONTROL: when true, students can no longer submit.
  // Unsubmitted work displays as "Missing" with a muted "Closed"
  // action instead of a submit button.
  submissionsClosed?: boolean
}

// ADMIN CONTROL: Events are created/edited/deleted by
// Admin only. Students have read-only access to this
// calendar. The admin UI for managing events will be
// wired when the admin portal exists.
export type EventCategory = 'academic' | 'deadline' | 'campus' | 'holiday'

export interface MongoEvent {
  _id?: string
  branch: Branch
  title: string
  description?: string
  date: Date // start date (inclusive)
  endDate?: Date | null // end date for multi-day events (inclusive); null = single-day
  category: EventCategory
}
