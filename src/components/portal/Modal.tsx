'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'

interface ModalProps {
  title: ReactNode
  description?: ReactNode
  /** Extra header content rendered below the description (e.g. scope summaries). */
  headerExtra?: ReactNode
  onClose: () => void
  children: ReactNode
  footer: ReactNode
  /** Width cap for the panel. Defaults to max-w-lg. */
  maxWidthClass?: string
  /** Element to receive initial focus. Falls back to the first focusable control. */
  initialFocusRef?: { current: HTMLElement | null }
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Shared accessible modal. Parents mount it conditionally
// (`{open && <Modal ...>}`), so mount/unmount maps to open/close:
// focus moves in on mount and returns to the opener on unmount.
export function Modal({
  title,
  description,
  headerExtra,
  onClose,
  children,
  footer,
  maxWidthClass = 'max-w-lg',
  initialFocusRef,
}: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  // Mount-only: parents conditionally render (open = mounted) and must pass
  // a stable onClose (useCallback), so this never re-runs mid-session.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    const initial =
      initialFocusRef?.current && panel?.contains(initialFocusRef.current)
        ? initialFocusRef.current
        : panel?.querySelector<HTMLElement>(FOCUSABLE)
    initial?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      // Lightweight Tab trap: cycle within the panel.
      if (e.key === 'Tab' && panel) {
        const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
          (el) => el.offsetParent !== null
        )
        if (items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus?.()
    }
    // Mount-only: parents conditionally render, so open/close = mount/unmount.
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative bg-white rounded-2xl shadow-2xl ${maxWidthClass} w-full overflow-hidden`}
      >
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 id={titleId} className="font-bold">
            {title}
          </h3>
          {description ? <div className="text-xs text-slate-500 mt-1">{description}</div> : null}
          {headerExtra}
        </div>
        <div className="px-6 py-4 space-y-3">{children}</div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">{footer}</div>
      </div>
    </div>
  )
}
