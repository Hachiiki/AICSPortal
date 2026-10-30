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
  // A1 (issue #72, phase 3 strict): the immutable faculty account
  // username that owns this row; ownership is username equality ONLY.
  // Absent/null/'' rows are unowned — no account matches them
  // (fail-closed); reassignment is an explicit stamp change. The
  // display name (`professor`) is never an ownership key.
  professorUsername?: string
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

// Payment log entry — appended by admin/registrar when posting a
// payment (POST /api/admin/enrollment). The assessment aggregate
// (amountPaid/balance/paymentStatus) stays the source of truth for
// balances; this array is the audit trail behind it.
export interface MongoEnrollmentPayment {
  amount: number
  date: string // ISO date the payment was received
  postedBy: string // admin username that posted it
  note?: string
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
  // Optional payment history (newer records carry it; older ones
  // aggregate only — the manage page tolerates a missing array).
  payments?: MongoEnrollmentPayment[]
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

// Per-user onboarding progress (onboarding plan, Phase 1).
// One doc per user per branch, keyed {branch, username} (unique index
// via seed tooling). `values` maps the registry dimension keys for the
// role the doc was last written under to done/not-done; `version` is
// the registry version at that write. Reads always resolve against the
// actor's CURRENT role spec and carry values forward across version
// bumps (done steps that survive stay done, added dimensions start
// false, retired dimensions drop out — src/lib/onboarding/registry.ts).
export interface MongoOnboardingState {
  _id?: string
  branch: Branch
  username: string
  // The role the doc was last written under; reads use the actor's
  // current DB role, and a role change re-normalizes on the next write.
  role: Role
  version: number
  values: Record<string, boolean>
  updatedAt: Date
}

// Course materials from faculty. One doc per posting (not per
// student): students see the materials of their own current-term
// subjects, faculty see what they posted for their load.
// kind 'link' = faculty-pasted URL (no file storage).
// kind 'file' = Cloudinary asset under aics-portal/materials/
// (branch/subject folder), uploaded direct from the browser with
// a server-signed signature; only the record lives here.
export type MaterialKind = 'link' | 'file'

export interface MongoMaterial {
  _id?: string
  branch: Branch
  subjectCode: string
  term: {
    academicYear: string
    semester: string
    yearLevel: string
  }
  title: string
  kind: MaterialKind
  // Links: any http(s) URL. Files: the Cloudinary secure_url.
  url: string
  // Files only: Cloudinary identifiers for cleanup.
  publicId?: string | null
  resourceType?: 'image' | 'raw' | null
  bytes?: number | null
  format?: string | null
  uploadedBy: string // faculty username
  uploadedAt: Date
}

// Section notifications from faculty. One doc per targeted student
// so unread counts and read state stay trivial. Never rendered in
// the announcements deck — the bell inbox owns these.
// `taskId` links task-announcement notifications to the task doc so
// the bell can deep-link into Academics → Tasks (refs #37-review).
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
  // Task announcement link (task posts only, refs #37-review).
  // Bell clicks deep-link into Academics → Tasks for this doc.
  taskId?: string | null
  createdAt: Date
  read: boolean
  readAt: Date | null
}

// Content-moderation decisions, one row per decision that changed an
// outcome: reject, flag (reviewPending until an admin resolves it), and
// allowlist saves (rule 5 suppressing a would-be match). Clean passes
// are not logged — there is no rule id or matched term to record.
// Mirrors the grade_audits convention: branch-scoped, actor-stamped,
// append-only. An admin review view over this collection is a later
// epic item.
export type ModerationLogAction = 'allow' | 'reject' | 'flag'

export interface MongoModerationLog {
  _id?: string
  branch: Branch
  // announcement | section-notification | task | profile | material-link
  surface: string
  actorUsername: string
  // Free-form on purpose: the log mirrors whatever the session carried
  // (student/faculty/admin today) rather than gating on the Role union.
  actorRole: string
  // profanity | harassment | sexual | url-restriction | allowlist
  ruleId: string
  action: ModerationLogAction
  matchedTerms: string[]
  urls?: { url: string; host: string }[]
  // First 240 characters of the moderated text, for admin context.
  textExcerpt: string
  createdAt: Date
  // flag decisions stay pending until an admin follows up.
  reviewPending: boolean
  reviewedAt?: Date | null
  reviewedBy?: string | null
}
