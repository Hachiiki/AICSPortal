import type { Student, View } from '@/lib/aics/types'
import type { PortalEvent } from '@/lib/aics/events'
import type { Professor } from '@/lib/aics/professors'
import type { Task } from '@/lib/aics/tasks'
import type { NotificationInbox } from '@/lib/aics/notifications'

// Shared prop bundle for every admin portal page. Mirrors the
// props AdminReleasePage already receives from the root page
// dispatcher, so new admin screens drop in without touching the
// data plumbing in src/app/page.tsx.
export interface AdminPageProps {
  student: Student
  onNavigate: (view: View) => void
  onLogout: () => void
  events?: PortalEvent[]
  professors?: Professor[]
  tasks?: Task[]
  inbox?: NotificationInbox
}
