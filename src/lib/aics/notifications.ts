// Client-side notification type for the Topbar bell inbox.

// How long a sent notification lives before it expires out of the
// faculty history (and is physically removed by the cleanup cron).
// One shared constant so the sent query, the cleanup job, and the UI
// hint can never drift apart. 30 days per product decision.
export const NOTIFICATION_RETENTION_DAYS = 30

export interface Notification {
  _id: string
  title: string
  body: string
  fromName: string
  subjectCode: string
  createdAt: string // ISO string
  read: boolean
  // Task announcement link (task posts only). Bell clicks carrying
  // a taskId deep-link into Academics → Tasks for that doc.
  taskId: string | null
}

// One prop bundle carrying the bell inbox through the shell so
// pages pass a single object instead of four separate props.
export interface NotificationInbox {
  notifications: Notification[]
  loading: boolean
  onRefresh: () => void
  onMark: (id?: string, all?: boolean) => void
}

// ============================================================
//  Faculty sent history — grouped + paginated server responses
// ============================================================
//
//  The sent endpoint collapses the per-student fan-out docs of one
//  POST into a single group (they all share the exact createdAt
//  timestamp), so the history shows "Sent to BS2AA · 40 students"
//  instead of 40 near-identical rows. Recipients stay available for
//  on-demand expansion.

export interface SentRecipient {
  username: string
  fullName: string // '' when the student record no longer resolves
  section: string // student section, e.g. "BS2AA"
  subjectCode: string
  read: boolean
}

export interface SentSectionSummary {
  // `code|academicYear|semester` — the subject-class block targeted
  sectionKey: string
  subjectCode: string
  count: number
  // Distinct student sections (BS2AA, ...) inside this class block,
  // most-common first. Empty when no recipient resolves.
  sectionNames: string[]
}

export interface SentNotificationGroup {
  key: string // createdAt ISO — unique per send
  title: string
  body: string
  createdAt: string // ISO string
  total: number
  readCount: number
  // Task announcement link (task fan-outs only, else null)
  taskId: string | null
  sections: SentSectionSummary[]
  recipients: SentRecipient[]
}

export interface SentHistoryPage {
  groups: SentNotificationGroup[]
  page: number // 1-based
  pageSize: number
  total: number // total non-expired groups
  totalPages: number
}

export function formatNotifTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
