'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { usePortalRoute } from '@/lib/aics/use-portal-route'
import { useAuth, useStudentData } from '@/lib/aics/use-student-data'
import { LoginView } from '@/components/auth/LoginView'
import { BranchRedirect } from '@/components/auth/BranchRedirect'
import { StudentDashboard } from '@/components/portal/StudentDashboard'
import { StudentProfile } from '@/components/portal/StudentProfile'
import { AcademicsPage } from '@/components/portal/AcademicsPage'
import { MobileWarning } from '@/components/MobileWarning'

/**
 * AICS Portal — root page (also rendered by the catch-all route
 * at src/app/portal/[...slug]/page.tsx).
 *
 * URL structure:
 *   /portal/login                                    → LoginView
 *   /portal/{branch}/student/{username}              → StudentDashboard
 *   /portal/{branch}/student/{username}/profile      → StudentProfile
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
// ============================================================

function StudentDataWrapper({
  username,
  route,
  navigate,
  onLogout,
}: {
  username: string
  route: { view: 'dashboard' | 'profile' | 'academics'; branch: string; username: string }
  navigate: (r: any) => void
  onLogout: () => void
}) {
  const { student, loading, error } = useStudentData(username)

  if (loading) {
    return (
      <div className="min-h-dvh bg-slate-50 grid place-items-center">
        <div className="text-slate-500 text-sm">Loading your portal…</div>
      </div>
    )
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

  if (route.view === 'profile') {
    return (
      <StudentProfile
        student={student}
        onBack={() => navigate({ view: 'dashboard', branch: route.branch, username: route.username })}
        onLogout={onLogout}
      />
    )
  }

  if (route.view === 'academics') {
    return (
      <AcademicsPage
        student={student}
        onBack={() => navigate({ view: 'dashboard', branch: route.branch, username: route.username })}
        onLogout={onLogout}
      />
    )
  }

  return (
    <StudentDashboard
      student={student}
      onProfile={() => navigate({ view: 'profile', branch: route.branch, username: route.username })}
      onAcademics={() => navigate({ view: 'academics', branch: route.branch, username: route.username })}
      onLogout={onLogout}
    />
  )
}
