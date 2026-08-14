// TypeScript types shared across the AICS portal.

export type View =
  | 'login'
  | 'dashboard'
  | 'profile'
  | 'academics'
  | 'events'
  | 'subjects'
  | 'schedule'
  | 'grades'
  | 'professors'
  | 'enrollment'
  | 'documents'
  | 'settings'
  | 'help'

export type AuthMode = 'credentials' | 'face'

export type FaceState = 'idle' | 'starting' | 'scanning' | 'verifying' | 'success' | 'error'

export interface Subject {
  code: string
  title: string
  units: number
  professor: string
  professorEmail: string
  schedule: string
  room: string
  midterm: string
  finals: string
  finalGrade: string
  remarks: string
  // Term fields (added for academics module — backward compatible)
  academicYear?: string
  semester?: string
  yearLevel?: string
  status?: string // "completed" | "in-progress"
}

export interface ScheduleEntry {
  day: string
  start: string
  end: string
  subject: string
  title: string
  room: string
  professor: string
  color: string
}

export interface StudentDocument {
  name: string
  submitted: boolean
  dateSubmitted: string | null
}

export interface Student {
  username: string
  fullName: string
  firstName: string
  lastName: string
  middleName: string
  /** Optional profile photo URL. If absent, initials avatar is rendered. */
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
  branch: string
  branchAddress: string
  subjects: Subject[]
  schedule: ScheduleEntry[]
  documents: StudentDocument[]
}
