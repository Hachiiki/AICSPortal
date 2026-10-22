'use client'

import {
  Archive,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Home,
  Landmark,
  Megaphone,
  Settings,
  Stamp,
  Users,
  CircleHelp,
  type LucideIcon,
} from 'lucide-react'
import type { View } from '@/lib/aics/types'
import { PERMISSIONS, type PermissionId } from '@/lib/authz/permissions'

export interface NavItem {
  view: View
  label: string
  icon: LucideIcon
  enabled: boolean
  /**
   * Display-only gate: the permission ID this item's target surface needs.
   * Filtered against ROLE_PERMISSIONS below. The server re-decides every
   * request through can(), so this never enforces anything.
   */
  permission?: PermissionId
}

export type PortalRole = 'student' | 'faculty' | 'admin'

// Display-only mirror of the server policy table (src/lib/authz/policies.ts,
// phase-2-design section 4.6). Nothing security-relevant is decided here:
// URLs are display-only and data lives under the session identity. When the
// policy table changes a role's reach, update this map in the same commit so
// the nav stays honest.
const ROLE_PERMISSIONS: Record<PortalRole, ReadonlySet<PermissionId>> = {
  // Self-surface only: own materials, read markers, password, photo.
  student: new Set([
    PERMISSIONS.viewMaterials,
    PERMISSIONS.markAnnouncementsRead,
    PERMISSIONS.changePassword,
    PERMISSIONS.updatePhoto,
  ]),
  faculty: new Set([
    PERMISSIONS.markAnnouncementsRead,
    PERMISSIONS.changePassword,
    PERMISSIONS.updatePhoto,
    // Teaching loop: roster (My Students, Schedule), grades, tasks.
    PERMISSIONS.viewMyStudents,
    PERMISSIONS.viewPreviousRecords,
    PERMISSIONS.encodeGrades,
    PERMISSIONS.submitGrades,
    PERMISSIONS.viewGradeAudits,
    PERMISSIONS.viewFacultyTasks,
    PERMISSIONS.postTasks,
    PERMISSIONS.gradeTasks,
    PERMISSIONS.viewAttendance,
    PERMISSIONS.takeAttendance,
    // Materials: admin is excluded from the list read by design.
    PERMISSIONS.viewMaterials,
    PERMISSIONS.uploadMaterials,
    // Notifications: compose plus sent history.
    PERMISSIONS.sendNotifications,
    PERMISSIONS.viewSentNotifications,
  ]),
  admin: new Set([
    PERMISSIONS.markAnnouncementsRead,
    PERMISSIONS.changePassword,
    PERMISSIONS.updatePhoto,
    // Release queue plus the branch-wide audit view.
    PERMISSIONS.viewReleaseQueue,
    PERMISSIONS.releaseGrades,
    PERMISSIONS.viewGradeAudits,
    // Shared faculty reads stay open to admin: roster, history, task board,
    // branch-wide attendance, sent notifications.
    PERMISSIONS.viewMyStudents,
    PERMISSIONS.viewPreviousRecords,
    PERMISSIONS.viewFacultyTasks,
    PERMISSIONS.viewAttendance,
    PERMISSIONS.viewSentNotifications,
    // Admin-only surfaces.
    PERMISSIONS.manageAnnouncements,
    PERMISSIONS.manageEvents,
    PERMISSIONS.manageProfessors,
    PERMISSIONS.viewAdminDirectory,
    PERMISSIONS.viewAdminStats,
    PERMISSIONS.manageEnrollment,
  ]),
}

export function roleHasPermission(role: PortalRole | string | undefined, permission: PermissionId): boolean {
  const grants = role === 'faculty' || role === 'admin' ? ROLE_PERMISSIONS[role] : ROLE_PERMISSIONS.student
  return grants.has(permission)
}

