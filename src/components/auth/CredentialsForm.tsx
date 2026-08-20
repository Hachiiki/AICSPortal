'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
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
import { T, SHOW_DEMO_LOGIN, DEV_CREDENTIALS } from './login-tokens'

// ============================================================
//  CredentialsForm — username/password login form.
//  Extracted from LoginView.tsx.
// ============================================================

interface CredentialsFormProps {
  onLogin: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>
}

export function CredentialsForm({ onLogin }: CredentialsFormProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const handleCredentialSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!username.trim() || !password.trim()) {
        toast.error('Please enter both your username and password.')
        return
      }
      setSubmitting(true)
      try {
        const result = await onLogin(username.trim(), password)
        if (!result.ok) {
          setSubmitting(false)
          toast.error(result.error || 'Invalid username or password.')
          return
        }
        toast.success('Signed in. Redirecting to your AICS dashboard...')
      } catch {
        setSubmitting(false)
        toast.error('Network error. Please try again.')
      }
    },
    [username, password, onLogin]
  )

  const handleTestLogin = useCallback(async () => {
    setUsername(DEV_CREDENTIALS.username)
    setPassword(DEV_CREDENTIALS.password)
    setSubmitting(true)
    try {
      const result = await onLogin(DEV_CREDENTIALS.username, DEV_CREDENTIALS.password)
      if (!result.ok) {
        setSubmitting(false)
        toast.error(result.error || 'Test login failed.')
        return
      }
      toast.success('Test login successful. Welcome, Juan!')
    } catch {
      setSubmitting(false)
      toast.error('Network error. Please try again.')
    }
  }, [onLogin])

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
        <label htmlFor="username" className="block text-xs font-medium" style={{ color: T.text }}>
          Username
        </label>
        <div className="relative">
          <User
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: T.muted }}
          />
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. juan.delacruz"
            className="w-full h-11 pl-10 pr-3 rounded-[8px] text-sm bg-white border outline-none transition-colors"
            style={{ borderColor: T.border, color: T.text }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = T.primary
              e.currentTarget.style.boxShadow = `0 0 0 3px ${T.accent}26`
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = T.border
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
        </div>
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-xs font-medium" style={{ color: T.text }}>
          Password
        </label>
        <div className="relative">
          <Lock
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: T.muted }}
          />
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full h-11 pl-10 pr-10 rounded-[8px] text-sm bg-white border outline-none transition-colors"
            style={{ borderColor: T.border, color: T.text }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = T.primary
              e.currentTarget.style.boxShadow = `0 0 0 3px ${T.accent}26`
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = T.border
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors hover:bg-gray-50"
            style={{ color: T.muted }}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Remember me + Forgot password */}
      <div className="flex items-center justify-between pt-1">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <button
            type="button"
            role="checkbox"
            aria-checked={remember}
            onClick={() => setRemember((r) => !r)}
            className="w-4 h-4 rounded-[4px] flex items-center justify-center flex-shrink-0 transition-colors"
            style={
              remember
                ? { background: T.primary, border: `1.5px solid ${T.primary}` }
                : { background: T.white, border: `1.5px solid ${T.border}` }
            }
          >
            {remember && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          </button>
          <span className="text-xs" style={{ color: T.muted }}>
            Remember me
          </span>
        </label>
        <button
          type="button"
          onClick={() => toast.info('Contact the AICS IT Office to reset your password.')}
          className="text-xs font-medium transition-colors hover:underline"
          style={{ color: T.primary }}
        >
          Forgot password?
        </button>
      </div>

      {/* Sign In — primary action */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full h-11 rounded-[8px] font-semibold text-sm text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-1"
        style={{ background: T.primary }}
        onMouseEnter={(e) => {
          if (!submitting) e.currentTarget.style.background = T.primaryDark
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = T.primary
        }}
      >
        {submitting ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
          </span>
        ) : (
          'Sign In'
        )}
      </button>

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
            <span className="font-mono">{DEV_CREDENTIALS.username}</span>
            {' / '}
            <span className="font-mono">{DEV_CREDENTIALS.password}</span>
          </p>
        </>
      )}
    </motion.form>
  )
}
