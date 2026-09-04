'use client'

import {
  Archive,
  CalendarDays,
  GraduationCap,
  Home,
  Megaphone,
  Settings,
  Stamp,
  Users,
  CircleHelp,
  type LucideIcon,
} from 'lucide-react'
import type { View } from '@/lib/aics/types'

export interface NavItem {
  view: View
  label: string
  icon: LucideIcon
  enabled: boolean
}

export type PortalRole = 'student' | 'faculty' | 'admin'

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
  { view: 'my-students', label: 'My Students', icon: Users, enabled: true },
  { view: 'grade-encoding', label: 'Grade Encoding', icon: GraduationCap, enabled: true },
  { view: 'previous-records', label: 'Previous Records', icon: Archive, enabled: true },
  { view: 'events', label: 'Announcements', icon: Megaphone, enabled: false },
  { view: 'schedule', label: 'Schedule', icon: CalendarDays, enabled: false },
]

export const SECONDARY_NAV: NavItem[] = [
  { view: 'settings', label: 'Settings', icon: Settings, enabled: true },
  { view: 'help', label: 'Help & Support', icon: CircleHelp, enabled: false },
]

export function getPrimaryNav(role?: PortalRole | string): NavItem[] {
  return role === 'faculty' ? FACULTY_PRIMARY_NAV : STUDENT_PRIMARY_NAV
}

export function getPortalLabel(role?: PortalRole | string): string {
  return role === 'faculty' ? 'Faculty Portal' : 'Student Portal'
}

export function getPortalAria(role?: PortalRole | string): string {
  return role === 'faculty' ? 'Faculty navigation' : 'Main navigation'
}