// Single source of truth for sidebar navigation.
// Add a new tab here and every shell picks it up. Do not hardcode
// nav arrays inside Sidebar or FacultySidebar.
export const STUDENT_PRIMARY_NAV: NavItem[] = [
  { view: 'dashboard', label: 'Dashboard', icon: Home, enabled: true },
  { view: 'academics', label: 'Academics', icon: GraduationCap, enabled: true },
  { view: 'events', label: 'Events', icon: CalendarDays, enabled: true },
  { view: 'professors', label: 'Professors', icon: Users, enabled: true },
  { view: 'enrollment', label: 'Enrollment', icon: Stamp, enabled: true },
]

export const FACULTY_PRIMARY_NAV: NavItem[] = [
  { view: 'dashboard', label: 'Dashboard', icon: Home, enabled: true },
  // Roster surface feeds both My Students and the Schedule grid; the
  // attendance modal lives inside My Students.
  { view: 'my-students', label: 'My Students', icon: Users, enabled: true, permission: PERMISSIONS.viewMyStudents },
  { view: 'grade-encoding', label: 'Grade Encoding', icon: GraduationCap, enabled: true, permission: PERMISSIONS.encodeGrades },
  { view: 'previous-records', label: 'Previous Records', icon: Archive, enabled: true, permission: PERMISSIONS.viewPreviousRecords },
  // Compose plus sent history over POST /api/notifications.
  { view: 'announcements', label: 'Announcements', icon: Megaphone, enabled: true, permission: PERMISSIONS.sendNotifications },
  { view: 'schedule', label: 'Schedule', icon: CalendarDays, enabled: true, permission: PERMISSIONS.viewMyStudents },
  { view: 'tasks', label: 'Tasks', icon: ClipboardList, enabled: true, permission: PERMISSIONS.viewFacultyTasks },
]

export const ADMIN_PRIMARY_NAV: NavItem[] = [
  // The admin dashboard renders GET /api/admin/stats.
  { view: 'dashboard', label: 'Dashboard', icon: Home, enabled: true, permission: PERMISSIONS.viewAdminStats },
  { view: 'release-queue', label: 'Release Queue', icon: Stamp, enabled: true, permission: PERMISSIONS.viewReleaseQueue },
  { view: 'admin-events', label: 'Events', icon: CalendarDays, enabled: true, permission: PERMISSIONS.manageEvents },
  { view: 'admin-announcements', label: 'Announcements', icon: Megaphone, enabled: true, permission: PERMISSIONS.manageAnnouncements },
  { view: 'admin-professors', label: 'Professors', icon: GraduationCap, enabled: true, permission: PERMISSIONS.manageProfessors },
  { view: 'admin-people', label: 'Students & Faculty', icon: Users, enabled: true, permission: PERMISSIONS.viewAdminDirectory },
  { view: 'admin-enrollment', label: 'Enrollment', icon: Landmark, enabled: true, permission: PERMISSIONS.manageEnrollment },
]

export const SECONDARY_NAV: NavItem[] = [
  { view: 'settings', label: 'Settings', icon: Settings, enabled: true },
  { view: 'help', label: 'Help & Support', icon: CircleHelp, enabled: true },
]

export function getPrimaryNav(role?: PortalRole | string): NavItem[] {
  const items =
    role === 'faculty' ? FACULTY_PRIMARY_NAV : role === 'admin' ? ADMIN_PRIMARY_NAV : STUDENT_PRIMARY_NAV
  // Display-only permission filter: an item carrying a permission renders
  // only when the role's mirror set grants it. Every tagged item matches
  // its role's set today, so the filter hides nothing; it exists so a future
  // policy-table change lands as a one-line mirror update instead of a
  // hand-pruned nav array.
  return items.filter((item) => !item.permission || roleHasPermission(role, item.permission))
}

export function getPortalLabel(role?: PortalRole | string): string {
  if (role === 'faculty') return 'Faculty Portal'
  if (role === 'admin') return 'Admin Portal'
  return 'Student Portal'
}

export function getPortalAria(role?: PortalRole | string): string {
  if (role === 'faculty') return 'Faculty navigation'
  if (role === 'admin') return 'Admin navigation'
  return 'Main navigation'
}
