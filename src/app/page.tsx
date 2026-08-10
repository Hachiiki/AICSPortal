'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AnimatePresence } from 'framer-motion'
import { usePortalRoute } from '@/lib/aics/use-portal-route'
import { useAuth, useStudentData } from '@/lib/aics/use-student-data'
import { LoginView } from '@/components/auth/LoginView'
import { BranchRedirect } from '@/components/auth/BranchRedirect'
import { StudentDashboard } from '@/components/portal/StudentDashboard'
import { StudentProfile } from '@/components/portal/StudentProfile'

/**
 * AICS Portal — root page.
 *
 * URL structure:
 *   /portal/login                              → LoginView
 *   /portal/{branch}/student/{username}        → StudentDashboard
 *   /portal/{branch}/student/{username}/profile → StudentProfile
 *
 * After a successful login, a BranchRedirect animation plays that
 * detects the student's branch and shows "Redirecting to your
 * branch: {branch}" before navigating to the dashboard.
 */
export default function AICSLoginPage() {
  const { route, navigate } = usePortalRoute()
  const { username, branch, loading: authLoading, login, logout } = useAuth()
  const [redirecting, setRedirecting] = useState(false)
  const [redirectBranch, setRedirectBranch] = useState<string>('')

  // If auth resolves and there's no logged-in user, go to login.
  useEffect(() => {
    if (!authLoading && !username && route.view !== 'login') {
      navigate({ view: 'login' })
    }
  }, [authLoading, username, route.view, navigate])

  const handleLogin = useCallback(
    async (user: string, pass: string): Promise<{ ok: boolean; error?: string }> => {
      const result = await login(user, pass)
      if (result.ok && result.branch) {
        // Show the branch redirect animation
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

  if (authLoading) return null

  // Show the branch redirect animation overlay
  if (redirecting) {
    return (
      <BranchRedirect
        branch={redirectBranch}
        onComplete={handleRedirectComplete}
      />
    )
  }

  // Login screen
  if (!username || route.view === 'login') {
    return <LoginView onLogin={handleLogin} />
  }

  // Fetch student data from MongoDB and render the right view
  return (
    <StudentDataWrapper
      username={username}
      route={route}
      navigate={navigate}
      onLogout={handleLogout}
    />
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
  route: { view: 'dashboard' | 'profile'; branch: string; username: string }
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

  return (
    <StudentDashboard
      student={student}
      onProfile={() => navigate({ view: 'profile', branch: route.branch, username: route.username })}
      onLogout={onLogout}
    />
  )
}
