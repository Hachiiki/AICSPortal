'use client'

import { CONSENT_RESET_EVENT } from '@/lib/legal/site'
import { cn } from '@/lib/utils'

// Reopens the cookie banner from any surface (login footer, sidebar
// footer, legal pages, settings). Dispatching the reset event clears
// the remembered choice; the banner reappears and analytics unmount
// immediately via ConsentGate's listener.
export function CookieSettingsButton({
  className,
  label = 'Cookie settings',
}: {
  className?: string
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(CONSENT_RESET_EVENT))}
      className={cn('text-left underline underline-offset-2', className)}
    >
      {label}
    </button>
  )
}
