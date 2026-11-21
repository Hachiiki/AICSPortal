'use client'

import { useSyncExternalStore } from 'react'

const query = '(max-width: 639px)'
const subscribe = (listener: () => void) => {
  const media = window.matchMedia(query)
  media.addEventListener('change', listener)
  return () => media.removeEventListener('change', listener)
}
const snapshot = () => window.matchMedia(query).matches
const serverSnapshot = () => false

export function usePhoneViewport() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot)
}
