'use client'

import { useMemo } from 'react'
import type { Student, View } from '@/lib/aics/types'
import type { Course, Session } from '@/lib/schedule'
import type { PortalEvent } from '@/lib/aics/events'
import type { Professor } from '@/lib/aics/professors'
import type { Task } from '@/lib/aics/tasks'
import type { NotificationInbox } from '@/lib/aics/notifications'
import type { FacultyMember, FacultyStudent } from '@/lib/aics/faculty'
import { PortalShell } from '../portal/PortalShell'
import { ScheduleGrid } from '../portal/ScheduleGrid'
import { DashboardSkeleton } from '../portal/Skeleton'

interface FacultySchedulePageProps {
  student: Student
  courses: Course[]
  sessions: Session[]
  onNavigate: (view: View) => void
  onLogout: () => void
  events?: PortalEvent[]
  professors?: Professor[]
  tasks?: Task[]
  facultyData?: { faculty: FacultyMember; subjects: any[]; students: FacultyStudent[] } | null
  inbox?: NotificationInbox
  facultyLoading?: boolean
}

export function FacultySchedulePage({
  student, courses, sessions, onNavigate, onLogout,
  events, professors, tasks, facultyData, facultyLoading,
  inbox,
}: FacultySchedulePageProps) {
  const faculty = facultyData?.faculty ?? null
  const loading = facultyLoading ?? true

  // Only sessions for codes this faculty teaches this term. The
  // sessions collection carries no professor field, so the taught
  // code list is the filter.
  const { myCourses, mySessions, classCount } = useMemo(() => {
    if (!facultyData) return { myCourses: [], mySessions: [], classCount: 0 }
    const codes = new Set(
      (facultyData.subjects as any[])
        .filter((s) => (s.academicYear || '') === (faculty?.academicYear || '') && (s.semester || '') === (faculty?.semester || ''))
        .map((s) => s.code)
    )
    return {
      myCourses: courses.filter((c) => codes.has(c.code)),
      mySessions: sessions.filter((s) => codes.has(s.code)),
      classCount: codes.size,
    }
  }, [facultyData, faculty, courses, sessions])

  if (loading || !faculty) {
    if (loading) return <DashboardSkeleton />
    return (
      <div className="min-h-dvh bg-slate-50 grid place-items-center">
        <p className="text-sm text-red-600">Faculty data not found.</p>
      </div>
    )
  }

  return (
    <PortalShell
      student={student}
      active="schedule"
      onNavigate={onNavigate}
      onLogout={onLogout}
      events={events}
      professors={professors}
      tasks={tasks}
      facultyData={facultyData}
      inbox={inbox}
    >
      <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Schedule</h1>
          <p className="text-sm text-slate-500 mt-1">
            Your weekly classes only • {classCount} {classCount === 1 ? 'subject' : 'subjects'} this term
          </p>
        </div>
        {mySessions.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-600">No scheduled sessions</p>
            <p className="text-xs text-slate-400 mt-1">Sessions for your subjects will appear here once set.</p>
          </div>
        ) : (
          <ScheduleGrid courses={myCourses} sessions={mySessions} />
        )}
      </main>
    </PortalShell>
  )
}
