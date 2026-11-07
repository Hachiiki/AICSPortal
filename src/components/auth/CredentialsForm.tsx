'use client'

import { useState, useCallback, useRef, useId } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Loader2,
  Eye,
  EyeOff,
  User,
  Lock,
  Check,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { T, SHOW_DEMO_LOGIN } from './login-tokens'

// ============================================================
//  CredentialsForm — username/password login form.
//  Extracted from LoginView.tsx.
// ============================================================

interface CredentialsFormProps {
  onLogin: (
    username: string,
    password: string,
    remember: boolean
  ) => Promise<{ ok: boolean; error?: string }>
  onDemoLogin: () => Promise<{ ok: boolean; error?: string }>
}

export function CredentialsForm({ onLogin, onDemoLogin }: CredentialsFormProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [missing, setMissing] = useState<'username' | 'password' | null>(null)
  const usernameRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const pendingRef = useRef(false)
  const errorId = useId()
  const clearError = useCallback(() => { setError(null); setMissing(null) }, [])

  const handleCredentialSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (pendingRef.current) return
      if (!username.trim() || !password.trim()) {
        setError('Please enter both your username and password.')
        setMissing(!username.trim() ? 'username' : 'password')
        ;(!username.trim() ? usernameRef : passwordRef).current?.focus()
        return
      }
      clearError()
      pendingRef.current = true
      setSubmitting(true)
      try {
        const result = await onLogin(username.trim(), password, remember)
        if (!result.ok) {
          setSubmitting(false)
          pendingRef.current = false
          setError(result.error || 'Invalid username or password.')
          return
        }
        toast.success('Signed in. Redirecting to your AICS dashboard...')
      } catch {
        setSubmitting(false)
        pendingRef.current = false
        setError('Network error. Please try again.')
      }
    },
    [username, password, remember, onLogin, clearError]
  )

  // Dev-only demo login. No credentials in the bundle — the server
  // issues the demo session (POST /api/auth/demo, 404 in production).
  const handleTestLogin = useCallback(async () => {
    if (pendingRef.current) return
    pendingRef.current = true
    setError(null)
    setSubmitting(true)
    try {
      const result = await onDemoLogin()
      if (!result.ok) {
        setSubmitting(false)
        pendingRef.current = false
        setError(result.error || 'Test login failed.')
        return
      }
      toast.success('Test login successful. Welcome!')
    } catch {
      setSubmitting(false)
      pendingRef.current = false
      setError('Network error. Please try again.')
    }
  }, [onDemoLogin])

  return (
    <motion.form
      key="cred"
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.2 }}
      onSubmit={handleCredentialSubmit}
      className="space-y-4"
    >
      {/* Username */}
      <div className="space-y-1.5">
        <label htmlFor="username" className="block text-sm lg:text-xs font-medium" style={{ color: T.text }}>
          Username
        </label>
        <div className="relative">
          <User
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: T.muted }}
          />
          <input
            id="username"
            ref={usernameRef}
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={missing === 'username'}
            aria-describedby={error ? errorId : undefined}
            value={username}
            onChange={(e) => { setUsername(e.target.value); clearError() }}
            placeholder="e.g. juan.delacruz"
            className="w-full h-12 lg:h-11 pl-10 pr-3 rounded-[8px] text-base lg:text-sm bg-surface border border-[var(--login-border)] text-[var(--login-text)] placeholder:text-[var(--login-muted)] outline-none transition-colors focus-visible:border-[var(--login-primary)] focus-visible:ring-[3px] focus-visible:ring-[var(--login-accent)]/15"
          />
        </div>
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm lg:text-xs font-medium" style={{ color: T.text }}>
          Password
        </label>
        <div className="relative">
          <Lock
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: T.muted }}
          />
          <input
            id="password"
            ref={passwordRef}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            aria-invalid={missing === 'password'}
            aria-describedby={error ? errorId : undefined}
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearError() }}
            placeholder="Enter your password"
            className="w-full h-12 lg:h-11 pl-10 pr-12 rounded-[8px] text-base lg:text-sm bg-surface border border-[var(--login-border)] text-[var(--login-text)] placeholder:text-[var(--login-muted)] outline-none transition-colors focus-visible:border-[var(--login-primary)] focus-visible:ring-[3px] focus-visible:ring-[var(--login-accent)]/15"
          />
          <button
            type="button"
            onClick={() => { setShowPassword((s) => !s); passwordRef.current?.focus({ preventScroll: true }) }}
            className="absolute right-0 top-1/2 -translate-y-1/2 size-12 lg:size-11 grid place-items-center rounded-md transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--login-primary)]"
            style={{ color: T.muted }}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Remember me + Forgot password */}
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between pt-1">
        <label className="inline-flex min-h-11 items-center gap-2 py-1 cursor-pointer select-none">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <span
            aria-hidden
            className="w-5 h-5 rounded-[4px] flex items-center justify-center flex-shrink-0 transition-colors pointer-events-none peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--login-primary)] peer-focus-visible:ring-offset-2"
            style={
              remember
                ? { background: T.primary, border: `1.5px solid ${T.primary}` }
                : { background: T.white, border: `1.5px solid ${T.border}` }
            }
          >
            {remember && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
          </span>
          <span className="text-sm lg:text-xs" style={{ color: T.muted }}>
            Remember me for 7 days
          </span>
        </label>
        {/* No self-service reset and no IT desk; branch admins reset passwords. */}
        <span className="text-sm lg:text-xs leading-relaxed" style={{ color: T.muted }}>
          Forgot password? Ask your branch admin.
        </span>
      </div>

      {error && <p id={errorId} role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm leading-relaxed text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">{error}</p>}

      {/* Sign In — primary action */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full h-12 lg:h-11 rounded-[8px] font-semibold text-base lg:text-sm text-white bg-[var(--login-primary)] hover:bg-[var(--login-primary-dark)] active:scale-[0.99] motion-reduce:transform-none transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-1"
      >
        {submitting ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
          </span>
        ) : (
          'Sign In'
        )}
      </button>

      {/* Sign-in disclaimer — the legal entry point of the service. */}
      <p className="text-center text-xs lg:text-[11px] leading-relaxed pt-1" style={{ color: T.muted }}>
        By signing in, you agree to our{' '}
        <Link href="/legal/terms" className="underline underline-offset-2 hover:text-slate-700">
          Terms &amp; Conditions
        </Link>{' '}
        and{' '}
        <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-slate-700">
          Privacy Policy
        </Link>
        .
      </p>

      {/* Demo / test login — development only, visually unobtrusive */}
      {SHOW_DEMO_LOGIN && (
        <>
          <div className="flex items-center gap-3 pt-3">
            <div className="flex-1 h-px" style={{ background: T.border }} />
            <span className="text-[10px] uppercase tracking-wider" style={{ color: T.muted }}>
              Demo
            </span>
            <div className="flex-1 h-px" style={{ background: T.border }} />
          </div>
          <button
            type="button"
            onClick={handleTestLogin}
            disabled={submitting}
            className="w-full h-10 rounded-[8px] text-xs font-medium flex items-center justify-center gap-2 transition-colors hover:bg-gray-50"
            style={{ background: T.white, border: `1px dashed ${T.border}`, color: T.muted }}
          >
            <UserRound className="w-3.5 h-3.5" /> Test Student Login
          </button>
          <p className="text-center text-[10px]" style={{ color: T.muted }}>
            Seeded demo student (dev only)
          </p>
        </>
      )}
    </motion.form>
  )
}
