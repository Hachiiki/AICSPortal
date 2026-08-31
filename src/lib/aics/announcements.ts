// Client-side announcement type for the dashboard widget.

export type AnnouncementCategory = 'academic' | 'deadline' | 'campus' | 'holiday' | 'general'
export type AnnouncementPriority = 'normal' | 'urgent'

export interface Announcement {
  _id: string
  title: string
  body: string
  category: AnnouncementCategory
  priority: AnnouncementPriority
  author: string
  postedDate: string // ISO string
}

export const ANNOUNCEMENT_STYLES: Record<AnnouncementCategory, { dot: string; pill: string; label: string }> = {
  academic: { dot: 'bg-blue-500', pill: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Academic' },
  deadline: { dot: 'bg-red-500', pill: 'bg-red-50 text-red-700 border-red-200', label: 'Deadline' },
  campus: { dot: 'bg-violet-500', pill: 'bg-violet-50 text-violet-700 border-violet-200', label: 'Campus' },
  holiday: { dot: 'bg-green-500', pill: 'bg-green-50 text-green-700 border-green-200', label: 'Holiday' },
  general: { dot: 'bg-slate-400', pill: 'bg-slate-100 text-slate-600 border-slate-200', label: 'General' },
}
