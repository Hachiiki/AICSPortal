'use client'

import { useState, useCallback, useRef, useId } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  User,
  Lock,
  Check,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAnimationPreferences } from '@/components/AnimationPreferences'
import { T, SHOW_DEMO_LOGIN } from './login-tokens'

const FORM_SPRING = { type: 'spring', stiffness: 400, damping: 27, mass: 0.78 } as const
const FIELD_ICON = 'pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--login-muted)] group-focus-within:text-link-strong motion-safe:transition-[color,scale] motion-safe:group-focus-within:scale-110'

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
  const animate = useAnimationPreferences().mode === 'full'
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
      initial={animate ? { opacity: 0.7, y: 9 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={animate ? { opacity: 0, y: 3 } : { opacity: 0 }}
      transition={animate ? FORM_SPRING : { duration: 0 }}
      onSubmit={handleCredentialSubmit}
      className="space-y-3.5 max-lg:[@media(max-height:500px)]:space-y-1.5 lg:space-y-4"
    >
      {/* Username */}
      <div className="space-y-1.5">
        <label htmlFor="username" className="block text-sm lg:text-xs font-medium" style={{ color: T.text }}>
          Username
        </label>
        <div className="group relative">
          <User className={FIELD_ICON} aria-hidden="true" />
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
            className="h-12 w-full rounded-xl border border-[var(--login-border)] bg-[var(--login-bg)] pl-10 pr-3 text-base text-[var(--login-text)] outline-none transition-colors placeholder:text-[var(--login-muted)] focus:border-[var(--login-primary)] focus:ring-[3px] focus:ring-[var(--login-accent)]/20 aria-invalid:border-red-600 max-lg:[@media(max-height:500px)]:h-11 lg:h-11 lg:rounded-[8px] lg:bg-surface lg:text-sm"
          />
        </div>
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm lg:text-xs font-medium" style={{ color: T.text }}>
          Password
        </label>
        <div className="group relative">
          <Lock className={FIELD_ICON} aria-hidden="true" />
          <input
            id="password"
            ref={passwordRef}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            enterKeyHint="go"
            aria-invalid={missing === 'password'}
            aria-describedby={error ? errorId : undefined}
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearError() }}
            placeholder="Enter your password"
            className="h-12 w-full rounded-xl border border-[var(--login-border)] bg-[var(--login-bg)] pl-10 pr-12 text-base text-[var(--login-text)] outline-none transition-colors placeholder:text-[var(--login-muted)] focus:border-[var(--login-primary)] focus:ring-[3px] focus:ring-[var(--login-accent)]/20 aria-invalid:border-red-600 max-lg:[@media(max-height:500px)]:h-11 lg:h-11 lg:rounded-[8px] lg:bg-surface lg:text-sm"
          />
          <button
            type="button"
            onClick={(event) => {
              setShowPassword((s) => !s)
              // Keep keyboard and assistive activation on the reveal control.
              if (event.detail > 0) passwordRef.current?.focus({ preventScroll: true })
            }}
            className="absolute right-0 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-md transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--login-primary)] max-lg:[@media(max-height:500px)]:size-11 lg:size-11"
            style={{ color: T.muted }}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-controls="password"
          >
            <motion.span key={String(showPassword)} aria-hidden="true"
              initial={animate ? { scale: 0.73, opacity: 0.55 } : false}
              animate={{ scale: 1, opacity: 1 }} transition={animate ? FORM_SPRING : { duration: 0 }}>
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </motion.span>
          </button>
        </div>
      </div>

      {/* Remember me + Forgot password */}
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:pt-1">
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
            {remember && <motion.span initial={animate ? { scale: 0.5 } : false} animate={{ scale: 1 }} transition={FORM_SPRING}>
              <Check className="size-3.5 text-white" strokeWidth={3} />
            </motion.span>}
          </span>
          <span className="text-sm lg:text-xs" style={{ color: T.muted }}>
            Remember me for 7 days
          </span>
        </label>
        {/* No self-service reset and no IT desk; branch admins reset passwords. */}
        <span className="hidden text-xs leading-relaxed lg:block" style={{ color: T.muted }}>
          Forgot password? Ask your branch admin.
        </span>
      </div>

      {error && <motion.p id={errorId} role="alert"
        initial={animate ? { opacity: 0.5, y: -4 } : false} animate={{ opacity: 1, y: 0 }} transition={animate ? FORM_SPRING : { duration: 0 }}
        className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm leading-relaxed text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">{error}</motion.p>}

      {/* Sign In — primary action */}
      <motion.button
        type="submit"
        disabled={submitting}
        aria-label={submitting ? 'Signing in...' : 'Sign In'}
        whileTap={animate && !submitting ? { scale: 0.975 } : undefined}
        transition={FORM_SPRING}
        className="relative grid min-h-12 w-full place-items-center rounded-xl bg-[#1d4ed8] px-4 py-2.5 text-base font-semibold text-white shadow-[0_3px_9px_rgb(29_78_216/0.2)] transition-colors hover:bg-[#1e40af] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-link disabled:cursor-wait disabled:bg-[#244baa] max-lg:[@media(max-height:500px)]:min-h-11 max-lg:[@media(max-height:500px)]:py-1.5 lg:mt-1 lg:min-h-11 lg:rounded-[8px] lg:bg-[var(--login-primary)] lg:text-sm lg:shadow-none lg:hover:bg-[var(--login-primary-dark)]"
      >
        <motion.span key={String(submitting)} className="inline-flex items-center gap-2" aria-hidden="true"
          initial={animate ? { opacity: 0.65, y: 3 } : false} animate={{ opacity: 1, y: 0 }} transition={animate ? FORM_SPRING : { duration: 0 }}>
          {submitting ? <><Loader2 className="size-4 shrink-0 motion-safe:animate-spin" /> Signing in...</> : <>Sign In <ArrowRight className="size-4 shrink-0 lg:hidden" /></>}
        </motion.span>
      </motion.button>
      <p role="status" className="sr-only">{submitting ? 'Signing in...' : ''}</p>

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
