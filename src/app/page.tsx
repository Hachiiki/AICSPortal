'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { usePortalRoute } from '@/lib/aics/use-portal-route'
import { useAuth, useStudentData } from '@/lib/aics/use-student-data'
import type { Student } from '@/lib/aics/types'
import { LoginView } from '@/components/auth/LoginView'
import { StudentDashboard } from '@/components/portal/StudentDashboard'
import { StudentProfile } from '@/components/portal/StudentProfile'
import type { Course, Session } from '@/lib/schedule'

/**
 * AICS Portal — root page.
 *
 * Uses the History API (via `usePortalRoute`) to sync the browser URL
 * with the current screen, and MongoDB (via `useAuth` + `useStudentData`)
 * for authentication and data:
 *   /portal/login                       → LoginView
 *   /portal/student/:username           → StudentDashboard
 *   /portal/student/:username/profile   → StudentProfile
 */
export default function AICSLoginPage() {
  const { route, navigate } = usePortalRoute()
  const { username, loading: authLoading, login, logout } = useAuth()

  // If the auth state resolves and there's no logged-in user, make sure
  // we're on the login route.
  useEffect(() => {
    if (!authLoading && !username && route.view !== 'login') {
      navigate({ view: 'login' })
    }
  }, [authLoading, username, route.view, navigate])

  const handleLogin = useCallback(
    async (user: string, pass: string): Promise<{ ok: boolean; error?: string }> => {
      const result = await login(user, pass)
      if (result.ok) {
        navigate({ view: 'dashboard', username: user })
      }
      return result
    },
    [login, navigate]
  )

  const handleLogout = useCallback(() => {
    logout()
    navigate({ view: 'login' })
    toast.info('You have been signed out.')
  }, [logout, navigate])

  // Show nothing while checking auth state to avoid flash
  if (authLoading) return null

  // Login screen
  if (!username || route.view === 'login') {
    return <LoginView onLogin={handleLogin} />
  }

  // Fetch student data from MongoDB
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
  route: { view: 'dashboard' | 'profile'; username: string }
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
        onBack={() => navigate({ view: 'dashboard', username: route.username })}
        onLogout={onLogout}
      />
    )
  }

  return (
    <StudentDashboard
      student={student}
      onProfile={() => navigate({ view: 'profile', username: route.username })}
      onLogout={onLogout}
    />
  )
}
