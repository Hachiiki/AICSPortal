'use client'

import { useCallback, useEffect, useState } from 'react'
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

export function useStudentData(username: string | null, retryKey = 0) {
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
  }, [username, retryKey])

  return state
}

// ============================================================
//  useAuth — Phase 6: identity comes from the server session
//  (httpOnly cookie set by /api/auth/login), NOT localStorage.
//
//  On mount the hook calls GET /api/auth/session: a 401 means
//  signed-out. Editing any client-side flag grants nothing —
//  every API route and /portal page re-verifies the cookie
//  server-side (middleware + getSession). URLs stay display-only.
// ============================================================

interface AuthState {
  username: string | null
  branch: string | null
  role: string | null
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({ username: null, branch: null, role: null })
  // loading starts true on both server and first client render, so
  // hydration matches; it flips false once the session check lands.
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/session')
        if (!cancelled && res.ok) {
          const data = await res.json()
          if (data.ok) {
            setAuth({ username: data.username, branch: data.branch, role: data.role || 'student' })
          }
        }
      } catch {
        // Network failure reads as signed-out; the login view explains.
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    checkSession()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(
    async (
      user: string,
      pass: string
    ): Promise<{ ok: boolean; error?: string; branch?: string; username?: string; role?: string }> => {
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
        // Session cookie was set by the server (httpOnly). State here is display-only.
        setAuth({ username: data.username, branch: data.branch, role: data.role || 'student' })
        return { ok: true, branch: data.branch, username: data.username, role: data.role || 'student' }
      } catch {
        return { ok: false, error: 'Network error. Please try again.' }
      }
    },
    []
  )

  // Dev-only one-click login. No credentials in the client bundle —
  // the server issues the demo session (POST /api/auth/demo, 404 in prod).
  const loginDemo = useCallback(async (): Promise<{ ok: boolean; error?: string; branch?: string; username?: string; role?: string }> => {
    try {
      const res = await fetch('/api/auth/demo', { method: 'POST' })
      const data = await res.json()
      if (!data.ok) {
        return { ok: false, error: data.error }
      }
      setAuth({ username: data.username, branch: data.branch, role: data.role || 'student' })
      return { ok: true, branch: data.branch, username: data.username, role: data.role || 'student' }
    } catch {
      return { ok: false, error: 'Network error. Please try again.' }
    }
  }, [])

  const logout = useCallback(() => {
    // Fire-and-forget: client state clears immediately; the server
    // cookie clears in the background. Route guards bounce to login.
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    setAuth({ username: null, branch: null, role: null })
  }, [])

  return { username: auth.username, branch: auth.branch, role: auth.role, loading, login, loginDemo, logout }
}
