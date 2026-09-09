// ============================================================
//  MongoDB document types
// ============================================================
//  These mirror the existing Student / Subject / Session types
//  but include a `branch` field for branch-based scoping and an
//  `_id` field from MongoDB.
// ============================================================

export type Branch = 'commonwealth' | (string & {}) // extensible for future branches
export type Role = 'student' | 'faculty' | 'admin'

export interface MongoStudent {
  _id?: string
  branch: Branch
  username: string
  password: string // scrypt hash for new writes; legacy plaintext upgrades on login (BUG-003)
  // Phase 6.5: session revocation counter. Bumped on logout / password
  // change; tokens carrying an older value 401. Defaults to 0.
  tokenVersion?: number
  role: Role // determines which portal the user sees
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

export interface MongoProgram {
  _id?: string
  branch: Branch
  code: 'BSCS' | 'BSCE' | 'BSENTREP' | (string & {})
  title: string // e.g. BS Computer Science
  color: 'blue' | 'green' | 'amber' | 'violet' | 'red'
}

export interface MongoCourse {
  _id?: string
  branch: Branch
  code: string
  title: string
  shortTitle: string
  color: 'blue' | 'green' | 'amber' | 'violet' | 'red'
  programCode?: 'BSCS' | 'BSCE' | 'BSENTREP' | string // FK → programs.code
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

export type GradePeriodStatus = 'draft' | 'submitted' | 'released' | ''

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
  prelim: string
  midterm: string
  finals: string
  finalGrade: string
  remarks: string
  // Term fields
  academicYear?: string // e.g. "2025-2026"
  semester?: string // e.g. "1st Sem"
  yearLevel?: string // e.g. "1st Year"
  status?: string // "completed" | "in-progress"
  // GRADE APPROVAL WORKFLOW — per period (teacher wants independent prelim/midterm/finals release)
  // '' = not yet set, not visible to students
  gradeStatus?: GradePeriodStatus // legacy overall — kept for backward compat, prefer per-period below
  prelimStatus?: GradePeriodStatus
  midtermStatus?: GradePeriodStatus
  finalsStatus?: GradePeriodStatus
}

// Real audit log — every grade change is recorded
export interface MongoGradeAudit {
  _id?: string
  branch: Branch
  studentUsername: string
  subjectCode: string
  academicYear: string
  semester: string
  period: 'prelim' | 'midterm' | 'finals' | 'finalGrade'
  oldValue: string
  newValue: string
  action: 'save' | 'submit' | 'release' | 'fill'
  performedBy: string // faculty username
  performedAt: Date
  note?: string
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

// ADMIN CONTROL: Professor directory details (office
// hours, room, contact) are maintained by Admin. Students
// have read-only access.
//
// The professor is identified by name (matching the
// `professor` field on MongoSubject). The `email` field
// matches `professorEmail` on MongoSubject. Office hours
// and room are directory-only fields not stored on the
// subject enrollment.
export interface MongoProfessor {
  _id?: string
  branch: Branch
  name: string // must match subject.professor
  email: string // must match subject.professorEmail
  officeHours: string // e.g. "Mon & Wed • 1:00-3:00 PM"
  room: string // e.g. "Faculty Office / Room 204"
}

// ============================================================
//  Enrollment — per-student, per-term enrollment record.
//
//  ADMIN/REGISTRAR CONTROL: Enrollment steps, assessment of
//  fees, payment status, and registrar contact info are
//  maintained by the Registrar / Admin. Students have
//  read-only access via the Enrollment page.
//
//  One document per student per term, keyed by
//  { studentUsername, branch, academicYear, semester }.
// ============================================================

export type EnrollmentStepStatus = 'completed' | 'current' | 'upcoming'
export type PaymentStatus = 'paid' | 'partial' | 'unpaid'

export interface MongoEnrollmentStep {
  step: number
  label: string
  description: string
  status: EnrollmentStepStatus
  date: string | null // ISO date or null if not yet scheduled
}

export interface MongoMiscFee {
  description: string
  amount: number
}

export interface MongoAssessment {
  tuitionPerUnit: number
  totalUnits: number
  tuitionAmount: number
  miscFees: MongoMiscFee[]
  totalAssessment: number
  amountPaid: number
  balance: number
  paymentStatus: PaymentStatus
  paymentDeadline: string | null
  paymentDate: string | null
}

export interface MongoRegistrar {
  name: string
  room: string
  officeHours: string
  email: string
  phone: string
}

export interface MongoEnrollment {
  _id?: string
  branch: Branch
  studentUsername: string
  academicYear: string // e.g. "2026-2027"
  semester: string // e.g. "1st Sem"
  currentStep: number // 1-based index into steps
  steps: MongoEnrollmentStep[]
  assessment: MongoAssessment
  registrar: MongoRegistrar
}


// ADMIN CONTROL: Announcements are created/edited/deleted by
// Admin only. Students have read-only access. Faculty reach
// students through section notifications instead (see below).
export interface MongoAnnouncement {
  _id?: string
  branch: Branch
  title: string
  body: string
  category: 'academic' | 'deadline' | 'campus' | 'holiday' | 'general'
  priority: 'normal' | 'urgent'
  author: string // name of the admin who posted
  postedDate: Date
  // null = no expiry; otherwise hide after this date
  expiryDate?: Date | null
}

// Per-user announcement reads. One doc per user per announcement
// so dismissed cards stay gone across refreshes. A new
// announcement has no doc and shows up normally.
export interface MongoAnnouncementRead {
  _id?: string
  branch: Branch
  username: string
  announcementId: string
  action: 'read' | 'dismissed'
  at: Date
}

// Section notifications from faculty. One doc per targeted student
// so unread counts and read state stay trivial. Never rendered in
// the announcements deck — the bell inbox owns these.
export interface MongoNotification {
  _id?: string
  branch: Branch
  studentUsername: string
  title: string
  body: string
  fromName: string
  fromUsername: string
  // sectionKey is `code|academicYear|semester`, matching the roster hook
  sectionKey: string
  subjectCode: string
  createdAt: Date
  read: boolean
  readAt: Date | null
}
