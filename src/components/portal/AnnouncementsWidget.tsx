'use client'

import { useState, useEffect } from 'react'
import { Megaphone, X, ChevronRight, AlertTriangle } from 'lucide-react'
import type { Announcement } from '@/lib/aics/announcements'
import { ANNOUNCEMENT_STYLES } from '@/lib/aics/announcements'

interface AnnouncementsWidgetProps {
  announcements: Announcement[]
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  return 'just now'
}

export function AnnouncementsWidget({ announcements }: AnnouncementsWidgetProps) {
  const [dismissed, setDismissed] = useState(false)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [activeIndex, setActiveIndex] = useState(0)

  // Reset dismissed state when announcements change (e.g. new ones arrive)
  useEffect(() => {
    if (announcements.length === 0) return
    setDismissed(false)
  }, [announcements.length])

  // Filter out individually dismissed items
  const visible = announcements.filter((a) => !dismissedIds.has(a._id))
  const urgentCount = visible.filter((a) => a.priority === 'urgent').length

  if (dismissed || visible.length === 0) return null

  // The active announcement is the one currently shown in the banner
  const clampedIndex = Math.min(activeIndex, visible.length - 1)
  const active = visible[clampedIndex]
  if (!active) return null

  const style = ANNOUNCEMENT_STYLES[active.category]
  const isUrgent = active.priority === 'urgent'

  const dismissItem = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id))
    // Move to next item, or wrap around
    const remaining = visible.filter((a) => a._id !== id && !dismissedIds.has(a._id))
    if (remaining.length === 0) {
      setDismissed(true)
    } else {
      setActiveIndex(0)
    }
  }

  const bannerBg = isUrgent ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
  const accentColor = isUrgent ? 'text-red-600' : 'text-blue-600'

  return (
    <div className={`rounded-lg border ${bannerBg} px-4 py-2.5 flex items-center gap-3`}>
      {/* Icon */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {isUrgent ? (
          <AlertTriangle className={`w-4 h-4 ${accentColor}`} />
        ) : (
          <Megaphone className={`w-4 h-4 ${accentColor}`} />
        )}
      </div>

      {/* Content: title + meta on one line, expandable body below */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium ${isUrgent ? 'text-red-900' : 'text-slate-900'}`}>
            {active.title}
          </span>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border ${style.pill} flex-shrink-0`}>
            {style.label}
          </span>
          <span className="text-[10px] text-slate-400 flex-shrink-0">{timeAgo(active.postedDate)}</span>
          {visible.length > 1 && (
            <span className="text-[10px] text-slate-400 flex-shrink-0">
              {clampedIndex + 1} of {visible.length}
            </span>
          )}
        </div>
      </div>

      {/* Navigation arrows (only if multiple) */}
      {visible.length > 1 && (
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveIndex((i) => (i + 1) % visible.length)}
            className="p-1 rounded text-slate-400 hover:bg-white/50 hover:text-slate-600"
            aria-label="Next announcement"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Dismiss button */}
      <button
        type="button"
        onClick={() => dismissItem(active._id)}
        className="p-1 rounded text-slate-400 hover:bg-white/50 hover:text-slate-600 flex-shrink-0"
        aria-label="Dismiss announcement"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
