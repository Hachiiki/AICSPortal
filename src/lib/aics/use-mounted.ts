import { useSyncExternalStore } from 'react'

// Mounted gate for theme-dependent rendering (dark-theme Phase 1).
//
// next-themes initializes the stored preference synchronously on the
// client's first render, so anything that renders differently per theme
// would hydrate-mismatch against the SSR output. This hook returns
// false during SSR and the hydration render, then true, with no
// setState-in-effect (the same useSyncExternalStore approach the auth
// store uses). Render theme-dependent UI only when it returns true.
const emptySubscribe = () => () => {}

export function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}
