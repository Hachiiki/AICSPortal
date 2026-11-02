'use client'

import { useEffect, type RefObject } from 'react'
import { useStudentOnboarding } from './StudentOnboarding'

/** Sustained viewing of the loaded final section, independent of input device. */
export function useProfileReview(target: RefObject<HTMLElement | null>, contentReady: boolean) {
  const journey = useStudentOnboarding()
  const client = journey?.client
  const enabled = contentReady && !!journey && !journey.busy && !journey.state.values.profile
  useEffect(() => {
    const element = target.current
    if (!enabled || !client || !element || typeof IntersectionObserver === 'undefined') return
    let visible = false, completed = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const clear = () => { clearTimeout(timer); timer = undefined }
    const schedule = () => {
      clear()
      if (!visible || completed || document.visibilityState !== 'visible') return
      timer = setTimeout(() => {
        const dialogOpen = Array.from(document.querySelectorAll('[role="dialog"][aria-modal="true"]')).some(node => node.getClientRects().length > 0)
        if (dialogOpen) { schedule(); return }
        if (!visible || document.visibilityState !== 'visible') return
        completed = true
        observer.disconnect()
        void client.complete('profile')
      }, 1500)
    }
    const observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.target === element && entry.isIntersecting && entry.intersectionRatio >= 0.5)
      schedule()
    }, { threshold: [0, 0.5] })
    observer.observe(element)
    document.addEventListener('visibilitychange', schedule)
    return () => { clear(); observer.disconnect(); document.removeEventListener('visibilitychange', schedule) }
  }, [enabled, client, target])
}
