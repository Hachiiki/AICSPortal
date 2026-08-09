'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import type { View } from '@/lib/aics/types'
import { TEST_STUDENT } from '@/lib/aics/mock-data'
import { LoginView } from '@/components/auth/LoginView'
import { StudentDashboard } from '@/components/portal/StudentDashboard'
import { StudentProfile } from '@/components/portal/StudentProfile'

/**
 * AICS Portal — root page.
 *
 * Acts as a thin view router between the three top-level screens:
 *   - login     → LoginView (credentials / face ID)
 *   - dashboard → StudentDashboard (grades, subjects, weekly schedule)
 *   - profile   → StudentProfile (personal info, digital ID, COE)
 *
 * All real UI lives in dedicated component files under
 *   src/components/auth/    and    src/components/portal/
 * Shared types, palette, helpers, and mock data live in
 *   src/lib/aics/
 */
export default function AICSLoginPage() {
  const [view, setView] = useState<View>('login')

  const handleLogin = useCallback(() => {
    setView('dashboard')
  }, [])

  const handleLogout = useCallback(() => {
    setView('login')
    toast.info('You have been signed out.')
  }, [])

  if (view === 'dashboard') {
    return (
      <StudentDashboard
        student={TEST_STUDENT}
        onProfile={() => setView('profile')}
        onLogout={handleLogout}
      />
    )
  }

  if (view === 'profile') {
    return (
      <StudentProfile
        student={TEST_STUDENT}
        onBack={() => setView('dashboard')}
        onLogout={handleLogout}
      />
    )
  }

  return <LoginView onLogin={handleLogin} />
}
