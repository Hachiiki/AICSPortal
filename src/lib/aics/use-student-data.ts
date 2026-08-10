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
//  useAuth — manages the logged-in username in localStorage
//  and provides login/logout functions that call the API.
// ============================================================

// useSyncExternalStore for reading localStorage without hydration mismatch
const emptySubscribe = () => () => {}
let cachedStorageUsername: string | null = null
let cachedStorageKey = ''
function getClientUsername(): string | null {
  const val = typeof window !== 'undefined' ? localStorage.getItem('aics_username') : null
  if (val !== cachedStorageKey) {
    cachedStorageUsername = val
    cachedStorageKey = val
  }
  return cachedStorageUsername
}
function getServerUsername(): string | null {
  return null
}

export function useAuth() {
  // SSR-safe read of localStorage
  const storedUsername = useSyncExternalStore(emptySubscribe, getClientUsername, getServerUsername)
  // Lazy-init from localStorage on the client; null on the server.
  // This avoids setState-in-effect while still being hydration-safe.
  const [username, setUsername] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('aics_username') : null
  )
  const loading = false // resolved synchronously via lazy init

  const login = useCallback(async (user: string, pass: string): Promise<{ ok: boolean; error?: string }> => {
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
      setUsername(data.username)
      return { ok: true }
    } catch {
      return { ok: false, error: 'Network error. Please try again.' }
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('aics_username')
    setUsername(null)
  }, [])

  return { username, loading, login, logout }
}
