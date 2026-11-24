// Client-side announcement type for the dashboard widget.

export type AnnouncementCategory = 'academic' | 'deadline' | 'campus' | 'holiday' | 'general'
export type AnnouncementPriority = 'normal' | 'urgent'

export const ANNOUNCEMENT_IMAGE_MAX_BYTES = 2 * 1024 * 1024
export const ANNOUNCEMENT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const ANNOUNCEMENT_IMAGE_ALT_MAX_LENGTH = 180
export const ANNOUNCEMENT_MARK_BATCH_SIZE = 200

export function announcementImageUrl(id: string) {
  return `/api/announcements/image?id=${encodeURIComponent(id)}`
}

export function announcementDetailsUrl(id: string) {
  return `/portal/announcements/${encodeURIComponent(id)}`
}

export interface Announcement {
  _id: string
  title: string
  body: string
  category: AnnouncementCategory
  priority: AnnouncementPriority
  author: string
  image?: { alt: string }
  postedDate: string // ISO string
  /** Admin manage view only (all=1). null = no expiry; the student deck ignores it. */
  expiryDate?: string | null
}

export const ANNOUNCEMENT_STYLES: Record<AnnouncementCategory, { dot: string; pill: string; label: string }> = {
  academic: { dot: 'bg-blue-500', pill: 'bg-blue-50 text-link-strong border-blue-200', label: 'Academic' },
  deadline: { dot: 'bg-red-500', pill: 'bg-red-50 text-red-700 border-red-200', label: 'Deadline' },
  campus: { dot: 'bg-violet-500', pill: 'bg-violet-50 text-violet-700 border-violet-200', label: 'Campus' },
  holiday: { dot: 'bg-green-500', pill: 'bg-green-50 text-green-700 border-green-200', label: 'Holiday' },
  general: { dot: 'bg-slate-400', pill: 'bg-slate-100 text-slate-600 border-slate-200', label: 'General' },
}
