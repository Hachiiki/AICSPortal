// Client-side notification type for the Topbar bell inbox.

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
