'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
// useRef removed — not needed after hydration fix
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
//  localStorage. Uses useSyncExternalStore so the first client
//  render matches the server (both null), then React updates
//  to the real value after hydration. This prevents hydration
//  mismatches that would break the page.
// ============================================================

// --- useSyncExternalStore for localStorage ---

// A custom event dispatched whenever login/logout writes to localStorage
const AUTH_EVENT = 'aics-auth-change'

function dispatchAuthChange() {
  window.dispatchEvent(new Event(AUTH_EVENT))
}

function authSubscribe(callback: () => void): () => void {
  window.addEventListener(AUTH_EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(AUTH_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

// Client snapshot: reads from localStorage
function getClientUsername(): string | null {
  return localStorage.getItem('aics_username')
}
function getClientBranch(): string | null {
  return localStorage.getItem('aics_branch')
}

// Server snapshot: always null (no localStorage on server)
function getServerValue(): string | null {
  return null
}

export function useAuth() {
  // useSyncExternalStore ensures:
  // 1. Server render: username = null, branch = null (getServerValue)
  // 2. Client first render (hydration): username = null, branch = null (getServerValue)
  //    → matches server, no hydration mismatch
  // 3. After hydration: React re-renders with getClientUsername/getClientBranch
  //    → reads real values from localStorage
  const username = useSyncExternalStore(authSubscribe, getClientUsername, getServerValue)
  const branch = useSyncExternalStore(authSubscribe, getClientBranch, getServerValue)

  // loading is true on the server and first client render (hydration),
  // then becomes false after mount. This prevents hydration mismatch
  // because both server and client first render see loading=true → null.
  // After mount, the effect updates loading to false, which triggers
  // a re-render with the real auth state from useSyncExternalStore.
  const loading = useSyncExternalStore(
    () => () => {},
    () => false, // client: not loading (localStorage is available)
    () => true   // server: loading (no localStorage)
  )

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
        dispatchAuthChange()
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
    dispatchAuthChange()
  }, [])

  return { username, branch, loading, login, logout }
}
