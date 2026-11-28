'use client'

import { useEffect, useState } from 'react'

export default function VerifyEmailPage() {
  const [token, setToken] = useState('')
  const [state, setState] = useState<'loading' | 'ready' | 'sending' | 'done' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [needsLogin, setNeedsLogin] = useState(false)

  useEffect(() => {
    const linkToken = window.location.hash.slice(1)
    if (/^[\w-]{43}$/.test(linkToken)) {
      window.history.replaceState(null, '', '/verify-email')
      setToken(linkToken)
      setState('ready')
      return
    }
    setMessage('Open the link from your verification email.')
    setState('error')
  }, [])

  async function confirmEmail() {
    setState('sending')
    setNeedsLogin(false)
    try {
      const response = await fetch('/api/auth/email-verification', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (response.ok) {
        setToken('')
        setMessage('Your email address is verified.')
        setState('done')
        return
      }
      const data = await response.json()
      setNeedsLogin(response.status === 401)
      setMessage(data.error || 'Could not verify your email.')
    } catch {
      setMessage('Could not reach AICS Portal. Try again.')
    }
    setState('error')
  }

  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">Verify your email</h1>
      <p role="status">{message}</p>
      {token && state !== 'done' && (
        <button
          type="button"
          className="min-h-11 rounded-lg bg-blue-700 px-4 py-2 font-medium text-white disabled:opacity-60"
          disabled={state === 'sending'}
          onClick={confirmEmail}
        >
          {state === 'sending' ? 'Verifying…' : 'Confirm email address'}
        </button>
      )}
      {needsLogin && <a className="text-link underline" href="/" target="_blank" rel="noopener noreferrer">Sign in in a new tab, then try again here</a>}
      {state === 'done' && <a className="text-link underline" href="/">Return to AICS Portal</a>}
    </main>
  )
}
