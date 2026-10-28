'use client'

// Palette sync (theme expansion, Refs #92).
//
// next-themes owns the .dark class; this component keeps the palette
// attribute and the custom inline vars consistent with whatever the
// rest of the app does to the theme. Every setTheme() call — the
// Topbar quick toggle, the login toggle, the Settings radios —
// updates the useTheme() context, and this effect re-applies the
// palette rules idempotently. It also re-applies once on mount, which
// matches (and is covered by) the pre-paint script's result.

import { useEffect } from 'react'
import { useTheme } from 'next-themes'
import { applyPaletteToDom } from '@/lib/aics/theme-palette'

export function ThemePaletteSync() {
  const { theme } = useTheme()
  useEffect(() => {
    applyPaletteToDom(theme)
  }, [theme])
  return null
}
