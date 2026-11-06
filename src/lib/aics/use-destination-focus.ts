'use client'

import { useEffect } from 'react'

/** Focus a loaded contextual destination without opening or submitting controls. */
export function useDestinationFocus(id: string, active: boolean) {
  useEffect(() => {
    if (!active) return
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(id)
      target?.scrollIntoView({ block: 'start', behavior: 'auto' })
      target?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [id, active])
}
