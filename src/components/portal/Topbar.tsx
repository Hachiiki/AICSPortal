'use client'

import { Menu, Bell, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import type { Student } from '@/lib/aics/types'
import { getInitials } from '@/lib/aics/format'

interface TopbarProps {
  student: Student
  onOpenMobileNav: () => void
  onProfile: () => void
}

export function Topbar({ student, onOpenMobileNav, onProfile }: TopbarProps) {
  const handleNotifications = () => {
    toast.info('No new notifications.')
  }

  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200">
      <div className="h-full flex items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left — mobile hamburger */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={onOpenMobileNav}
            aria-label="Open navigation menu"
            className="lg:hidden p-2 -ml-2 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Right — notifications + profile */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleNotifications}
            aria-label="Notifications"
            className="p-2 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Bell className="w-5 h-5" />
          </button>

          <div className="w-px h-6 bg-slate-200" aria-hidden="true" />

          <button
            type="button"
            onClick={onProfile}
            className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-md hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
        </div>
      </div>
    </header>
  )
}
