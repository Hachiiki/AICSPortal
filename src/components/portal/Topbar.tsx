'use client'

import { Menu, Bell, ChevronDown, LogOut, User, Sun, Moon } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { useMounted } from '@/lib/aics/use-mounted'
import { quickToggleTheme } from '@/lib/aics/theme-palette'
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
import { assembleEntrance, useAssembleReveal } from './assemble-entrance'
import type { PortalEvent } from '@/lib/aics/events'
import type { Professor } from '@/lib/aics/professors'
import type { Task } from '@/lib/aics/tasks'
import type { NotificationInbox, Notification } from '@/lib/aics/notifications'
import { formatNotifTime } from '@/lib/aics/notifications'
import { usePortalRoute } from '@/lib/aics/use-portal-route'
import { usePhoneViewport } from '@/lib/aics/use-phone-viewport'

interface TopbarProps {
  student: Student
  active: View
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
  active,
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
  const { navigate } = usePortalRoute()
  const phone = usePhoneViewport()
  const isStudent = !student.role || student.role === 'student'
  const compact = isStudent && phone
  const unread = (inbox?.notifications ?? []).filter((n) => !n.read).length
  const bellLabel = `Notifications${unread > 0 ? `, ${unread} unread` : ''}`
  const bellIcon = <>
    <Bell className="size-5" aria-hidden="true" />
    {unread > 0 && (
      <span aria-hidden="true" className="absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
        {unread > 9 ? '9+' : unread}
      </span>
    )}
  </>
  const bellClass = 'relative grid size-[44px] place-items-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link sm:size-9'

  // Theme quick toggle (dark-theme plan §6, Phase 1 control 3): cycles
  // light/dark on every authenticated surface. Resolved theme drives the
  // target so a System user flips out of whatever the OS resolved to.
  // quickToggleTheme also drops a stored custom palette back to standard
  // (custom rides both modes, so a bare mode flip would change nothing).
  // Icon renders only after mount (resolvedTheme is undefined during SSR
  // and the first client render; the mounted gate keeps hydration exact).
  const { resolvedTheme, setTheme } = useTheme()
  const themeMounted = useMounted()
  const isDark = themeMounted && resolvedTheme === 'dark'

  // Bell click: mark read as before, plus deep-link task
  // announcements into Academics → Tasks for that doc. The focus
  // handoff is one-shot (consumed + cleared on mount).
  const openNotification = (n: Notification) => {
    inbox?.onMark(n._id)
    if (n.taskId) {
      if (student.role === 'faculty') onNavigate('tasks')
      else if (student.role !== 'admin') navigate({ view: 'academics', branch: student.branch, username: student.username, role: 'student', tab: 'tasks', subjectCode: n.subjectCode, taskId: n.taskId })
    }
  }

  const handleThemeToggle = () => {
    quickToggleTheme(resolvedTheme, setTheme)
  }

  // Workspace-assembly entrance (assemble candidate only): the real
  // topbar drops in from above when the reveal flips; otherwise it
  // mounts at rest, exactly the element it was before.
  const assembleReveal = useAssembleReveal()
  const entrance = assembleEntrance('topbar', assembleReveal)

