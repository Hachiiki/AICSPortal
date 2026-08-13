'use client'

import { Monitor, X } from 'lucide-react'
import { useState, useEffect } from 'react'

/**
 * Full-screen warning overlay shown on phone-sized viewports.
 * The AICS Portal is currently desktop-only. This overlay blocks
 * interaction with the app on small screens and tells the user
 * to switch to a desktop device.
 *
 * The overlay appears below the `md` breakpoint (768px) which
 * covers phones and small tablets in portrait.
 */
export function MobileWarning() {
  const [dismissed, setDismissed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (!isMobile || dismissed) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center px-6">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-5">
          <Monitor className="w-8 h-8 text-blue-600" />
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold text-slate-900">
          Desktop Required
        </h2>

        {/* Body */}
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          The AICS Student Portal is optimized for desktop screens. Please
          switch to a laptop or desktop computer for the best experience.
        </p>

        {/* Dismiss button */}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="mt-6 w-full py-2.5 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Continue anyway
        </button>

        {/* Close X in corner */}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss warning"
          className="absolute top-3 right-3 p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
