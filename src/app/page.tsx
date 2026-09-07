'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { usePortalRoute, type PortalRoute, type PortalRole } from '@/lib/aics/use-portal-route'
import { useAuth, useStudentData } from '@/lib/aics/use-student-data'
import { LoginView } from '@/components/auth/LoginView'
import { BranchRedirect } from '@/components/auth/BranchRedirect'
import { StudentDashboard } from '@/components/portal/StudentDashboard'
import { FacultyDashboard } from '@/components/faculty/FacultyDashboard'
import { FacultyStudentsPage } from '@/components/faculty/FacultyStudentsPage'
import { FacultyGradeEncodingPage } from '@/components/faculty/FacultyGradeEncodingPage'
import { FacultyPreviousRecordsPage } from '@/components/faculty/FacultyPreviousRecordsPage'
import { FacultyAnnouncementsPage } from '@/components/faculty/FacultyAnnouncementsPage'
import { FacultySchedulePage } from '@/components/faculty/FacultySchedulePage'
import { FacultyTasksPage } from '@/components/faculty/FacultyTasksPage'
import { AdminReleasePage } from '@/components/admin/AdminReleasePage'
import { StudentProfile } from '@/components/portal/StudentProfile'
import { AcademicsPage } from '@/components/portal/AcademicsPage'
import { EventsPage } from '@/components/portal/EventsPage'
import { ProfessorsPage } from '@/components/portal/ProfessorsPage'
import { EnrollmentPage } from '@/components/portal/EnrollmentPage'
import { SettingsPage } from '@/components/portal/SettingsPage'
import { DashboardSkeleton, AcademicsSkeleton, ProfileSkeleton, EventsSkeleton, ProfessorsSkeleton } from '@/components/portal/Skeleton'
import { MobileWarning } from '@/components/MobileWarning'
import type { View } from '@/lib/aics/types'
import type { Task } from '@/lib/aics/tasks'
import type { PortalEvent, EventCategory } from '@/lib/aics/events'
import type { Professor } from '@/lib/aics/professors'
import type { Enrollment } from '@/lib/aics/enrollment'
import type { Announcement } from '@/lib/aics/announcements'
import type { FacultyMember, FacultyStudent } from '@/lib/aics/faculty'

/**
 * AICS Portal — root page (also rendered by the catch-all route
 * at src/app/portal/[...slug]/page.tsx).
 *
 * URL structure:
 *   /portal/login                                    → LoginView
 *   /portal/{branch}/student/{username}              → StudentDashboard
 *   /portal/{branch}/student/{username}/profile      → StudentProfile
 *   /portal/{branch}/student/{username}/academics    → AcademicsPage
 *   /portal/{branch}/student/{username}/events       → EventsPage
 *   /portal/{branch}/student/{username}/professors   → ProfessorsPage
 *   /portal/{branch}/student/{username}/enrollment    → EnrollmentPage
 *   /portal/{branch}/faculty/{username}                   → FacultyDashboard
 *   /portal/{branch}/faculty/{username}/my-students       → FacultyStudentsPage
 *   /portal/{branch}/faculty/{username}/grade-encoding    → FacultyGradeEncodingPage
 *   /portal/{branch}/faculty/{username}/previous-records  → FacultyPreviousRecordsPage
 *   /portal/{branch}/faculty/{username}/announcements     → FacultyAnnouncementsPage
 *   /portal/{branch}/faculty/{username}/schedule          → FacultySchedulePage
 *   /portal/{branch}/faculty/{username}/tasks             → FacultyTasksPage
 *   /portal/{branch}/admin/{username}                     → AdminReleasePage
 *
 * Auth rules:
 *   - Unauthenticated + protected route → redirect to /portal/login
 *   - Authenticated + /portal/login → redirect to dashboard
 *   - Root / → redirect to /portal/login (or dashboard if authed)
 *   - Session persists in localStorage across refreshes
 */