  return (
    <motion.header
      className="sticky top-0 z-20 bg-surface border-b border-slate-200 sm:h-16"
      initial={entrance.initial}
      animate={entrance.animate}
      transition={entrance.transition}
    >
      {/* Sticky chrome at z-20. Page content stays below this. See PortalShell. */}
      <div className={`h-full flex items-center justify-between gap-x-2 gap-y-1 px-4 sm:flex-nowrap sm:py-0 sm:gap-3 sm:px-6 lg:px-8 ${isStudent ? 'min-h-14 py-1' : 'flex-wrap pb-3 pt-1'}`}>
        {/* Left — mobile hamburger + Branch pill (from prototype V23) */}
        <div className={`flex items-center gap-1 sm:shrink-0 sm:gap-3 ${isStudent ? 'min-w-0' : 'shrink-0'}`}>
          <button
            type="button"
            onClick={onOpenMobileNav}
            aria-label="Open navigation menu"
            data-tour="topbar-mobile-nav"
            aria-haspopup="dialog"
            aria-controls="mobile-navigation"
            className={`${isStudent ? 'hidden sm:grid lg:hidden' : 'lg:hidden grid'} size-11 place-items-center -ml-2 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
          >
            <Menu className="w-5 h-5" />
          </button>
          {isStudent && <img src="/aics-logo.svg" alt="" aria-hidden="true" className="size-[28px] shrink-0 sm:hidden" />}
          <span className="min-w-0 text-sm font-semibold leading-tight text-slate-900 sm:hidden">{student.role === 'faculty' ? 'Faculty portal' : student.role === 'admin' ? 'Admin portal' : 'Student portal'}</span>
          {/* Branch chip: #153357 is the repo-wide brand navy (palette.ts
              `navy`, 40+ action-button/chip sites) — brand-constant in
              both themes per the dark-theme plan §2.5 navy-chip ruling,
              same class of literal as the protected #1769AA/#124D7A. */}
          <span className="hidden sm:inline-flex px-2.5 py-1 rounded bg-[#153357] text-white text-xs font-semibold tracking-wide">
            BRANCH: {student.branch?.toUpperCase() || 'MANILA'}
          </span>
        </div>

        {/* Center — global search */}
        <div className={`${isStudent ? 'hidden sm:flex' : 'flex'} order-last basis-full sm:order-none sm:basis-0 flex-1 justify-center min-w-0`}>
          {!compact && <GlobalSearch
            student={student}
            events={events}
            professors={professors}
            tasks={tasks}
            facultyData={facultyData}
            taskGroups={taskGroups}
            onNavigate={onNavigate}
          />}
        </div>

        {/* Right — theme toggle + notifications + profile dropdown + logout */}
        <div className="flex items-center gap-0.5 sm:gap-3 flex-shrink-0">
          {/* Theme quick toggle. First in the right cluster so the
              pre-existing controls keep their exact positions. */}
          <button
            type="button"
            onClick={handleThemeToggle}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className={`${isStudent ? 'hidden sm:grid' : 'grid'} size-11 sm:size-9 place-items-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
          >
            {isDark ? (
              <Sun className="w-5 h-5" aria-hidden />
            ) : (
              <Moon className="w-5 h-5" aria-hidden />
            )}
          </button>

          {compact ? (
            <button type="button" aria-label={bellLabel} aria-current={active === 'notifications' ? 'page' : undefined}
              data-tour="topbar-notifications" className={`${bellClass} ${active === 'notifications' ? 'bg-blue-50 text-link-strong' : ''}`}
              onClick={() => {
                inbox?.onRefresh()
                if (active !== 'notifications') onNavigate('notifications')
              }}>
              {bellIcon}
            </button>
          ) : <DropdownMenu
            onOpenChange={(open) => {
              if (open) inbox?.onRefresh()
            }}
          >
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={bellLabel}
                data-tour="topbar-notifications"
                className={bellClass}
              >
                {bellIcon}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-24px)] max-h-[calc(100dvh-128px)] overflow-y-auto">
              <div className="px-2 py-1.5 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Notifications</p>
                {unread > 0 && (
                  <button
                    type="button"
                    onClick={() => inbox?.onMark(undefined, true)}
                    className="text-xs font-medium text-link hover:underline"
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
                    onClick={() => openNotification(n)}
                    className="min-h-11 sm:min-h-0 cursor-pointer items-start"
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
          </DropdownMenu>}

          <div className="w-px h-6 bg-slate-200" aria-hidden="true" />

          {/* Profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                data-tour="topbar-profile"
                className="flex size-[44px] items-center justify-center gap-2.5 rounded-md hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:size-auto sm:py-1 sm:pl-1 sm:pr-2"
                aria-label="Account menu"
              >
                {student.photoUrl ? (
                  <img
                    src={student.photoUrl}
                    alt=""
                    className="size-[36px] shrink-0 rounded-full object-cover sm:size-9"
                    draggable={false}
                  />
                ) : (
                  <div
                    className="flex size-[36px] shrink-0 items-center justify-center rounded-full bg-[var(--avatar-bg)] text-xs font-semibold text-white sm:size-9 dark:ring-1 dark:ring-inset dark:ring-white/15"
                    aria-hidden="true"
                  >
                    {getInitials(student.fullName)}
                  </div>
                )}
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
              <DropdownMenuItem onClick={onProfile} className="min-h-11 sm:min-h-0 cursor-pointer">
                <User className="w-4 h-4 mr-2" />
                <span>Profile</span>
              </DropdownMenuItem>

              {/* Theme — full selector lives in Settings → Appearance */}
              <DropdownMenuItem onClick={() => navigate({ view: 'settings', branch: student.branch, username: student.username, role: student.role ?? 'student', section: 'appearance' })} className="min-h-11 sm:min-h-0 cursor-pointer">
                <Sun className="w-4 h-4 mr-2" />
                <span>Theme settings</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Sign out */}
              <DropdownMenuItem onClick={onLogout} className="min-h-11 sm:min-h-0 cursor-pointer text-red-600 focus:text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.header>
  )
}
