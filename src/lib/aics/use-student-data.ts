'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import type { Student } from '@/lib/aics/types'
import type { Course, Session } from '@/lib/schedule'

// ============================================================
//  useStudentData — fetches the logged-in student's data from
//  the MongoDB-backed API (/api/student).
// ============================================================

interface StudentDataState {
  student: Student | null
  courses: Course[]
  sessions: Session[]
  loading: boolean
  error: string | null
}

export function useStudentData(username: string | null) {
  const [state, setState] = useState<StudentDataState>({
    student: null,
    courses: [],
    sessions: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!username) {
      setState({ student: null, courses: [], sessions: [], loading: false, error: null })
      return
    }

    let cancelled = false

    async function fetchStudent() {
      try {
        setState((s) => ({ ...s, loading: true, error: null }))
        const res = await fetch(`/api/student?username=${encodeURIComponent(username!)}`)
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to fetch student data')
        }
        const data = await res.json()
        if (cancelled) return
        setState({
          student: data.student,
          courses: data.courses,
          sessions: data.sessions,
          loading: false,
          error: null,
        })
      } catch (err) {
        if (cancelled) return
        setState({
          student: null,
          courses: [],
          sessions: [],
          loading: false,
          error: err instanceof Error ? err.message : 'An error occurred',
        })
      }
    }

    fetchStudent()
    return () => {
      cancelled = true
    }
  }, [username])

  return state
}

// ============================================================
//  useAuth — manages the logged-in username + branch in
//  localStorage and provides login/logout functions that
//  call the API. The session persists across browser
//  refreshes because localStorage is synchronous on the
//  client.
// ============================================================

export function useAuth() {
  // Lazy-init from localStorage on the client; null on the server.
  // This avoids hydration mismatch (server renders null, client
  // hydrates with the real value from localStorage).
  const [username, setUsername] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('aics_username') : null
  )
  const [branch, setBranch] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('aics_branch') : null
  )
  // loading is false because the lazy init resolves synchronously
  const loading = false

  // Sync across tabs/windows
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'aics_username') {
        setUsername(e.newValue)
      }
      if (e.key === 'aics_branch') {
        setBranch(e.newValue)
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const login = useCallback(
    async (
      user: string,
      pass: string
    ): Promise<{ ok: boolean; error?: string; branch?: string; username?: string }> => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user, password: pass }),
        })
        const data = await res.json()
        if (!data.ok) {
          return { ok: false, error: data.error }
        }
        localStorage.setItem('aics_username', data.username)
        localStorage.setItem('aics_branch', data.branch)
        setUsername(data.username)
        setBranch(data.branch)
        return { ok: true, branch: data.branch, username: data.username }
      } catch {
        return { ok: false, error: 'Network error. Please try again.' }
      }
    },
    []
  )

  const logout = useCallback(() => {
    localStorage.removeItem('aics_username')
    localStorage.removeItem('aics_branch')
    setUsername(null)
    setBranch(null)
  }, [])

  return { username, branch, loading, login, logout }
}
