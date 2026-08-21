'use client'

import { useState } from 'react'
import { Megaphone, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
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
  const [expanded, setExpanded] = useState<string | null>(null)

  // Show up to 5 most recent
  const visible = announcements.slice(0, 5)
  const urgentCount = announcements.filter((a) => a.priority === 'urgent').length

  if (visible.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4 flex items-center gap-3">
        <Megaphone className="w-5 h-5 text-slate-300 flex-shrink-0" />
        <p className="text-sm text-slate-400">No announcements at this time.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900">Announcements</h2>
          {urgentCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
              <AlertTriangle className="w-3 h-3" /> {urgentCount} urgent
            </span>
          )}
        </div>
        <span className="text-xs text-slate-400">{announcements.length} total</span>
      </div>

      <div className="divide-y divide-slate-100">
        {visible.map((a) => {
          const style = ANNOUNCEMENT_STYLES[a.category]
          const isExpanded = expanded === a._id
          return (
            <div key={a._id} className="px-6 py-3">
              <button
                type="button"
                onClick={() => setExpanded(isExpanded ? null : a._id)}
                className="w-full text-left flex items-start gap-3"
              >
                <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900 truncate">{a.title}</p>
                    {a.priority === 'urgent' && (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border ${style.pill}`}>
                      {style.label}
                    </span>
                    <span className="text-[10px] text-slate-400">{timeAgo(a.postedDate)}</span>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1" />
                )}
              </button>

              {isExpanded && (
                <div className="mt-2 pl-5">
                  <p className="text-xs text-slate-600 leading-relaxed">{a.body}</p>
                  <p className="text-[10px] text-slate-400 mt-1.5">Posted by {a.author}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
