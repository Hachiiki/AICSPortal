'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { TEST_STUDENT } from '@/lib/aics/mock-data'
import { usePortalRoute } from '@/lib/aics/use-portal-route'
import { LoginView } from '@/components/auth/LoginView'
import { StudentDashboard } from '@/components/portal/StudentDashboard'
import { StudentProfile } from '@/components/portal/StudentProfile'

/**
 * AICS Portal — root page.
 *
 * Uses the History API (via `usePortalRoute`) to sync the browser URL
 * with the current screen:
 *   /portal/login                       → LoginView
 *   /portal/student/:username           → StudentDashboard
 *   /portal/student/:username/profile   → StudentProfile
 *
 * All real UI lives in dedicated component files under
 *   src/components/auth/    and    src/components/portal/
 */
export default function AICSLoginPage() {
  const { route, navigate } = usePortalRoute()

  const handleLogin = useCallback(() => {
    navigate({ view: 'dashboard', username: TEST_STUDENT.username })
  }, [navigate])

  const handleLogout = useCallback(() => {
    navigate({ view: 'login' })
    toast.info('You have been signed out.')
  }, [navigate])

  if (route.view === 'dashboard') {
    return (
      <StudentDashboard
        student={TEST_STUDENT}
        onProfile={() => navigate({ view: 'profile', username: route.username })}
        onLogout={handleLogout}
      />
    )
  }

  if (route.view === 'profile') {
    return (
      <StudentProfile
        student={TEST_STUDENT}
        onBack={() => navigate({ view: 'dashboard', username: route.username })}
        onLogout={handleLogout}
      />
    )
  }

  return <LoginView onLogin={handleLogin} />
}
