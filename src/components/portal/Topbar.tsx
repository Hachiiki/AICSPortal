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
}: TopbarProps) {
  const handleNotifications = () => {
    toast.info('No new notifications.')
  }

  const handleTheme = () => {
    toast.info('Theme switching is coming soon.')
  }

  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200">
      <div className="h-full flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Left — mobile hamburger */}
        <div className="flex items-center flex-shrink-0">
          <button
            type="button"
            onClick={onOpenMobileNav}
            aria-label="Open navigation menu"
            className="lg:hidden p-2 -ml-2 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Center — global search */}
        <div className="flex-1 flex justify-center min-w-0">
          <GlobalSearch
            student={student}
            events={events}
            professors={professors}
            tasks={tasks}
            onNavigate={onNavigate}
          />
        </div>

        {/* Right — notifications + profile dropdown + logout */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={handleNotifications}
            aria-label="Notifications"
            className="p-2 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Bell className="w-5 h-5" />
          </button>

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
                  <p className="text-[11px] text-slate-500 font-mono">{student.studentNumber}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" aria-hidden="true" />
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
                <span className="ml-auto text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">
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
