// Client-side Event type for the school calendar.
// Mirrors the server MongoEvent but uses ISO date strings
// (safe for JSON transport + client-side Date parsing).

export type EventCategory = 'academic' | 'deadline' | 'campus' | 'holiday'

export interface PortalEvent {
  _id: string
  title: string
  description: string | null
  date: string // ISO string
  endDate: string | null // ISO string, null = single-day
  category: EventCategory
}

// ------------------------------------------------------------
//  Category display metadata — colors and labels
//  Used by the calendar dots, legend chips, and event pills.
// ------------------------------------------------------------

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  academic: 'bg-blue-500',
  deadline: 'bg-red-500',
  campus: 'bg-violet-500',
  holiday: 'bg-green-500',
}

export const CATEGORY_PILL_STYLES: Record<EventCategory, string> = {
  academic: 'bg-blue-50 text-blue-700 border-blue-200',
  deadline: 'bg-red-50 text-red-700 border-red-200',
  campus: 'bg-violet-50 text-violet-700 border-violet-200',
  holiday: 'bg-green-50 text-green-700 border-green-200',
}

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  academic: 'Academic',
  deadline: 'Deadline',
  campus: 'Campus',
  holiday: 'Holiday',
}

// Task-due dot color — distinct amber, used when the
// "Show my task due dates" toggle is ON.
export const TASK_DUE_COLOR = 'bg-amber-500'
