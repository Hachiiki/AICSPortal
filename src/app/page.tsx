'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { usePortalRoute, type PortalRoute } from '@/lib/aics/use-portal-route'
import { useAuth, useStudentData } from '@/lib/aics/use-student-data'
import { LoginView } from '@/components/auth/LoginView'
import { BranchRedirect } from '@/components/auth/BranchRedirect'
import { StudentDashboard } from '@/components/portal/StudentDashboard'
import { StudentProfile } from '@/components/portal/StudentProfile'
import { AcademicsPage } from '@/components/portal/AcademicsPage'
import { EventsPage } from '@/components/portal/EventsPage'
import { ProfessorsPage } from '@/components/portal/ProfessorsPage'
import { DashboardSkeleton, AcademicsSkeleton, ProfileSkeleton, EventsSkeleton, ProfessorsSkeleton } from '@/components/portal/Skeleton'
import { MobileWarning } from '@/components/MobileWarning'
import type { View } from '@/lib/aics/types'
import type { Task } from '@/lib/aics/tasks'
import type { PortalEvent, EventCategory } from '@/lib/aics/events'
import type { Professor } from '@/lib/aics/professors'

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
 *
 * Auth rules:
 *   - Unauthenticated + protected route → redirect to /portal/login
 *   - Authenticated + /portal/login → redirect to dashboard
 *   - Root / → redirect to /portal/login (or dashboard if authed)
 *   - Session persists in localStorage across refreshes
 */
export default function AICSLoginPage() {
  const { route, navigate } = usePortalRoute()
  const { username, branch, loading: authLoading, login, logout } = useAuth()
  const [redirecting, setRedirecting] = useState(false)
  const [redirectBranch, setRedirectBranch] = useState<string>('')

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
      navigate({ view: 'dashboard', branch, username })
      return
    }
  }, [authLoading, username, branch, route.view, navigate])

  const handleLogin = useCallback(
    async (user: string, pass: string): Promise<{ ok: boolean; error?: string }> => {
      const result = await login(user, pass)
      if (result.ok && result.branch) {
        setRedirectBranch(result.branch)
        setRedirecting(true)
      }
      return result
    },
    [login]
  )

  const handleRedirectComplete = useCallback(() => {
    setRedirecting(false)
    if (redirectBranch && username) {
      navigate({ view: 'dashboard', branch: redirectBranch, username })
    }
  }, [redirectBranch, username, navigate])

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
    // All non-login views need branch + username
    if (route.view === 'login') return
    navigate({
      view: view as PortalRoute['view'],
      branch: route.branch,
      username: route.username,
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
        const [tkRes, evRes, profRes] = await Promise.all([
          fetch(`/api/tasks?username=${encodeURIComponent(username)}`),
          fetch(`/api/events?username=${encodeURIComponent(username)}`),
          fetch(`/api/professors?username=${encodeURIComponent(username)}`),
        ])
        const [tkData, evData, profData] = await Promise.all([tkRes.json(), evRes.json(), profRes.json()])
        if (cancelled) return
        if (tkData.ok) setTasks(tkData.tasks)
        else setTasksError(tkData.error || 'Failed to load tasks')
        if (evData.ok) setEvents(evData.events)
        else setEventsError(evData.error || 'Failed to load events')
        if (profData.ok) setProfessors(profData.professors)
        else setProfessorsError(profData.error || 'Failed to load professors')
      } catch {
        if (!cancelled) {
          setTasksError('Network error')
          setEventsError('Network error')
          setProfessorsError('Network error')
        }
      } finally {
        if (!cancelled) {
          setTasksLoading(false)
          setEventsLoading(false)
          setProfessorsLoading(false)
        }
      }
    }
    fetchAll()
    return () => { cancelled = true }
  }, [username])

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
  if (route.view === 'profile') {
    return (
      <StudentProfile
        student={student}
        onNavigate={handleNavigate}
        onLogout={onLogout}
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
      />
    )
  }

  if (route.view === 'professors') {
    return (
      <ProfessorsPage
        student={student}
        professors={professors}
        onNavigate={handleNavigate}
        onLogout={onLogout}
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
