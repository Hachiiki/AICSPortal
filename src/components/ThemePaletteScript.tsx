// Pre-paint palette bootstrap (theme expansion, Refs #92).
//
// Server component on purpose: it renders one tiny inline script at
// the top of <body>, ahead of the next-themes provider, so a stored
// palette (or saved custom vars) lands on <html> before first paint.
// The logic lives in PALETTE_BOOT_SCRIPT and mirrors
// applyPaletteToDom() in src/lib/aics/theme-palette.ts.

import { PALETTE_BOOT_SCRIPT } from "@/lib/aics/theme-palette"

export function ThemePaletteScript() {
  return <script dangerouslySetInnerHTML={{ __html: PALETTE_BOOT_SCRIPT }} />
}
