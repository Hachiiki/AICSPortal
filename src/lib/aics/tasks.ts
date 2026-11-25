// Client-side Task type and status computation

export type TaskType = 'Activity' | 'Quiz' | 'Test' | 'Project'

const CAMPUS_TIME_ZONE = 'Asia/Manila'
const campusDay = new Intl.DateTimeFormat('sv-SE', {
  timeZone: CAMPUS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
})

export function campusTaskDay(date: Date): string {
  return campusDay.format(date)
}

export function formatTaskDueDate(dueDate: string | Date, long = false): string {
  const date = new Date(dueDate)
  if (!Number.isFinite(date.getTime())) return ''
  return date.toLocaleDateString('en-US', {
    timeZone: CAMPUS_TIME_ZONE, month: long ? 'long' : 'short', day: 'numeric',
    ...(long ? { year: 'numeric' } : {}),
  })
}

export interface Task {
  _id: string
  subjectCode: string
  term: { academicYear: string; semester: string; yearLevel: string }
  title: string
  type: TaskType
  description?: string
  dueDate: string
  dueDateOnly?: boolean
  postedDate: string
  submitted: boolean
  submittedAt: string | null
  score: number | null
  maxScore: number | null
  feedback: string | null
  // TEACHER CONTROL: when true, students can no longer submit.
  // Unsubmitted work displays as "Missing" with a muted "Closed"
  // action instead of a submit button.
  submissionsClosed?: boolean
}

// 4 logical statuses (used for filtering + counting).
// MISSING has two display variants (closed vs open) captured by `variant`.
export type TaskStatus = 'GRADED' | 'PENDING' | 'MISSING' | 'NEEDS_ATTENTION'

// 5 display variants — drives pill text, color, icon, and action.
export type TaskVariant =
  | 'GRADED'
  | 'PENDING'
  | 'MISSING_CLOSED' // not submitted + teacher closed submissions
  | 'MISSING_OPEN' // not submitted + open + overdue
  | 'NEEDS_ATTENTION' // not submitted + open + not yet overdue

// TEACHER CONTROL: Teachers can close submissions per task
// (task.submissionsClosed = true). Once closed, students
// can no longer submit; unsubmitted work displays as
// "Missing". "Overdue" only applies while submissions are
// still open past the due date.
//
// VISIBILITY RULE: Students only see tasks of the ACTIVE
// term. When the sem/year ends, tasks are hidden from
// students but NOT deleted. Admin and Teacher roles can
// see full task history (to be wired when those roles
// exist).
export function computeStatus(task: Task, now = new Date()): {
  status: TaskStatus
  variant: TaskVariant
  sub: string
} {
  if (task.score !== null) {
    return { status: 'GRADED', variant: 'GRADED', sub: `${task.score} / ${task.maxScore}` }
  }
  if (task.submitted) {
    return { status: 'PENDING', variant: 'PENDING', sub: 'Awaiting grade' }
  }
  // Not submitted
  if (task.submissionsClosed) {
    return { status: 'MISSING', variant: 'MISSING_CLOSED', sub: 'Missing' }
  }
  const due = new Date(task.dueDate)
  // Older date-picker rows were stored at midnight UTC without a date-only flag.
  const dateOnly = task.dueDateOnly ?? /^\d{4}-\d{2}-\d{2}(?:T00:00:00(?:\.000)?Z)?$/.test(task.dueDate)
  const overdue = Number.isFinite(due.getTime())
    && (dateOnly ? campusTaskDay(now) > campusTaskDay(due) : due < now)
  if (overdue) {
    return { status: 'MISSING', variant: 'MISSING_OPEN', sub: 'Overdue' }
  }
  const label = formatTaskDueDate(due)
  return {
    status: 'NEEDS_ATTENTION',
    variant: 'NEEDS_ATTENTION',
    sub: label ? `Due ${label}` : 'Due date unavailable',
  }
}

// Type badge colors
export const TYPE_COLORS: Record<TaskType, string> = {
  Activity: 'bg-blue-50 text-link-strong border-blue-200',
  Quiz: 'bg-violet-50 text-violet-700 border-violet-200',
  Test: 'bg-orange-50 text-orange-700 border-orange-200',
  Project: 'bg-teal-50 text-teal-700 border-teal-200',
}

// Variant pill colors (the pill background+text+border)
export const VARIANT_COLORS: Record<TaskVariant, string> = {
  GRADED: 'bg-green-50 text-green-700 border-green-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  MISSING_CLOSED: 'bg-slate-100 text-slate-600 border-slate-200',
  MISSING_OPEN: 'bg-red-50 text-red-700 border-red-200',
  NEEDS_ATTENTION: 'bg-blue-50 text-link-strong border-blue-200',
}

// Status display labels
export const STATUS_LABELS: Record<TaskStatus, string> = {
  GRADED: 'Graded',
  PENDING: 'Pending',
  MISSING: 'Missing',
  NEEDS_ATTENTION: 'Needs attention',
}

// Circular icon background colors for the Needs Attention list
export const STATUS_ICON_COLORS: Record<TaskVariant, string> = {
  GRADED: 'bg-green-100 text-green-700',
  PENDING: 'bg-amber-100 text-amber-700',
  MISSING_CLOSED: 'bg-slate-100 text-slate-500',
  MISSING_OPEN: 'bg-red-100 text-red-700',
  NEEDS_ATTENTION: 'bg-blue-100 text-link-strong',
}

// Helper: should this task show an action button (Submit / Submit Late)?
// Returns false for GRADED, PENDING, and MISSING_CLOSED (which shows "Closed").
export function canSubmit(task: Task): boolean {
  if (task.submitted || task.score !== null) return false
  if (task.submissionsClosed) return false
  return true
}

// Helper: should this task show the info-icon "View details" button?
// Only GRADED and PENDING rows get the details modal.
export function canViewDetails(task: Task): boolean {
  return task.score !== null || task.submitted
}
