'use client'

import { Menu, Bell, ChevronDown, LogOut, User, Sun, Moon } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import type { Student, View } from '@/lib/aics/types'
import { getInitials } from '@/lib/aics/format'
import { GlobalSearch } from './GlobalSearch'
import type { PortalEvent } from '@/lib/aics/events'
import type { Professor } from '@/lib/aics/professors'
import type { Task } from '@/lib/aics/tasks'
import type { NotificationInbox } from '@/lib/aics/notifications'
import { formatNotifTime } from '@/lib/aics/notifications'

interface TopbarProps {
  student: Student
  onOpenMobileNav: () => void
  onProfile: () => void
  onLogout: () => void
  /** Drives the global search in the top bar. Lets the user jump to
   *  any page and find subjects, professors, events, and tasks. */
  onNavigate: (view: View) => void
  /** Optional collections the search can index. Each page passes the
   *  data it already has loaded; the parent wrapper supplies all of
   *  them so the search works the same on every screen. */
  events?: PortalEvent[]
  professors?: Professor[]
  tasks?: Task[]
  // Faculty teaching data for the role-aware search index.
  facultyData?: { subjects: any[]; students: any[] } | null
  taskGroups?: { title: string; subjectCode: string }[]
  // Bell inbox bundle. Absent on screens that predate it.
  inbox?: NotificationInbox
}

export function Topbar({
  student,
  onOpenMobileNav,
  onProfile,
  onLogout,
  onNavigate,
  events,
  professors,
  tasks,
  facultyData,
  taskGroups,
  inbox,
}: TopbarProps) {
  const unread = (inbox?.notifications ?? []).filter((n) => !n.read).length

  const handleTheme = () => {
    toast.info('Theme switching is coming soon.')
  }

  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200">
      {/* Sticky chrome at z-20. Page content stays below this. See PortalShell. */}
      <div className="h-full flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Left — mobile hamburger + Branch pill (from prototype V23) */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onOpenMobileNav}
            aria-label="Open navigation menu"
            className="lg:hidden p-2 -ml-2 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="hidden sm:inline-flex px-2.5 py-1 rounded bg-[#153357] text-white text-xs font-semibold tracking-wide">
            BRANCH: {student.branch?.toUpperCase() || 'MANILA'}
          </span>
        </div>

        {/* Center — global search */}
        <div className="flex-1 flex justify-center min-w-0">
          <GlobalSearch
            student={student}
            events={events}
            professors={professors}
            tasks={tasks}
            facultyData={facultyData}
            taskGroups={taskGroups}
            onNavigate={onNavigate}
          />
        </div>

        {/* Right — notifications + profile dropdown + logout */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <DropdownMenu
            onOpenChange={(open) => {
              if (open) inbox?.onRefresh()
            }}
          >
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Notifications"
                className="relative p-2 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Bell className="w-5 h-5" />
                {unread > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold grid place-items-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="px-2 py-1.5 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Notifications</p>
                {unread > 0 && (
                  <button
                    type="button"
                    onClick={() => inbox?.onMark(undefined, true)}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <DropdownMenuSeparator />
              {inbox?.loading ? (
                <p className="px-2 py-6 text-center text-xs text-slate-500">Loading...</p>
              ) : !inbox || inbox.notifications.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-slate-500">You are all caught up.</p>
              ) : (
                inbox.notifications.slice(0, 8).map((n) => (
                  <DropdownMenuItem
                    key={n._id}
                    onClick={() => inbox?.onMark(n._id)}
                    className="cursor-pointer items-start"
                  >
                    <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${n.read ? 'bg-slate-200' : 'bg-blue-600'}`} />
                    <span className="min-w-0">
                      <span className={`block text-sm truncate ${n.read ? 'font-normal text-slate-700' : 'font-semibold text-slate-900'}`}>
                        {n.title}
                      </span>
                      <span className="block text-xs text-slate-500 truncate">{n.body}</span>
                      <span className="block text-[11px] text-slate-500 mt-0.5">
                        {n.fromName} • {n.subjectCode} • {formatNotifTime(n.createdAt)}
                      </span>
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-6 bg-slate-200" aria-hidden="true" />

          {/* Profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-md hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="Account menu"
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                  style={{ background: '#1e293b' }}
                  aria-hidden="true"
                >
                  {getInitials(student.fullName)}
                </div>
                <div className="hidden sm:block text-left leading-tight">
                  <p className="text-sm font-semibold text-slate-900">{student.fullName}</p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {student.role === 'faculty' ? `Faculty • ${student.studentNumber}` : student.studentNumber}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-500 hidden sm:block" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {/* Profile header */}
              <div className="px-2 py-1.5">
                <p className="text-sm font-semibold text-slate-900 truncate">{student.fullName}</p>
                <p className="text-xs text-slate-500 font-mono truncate">{student.username}</p>
              </div>
              <DropdownMenuSeparator />

              {/* Profile — navigates to profile page */}
              <DropdownMenuItem onClick={onProfile} className="cursor-pointer">
                <User className="w-4 h-4 mr-2" />
                <span>Profile</span>
              </DropdownMenuItem>

              {/* Theme — not functional yet */}
              <DropdownMenuItem onClick={handleTheme} className="cursor-pointer">
                <Sun className="w-4 h-4 mr-2" />
                <span>Theme</span>
                <span className="ml-auto text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                  Soon
                </span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Sign out */}
              <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-red-600 focus:text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
