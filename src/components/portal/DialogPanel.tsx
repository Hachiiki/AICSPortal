'use client'

import { useEffect, useRef } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'

// ============================================================
//  DialogPanel — the shared accessibility contract for the
//  hand-rolled (non-Radix) modals and drawers, as a component:
//    - Escape closes the dialog
//    - Focus moves into the panel on mount
//    - Tab cycles inside the panel (focus trap)
//    - Focus returns to the triggering element on unmount
//    - role="dialog" + aria-modal + tabIndex=-1 applied
//
//  Render it conditionally ({open && <DialogPanel ...>}) and pass
//  aria-label / aria-labelledby so each dialog is named. Motion
//  props (initial/animate/exit/transition) pass straight through,
//  so AnimatePresence exit animations keep working.
//
//  Why a component and not a hook: React Compiler's refs rule
//  forbids ref values crossing custom-hook boundaries during
//  render; keeping the ref inside one component (same pattern as
//  Modal.tsx) compiles clean.
// ============================================================

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface DialogPanelProps extends HTMLMotionProps<'div'> {
  /** Called when the user presses Escape. */
  onClose: () => void
}

export function DialogPanel({ onClose, children, ...rest }: DialogPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const onCloseRef = useRef(onClose)
  const restoreRef = useRef<HTMLElement | null>(null)

  // Keep the closer fresh without touching refs during render.
  useEffect(() => {
    onCloseRef.current = onClose
  })

  // Mount = open (parents render conditionally): move focus in, trap
  // Tab, and return focus to the opener on unmount.
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    restoreRef.current = (document.activeElement as HTMLElement | null) ?? null
    panel.focus()

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key === 'Tab') {
        const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
          (el) => el.getClientRects().length > 0
        )
        if (nodes.length === 0) {
          e.preventDefault()
          return
        }
        const first = nodes[0]
        const last = nodes[nodes.length - 1]
        const active = document.activeElement as HTMLElement | null
        if (e.shiftKey && (active === first || active === panel || !panel.contains(active))) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    panel.addEventListener('keydown', handleKey)
    return () => {
      panel.removeEventListener('keydown', handleKey)
      restoreRef.current?.focus?.()
    }
  }, [])

  return (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      className="outline-none"
      {...rest}
    >
      {children}
    </motion.div>
  )
}