export default function AICSLoginPage() {
  const { route, navigate } = usePortalRoute()
  const { username, branch, role, loading: authLoading, login, logout } = useAuth()
  const [redirecting, setRedirecting] = useState(false)
  const [redirectBranch, setRedirectBranch] = useState<string>('')
  const [redirectRole, setRedirectRole] = useState<string>('')

  // --- Route guards ---
  useEffect(() => {
    if (authLoading) return

    const isLoginRoute = route.view === 'login'
    const isProtectedRoute = !isLoginRoute

    // Unauthenticated user trying to access a protected route → login
    if (!username && isProtectedRoute) {
      navigate({ view: 'login' })
      return
    }

    // Authenticated user on the login page → redirect to dashboard
    if (username && branch && isLoginRoute) {
      navigate({ view: 'dashboard', branch, username, role: (role || 'student') as PortalRole })
      return
    }
  }, [authLoading, username, branch, role, route.view, navigate])

  const handleLogin = useCallback(
    async (user: string, pass: string): Promise<{ ok: boolean; error?: string }> => {
      const result = await login(user, pass)
      if (result.ok && result.branch) {
        setRedirectBranch(result.branch)
        setRedirectRole(result.role || 'student')
        setRedirecting(true)
      }
      return result
    },
    [login]
  )

  const handleRedirectComplete = useCallback(() => {
    setRedirecting(false)
    if (redirectBranch && username) {
      navigate({ view: 'dashboard', branch: redirectBranch, username, role: (redirectRole || 'student') as PortalRole })
    }
  }, [redirectBranch, redirectRole, username, navigate])

  const handleLogout = useCallback(() => {
    logout()
    navigate({ view: 'login' })
    toast.info('You have been signed out.')
  }, [logout, navigate])

  // Still resolving auth state (SSR → client hydration)
  if (authLoading) return null

  // Show the branch redirect animation overlay
  if (redirecting) {
    return (
      <>
        <BranchRedirect branch={redirectBranch} onComplete={handleRedirectComplete} />
        <MobileWarning />
      </>
    )
  }

  // Not authenticated → show login (regardless of URL)
  if (!username) {
    return (
      <>
        <LoginView onLogin={handleLogin} />
        <MobileWarning />
      </>
    )
  }

  // Authenticated but on login route → the useEffect guard will redirect.
  // Show nothing in the meantime to avoid flashing the login form.
  if (route.view === 'login') {
    return <MobileWarning />
  }

  // Authenticated + protected route → render the right view
  return (
    <>
      <StudentDataWrapper
        username={username}
        route={route}
        navigate={navigate}
        onLogout={handleLogout}
      />
      <MobileWarning />
    </>
  )
}

// ============================================================
//  Wrapper that fetches student data and renders the right view
//
//  CENTRALIZED NAVIGATION:
//  Instead of passing individual callback props (onBack, onProfile,
//  onAcademics, onEvents, onProfessors, ...) to each page, we pass
//  a single `onNavigate(view: View)` function. Each page calls
//  `onNavigate('academics')` or `onNavigate('dashboard')` etc.
//
//  This means adding a new sidebar tab only requires:
//    1. Add the view to the `View` type (types.ts)
//    2. Add the route to parsePath/routeToPath (use-portal-route.ts)
//    3. Add the nav item to Sidebar.tsx
//    4. Create the page component
//    5. Add one `if (route.view === 'newView')` block below
//
//  No existing page needs to change — they all use `onNavigate`.
// ============================================================

