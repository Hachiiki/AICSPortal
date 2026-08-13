// Client-side Task type and status computation

export type TaskType = 'Activity' | 'Quiz' | 'Test' | 'Project'

export interface Task {
  _id: string
  subjectCode: string
  term: { academicYear: string; semester: string; yearLevel: string }
  title: string
  type: TaskType
  description?: string
  dueDate: string
  postedDate: string
  submitted: boolean
  submittedAt: string | null
  score: number | null
  maxScore: number | null
  feedback: string | null
}

export type TaskStatus = 'GRADED' | 'PENDING' | 'MISSING' | 'NEEDS_ATTENTION'

export function computeStatus(task: Task): { status: TaskStatus; sub: string } {
  if (task.score !== null) return { status: 'GRADED', sub: `${task.score} / ${task.maxScore}` }
  if (task.submitted) return { status: 'PENDING', sub: 'Awaiting grade' }
  const now = new Date()
  const due = new Date(task.dueDate)
  if (due < now) return { status: 'MISSING', sub: 'Overdue' }
  return { status: 'NEEDS_ATTENTION', sub: `Due ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` }
}

// Type badge colors
export const TYPE_COLORS: Record<TaskType, string> = {
  Activity: 'bg-blue-50 text-blue-700 border-blue-200',
  Quiz: 'bg-violet-50 text-violet-700 border-violet-200',
  Test: 'bg-orange-50 text-orange-700 border-orange-200',
  Project: 'bg-teal-50 text-teal-700 border-teal-200',
}

// Status pill colors
export const STATUS_COLORS: Record<TaskStatus, string> = {
  GRADED: 'bg-green-50 text-green-700 border-green-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  MISSING: 'bg-red-50 text-red-700 border-red-200',
  NEEDS_ATTENTION: 'bg-blue-50 text-blue-700 border-blue-200',
}

// Status display labels
export const STATUS_LABELS: Record<TaskStatus, string> = {
  GRADED: 'Graded',
  PENDING: 'Pending',
  MISSING: 'Missing',
  NEEDS_ATTENTION: 'Needs attention',
}

// Circular icon background colors for the Needs Attention list
export const STATUS_ICON_COLORS: Record<TaskStatus, string> = {
  GRADED: 'bg-green-100 text-green-600',
  PENDING: 'bg-amber-100 text-amber-600',
  MISSING: 'bg-red-100 text-red-600',
  NEEDS_ATTENTION: 'bg-blue-100 text-blue-600',
}