function StudentDataWrapper({
  username,
  route,
  navigate,
  onLogout,
}: {
  username: string
  route: PortalRoute
  navigate: (r: PortalRoute) => void
  onLogout: () => void
}) {
  const { student, courses, sessions, loading, error } = useStudentData(username)

  // ----------------------------------------------------------
  //  Centralized navigation handler.
  //  Every page receives this as `onNavigate` and calls it with
  //  a View string. The routing logic lives HERE, not in each
  //  page component. Adding a new view = adding one case here.
  // ----------------------------------------------------------
  const handleNavigate = useCallback((view: View) => {
    if (view === 'login') {
      onLogout()
      return
    }
    if (route.view === 'login') return
    navigate({
      view: view as PortalRoute['view'],
      branch: route.branch,
      username: route.username,
      role: route.role,
    } as PortalRoute)
  }, [navigate, route, onLogout])

  // ----------------------------------------------------------
  //  Tasks + Events + Professors data — lifted here so it
  //  persists across ALL route switches.
  // ----------------------------------------------------------
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [tasksError, setTasksError] = useState<string | null>(null)

  const [events, setEvents] = useState<PortalEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventsError, setEventsError] = useState<string | null>(null)

  const [professors, setProfessors] = useState<Professor[]>([])
  const [professorsLoading, setProfessorsLoading] = useState(true)
  const [professorsError, setProfessorsError] = useState<string | null>(null)

  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [enrollmentLoading, setEnrollmentLoading] = useState(true)
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null)

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [announcementsLoading, setAnnouncementsLoading] = useState(true)

  // Faculty-specific data (only fetched for faculty users, but lifted
  // here so it persists across route switches — same pattern as tasks/events)
  const [facultyData, setFacultyData] = useState<{ faculty: FacultyMember; subjects: any[]; students: FacultyStudent[] } | null>(null)
  const [facultyLoading, setFacultyLoading] = useState(true)

  const refreshFacultyData = useCallback(async () => {
    try {
      const res = await fetch(`/api/faculty?username=${encodeURIComponent(username)}`)
      const data = await res.json()
      if (data.ok) setFacultyData({ faculty: data.faculty, subjects: data.subjects, students: data.students })
    } catch {}
  }, [username])

  // Released teaching history for the Previous Records tab. Lifted
  // here for the same reason as facultyData: tab switches unmount
  // pages, so anything a page fetches on mount refetches on every
  // visit and flashes a skeleton like a hard refresh.
  //
  // Permanent rule for future tabs: tab pages never fetch on mount.
  // Shared server data lives in this wrapper. It prefetches in the
  // background once the faculty roster lands, so first visits render
  // instantly, and it never refetches within a session.
  // On-demand fetches belong behind user actions only.
  const [historyData, setHistoryData] = useState<{ terms: any[] } | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  const fetchHistoryData = useCallback(async () => {
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const res = await fetch(`/api/faculty/history?username=${encodeURIComponent(username)}`)
      const data = await res.json()
      if (data.ok) setHistoryData({ terms: data.terms || [] })
      else setHistoryError(data.error || 'Failed to load teaching history.')
    } catch {
      setHistoryError('Network error. Please try again.')
    } finally {
      setHistoryLoading(false)
    }
  }, [username])

  // Faculty task groups for the Tasks tab. Prefetched with history
  // below, same once-per-session rule.  const [taskGroupsData, setTaskGroupsData] = useState<{ groups: any[] } | null>(null)
  const [taskGroupsLoading, setTaskGroupsLoading] = useState(false)
  const [taskGroupsError, setTaskGroupsError] = useState<string | null>(null)

  const fetchTaskGroups = useCallback(async () => {
    setTaskGroupsLoading(true)
    setTaskGroupsError(null)
    try {
      const res = await fetch(`/api/faculty/tasks?username=${encodeURIComponent(username)}`)
      const data = await res.json()
      if (data.ok) setTaskGroupsData({ groups: data.groups || [] })
      else setTaskGroupsError(data.error || 'Failed to load tasks.')
    } catch {
      setTaskGroupsError('Network error. Please try again.')
    } finally {
      setTaskGroupsLoading(false)
    }
  }, [username])

  // Events page UI preferences — lifted here so they persist across
  // route switches. Without this, navigating away from Events and
  // back would reset the task-due toggle and category filters.
  const [showTasks, setShowTasks] = useState(true)
  const [enabledCats, setEnabledCats] = useState<Set<EventCategory>>(
    new Set(['academic', 'deadline', 'campus', 'holiday'])
  )

  useEffect(() => {
    let cancelled = false
    async function fetchAll() {
      try {
        const [tkRes, evRes, profRes, enrRes, annRes, facRes] = await Promise.all([
          fetch(`/api/tasks?username=${encodeURIComponent(username)}`),
          fetch(`/api/events?username=${encodeURIComponent(username)}`),
          fetch(`/api/professors?username=${encodeURIComponent(username)}`),
          fetch(`/api/enrollment?username=${encodeURIComponent(username)}`),
          fetch(`/api/announcements?username=${encodeURIComponent(username)}`),
          fetch(`/api/faculty?username=${encodeURIComponent(username)}`),
        ])
        const [tkData, evData, profData, enrData, annData, facData] = await Promise.all([
          tkRes.json(),
          evRes.json(),
          profRes.json(),
          enrRes.json(),
          annRes.json(),
          facRes.json(),
        ])
        if (cancelled) return
        if (tkData.ok) setTasks(tkData.tasks)
        else setTasksError(tkData.error || 'Failed to load tasks')
        if (evData.ok) setEvents(evData.events)
        else setEventsError(evData.error || 'Failed to load events')
        if (profData.ok) setProfessors(profData.professors)
        else setProfessorsError(profData.error || 'Failed to load professors')
        // Enrollment is a single record (not found is fine — the page shows an
        // empty state). Only set an error if the API itself fails.
        if (enrData.ok) setEnrollment(enrData.enrollment ?? null)
        else setEnrollmentError(enrData.error || 'Failed to load enrollment')
        if (annData.ok) setAnnouncements(annData.announcements)
        // Announcements failure is non-fatal — dashboard shows empty state
        // Faculty data (non-fatal for student users — the API returns 404)
        if (facData.ok) setFacultyData({ faculty: facData.faculty, subjects: facData.subjects, students: facData.students })
      } catch {
        if (!cancelled) {
          setTasksError('Network error')
          setEventsError('Network error')
          setProfessorsError('Network error')
          setEnrollmentError('Network error')
        }
      } finally {
        if (!cancelled) {
          setTasksLoading(false)
          setEventsLoading(false)
          setProfessorsLoading(false)
          setEnrollmentLoading(false)
          setAnnouncementsLoading(false)
          setFacultyLoading(false)
        }
      }
    }
    fetchAll()
    return () => { cancelled = true }
  }, [username])

  // Prefetch faculty-only slices in the background once the roster
  // lands, so first tab visits render instantly. Each fetch is
  // guarded to run at most once per session. Non-faculty sessions
  // never have facultyData, so they pay nothing.
  useEffect(() => {
    if (!facultyData) return
    if (!historyData && !historyLoading) fetchHistoryData()
    if (!taskGroupsData && !taskGroupsLoading) fetchTaskGroups()
  }, [facultyData, historyData, historyLoading, taskGroupsData, taskGroupsLoading, fetchHistoryData, fetchTaskGroups])

  if (loading) {
    return <PortalSkeleton view={route.view} />
  }

  if (error || !student) {
    return (
      <div className="min-h-dvh bg-slate-50 grid place-items-center">
        <div className="text-center">
          <p className="text-red-600 text-sm font-medium mb-2">
            {error || 'Failed to load student data.'}
          </p>
          <button
            onClick={onLogout}
            className="text-blue-600 text-sm font-medium hover:underline"
          >
            Back to login
          </button>
        </div>
      </div>
    )
  }

  // ----------------------------------------------------------
  //  Render the right page based on route.view.
  //  Each page receives `onNavigate` + `onLogout` + its data props.
  //  No individual navigation callbacks — just `onNavigate`.
  // ----------------------------------------------------------

  // Faculty users get faculty pages for dashboard, my-students,
  // grade-encoding, and previous-records. Profile and settings reuse
  // the shared pages, which render inside PortalShell with role-aware
  // nav so the sidebar and top bar never change between tabs.
  // Admin users get the release queue. Any other admin view falls
  // back to it since admin has no other screens yet.
  if (route.view !== 'login' && route.role === 'admin' && route.view !== 'settings') {
    return (
      <AdminReleasePage
        student={student}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        events={events}
        professors={professors}
        tasks={tasks}
      />
    )
  }

  if (route.view === 'dashboard' && route.role === 'faculty') {
    return (
      <FacultyDashboard
        student={student}
        courses={courses}
        sessions={sessions}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        events={events}
        professors={professors}
        tasks={tasks}
        announcements={announcements}
        facultyData={facultyData}
        facultyLoading={facultyLoading}
      />
    )
  }

  if (route.view === 'my-students' && route.role === 'faculty') {
    return (
      <FacultyStudentsPage
        student={student}
        courses={courses}
        sessions={sessions}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        events={events}
        professors={professors}
        tasks={tasks}
        announcements={announcements}
        facultyData={facultyData}
        facultyLoading={facultyLoading}
      />
    )
  }

  if (route.view === 'grade-encoding' && route.role === 'faculty') {
    return (
      <FacultyGradeEncodingPage
        student={student}
        courses={courses}
        sessions={sessions}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        events={events}
        professors={professors}
        tasks={tasks}
        announcements={announcements}
        facultyData={facultyData}
        facultyLoading={facultyLoading}
        onRefresh={refreshFacultyData}
      />
    )
  }

  if (route.view === 'previous-records' && route.role === 'faculty') {
    return (
      <FacultyPreviousRecordsPage
        student={student}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        events={events}
        professors={professors}
        tasks={tasks}
        facultyData={facultyData}
        facultyLoading={facultyLoading}
        historyData={historyData}
        historyLoading={historyLoading}
        historyError={historyError}
        onFetchHistory={fetchHistoryData}
      />
    )
  }

  if (route.view === 'announcements' && route.role === 'faculty') {
    return (
      <FacultyAnnouncementsPage
        student={student}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        events={events}
        professors={professors}
        tasks={tasks}
        announcements={announcements}
        facultyData={facultyData}
      />
    )
  }

  if (route.view === 'schedule' && route.role === 'faculty') {
    return (
      <FacultySchedulePage
        student={student}
        courses={courses}
        sessions={sessions}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        events={events}
        professors={professors}
        tasks={tasks}
        facultyData={facultyData}
        facultyLoading={facultyLoading}
      />
    )
  }

  if (route.view === 'tasks' && route.role === 'faculty') {
    return (
      <FacultyTasksPage
        student={student}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        events={events}
        professors={professors}
        tasks={tasks}
        facultyData={facultyData}
        facultyLoading={facultyLoading}
        taskGroupsData={taskGroupsData}
        taskGroupsLoading={taskGroupsLoading}
        taskGroupsError={taskGroupsError}
        onFetchTaskGroups={fetchTaskGroups}
      />
    )
  }

  if (route.view === 'profile') {
    return (
      <StudentProfile
        student={student}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        events={events}
        professors={professors}
        tasks={tasks}
        facultyData={facultyData}
      />
    )
  }

  if (route.view === 'academics') {
    return (
      <AcademicsPage
        student={student}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        tasks={tasks}
        tasksLoading={tasksLoading}
        tasksError={tasksError}
        setTasks={setTasks}
        events={events}
        professors={professors}
      />
    )
  }

  if (route.view === 'events') {
    return (
      <EventsPage
        student={student}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        events={events}
        eventsLoading={eventsLoading}
        eventsError={eventsError}
        tasks={tasks}
        showTasks={showTasks}
        setShowTasks={setShowTasks}
        enabledCats={enabledCats}
        setEnabledCats={setEnabledCats}
        professors={professors}
      />
    )
  }

  if (route.view === 'professors') {
    return (
      <ProfessorsPage
        student={student}
        professors={professors}
        courses={courses}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        events={events}
        tasks={tasks}
      />
    )
  }

  if (route.view === 'enrollment') {
    return (
      <EnrollmentPage
        student={student}
        enrollment={enrollment}
        enrollmentLoading={enrollmentLoading}
        enrollmentError={enrollmentError}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        events={events}
        professors={professors}
        tasks={tasks}
      />
    )
  }

  if (route.view === 'settings') {
    return (
      <SettingsPage
        student={student}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        events={events}
        professors={professors}
        tasks={tasks}
        facultyData={facultyData}
      />
    )
  }

  return (
    <StudentDashboard
      student={student}
      courses={courses}
      sessions={sessions}
      onNavigate={handleNavigate}
      onLogout={onLogout}
      events={events}
      professors={professors}
      tasks={tasks}
      announcements={announcements}
    />
  )
}

// ============================================================
//  PortalSkeleton — picks the right skeleton layout for the
//  view being loaded. Each skeleton mirrors the real page's
//  shell (sidebar + topbar + main content blocks) so the
//  transition from skeleton → real content is jitter-free.
//
//  To add a new view's skeleton: add one `if` line here.
// ============================================================

function PortalSkeleton({ view }: { view: string }) {
  if (view === 'academics') return <AcademicsSkeleton />
  if (view === 'profile') return <ProfileSkeleton />
  if (view === 'events') return <EventsSkeleton />
  if (view === 'professors') return <ProfessorsSkeleton />
  return <DashboardSkeleton />
}
