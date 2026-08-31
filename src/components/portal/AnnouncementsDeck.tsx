'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Megaphone,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Check,
  Clock,
} from 'lucide-react'
import type { Announcement } from '@/lib/aics/announcements'
import { ANNOUNCEMENT_STYLES } from '@/lib/aics/announcements'

interface AnnouncementsDeckProps {
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

const SWIPE_THRESHOLD = 120
const FLICK_VELOCITY = 500

export function AnnouncementsDeck({ announcements }: AnnouncementsDeckProps) {
  const [deck, setDeck] = useState<Announcement[]>(announcements)
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [exitX, setExitX] = useState(0)
  const [exiting, setExiting] = useState<string | null>(null)
  const dragStartX = useRef(0)
  const dragStartTime = useRef(0)
  const deckRef = useRef<HTMLDivElement>(null)

  // Detect prefers-reduced-motion
  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Sync deck state when parent announcements change
  // Using a key-based approach to detect changes without setState-in-render
  const announcementsKey = announcements.map((a) => a._id).join(',')
  const [syncedKey, setSyncedKey] = useState(announcementsKey)
  if (syncedKey !== announcementsKey) {
    setSyncedKey(announcementsKey)
    setDeck(announcements)
    setRemovedIds(new Set())
    setExiting(null)
  }

  const visible = deck.filter((a) => !removedIds.has(a._id) && a._id !== exiting)
  const topThree = visible.slice(0, 3)

  const removeTop = useCallback((direction: 'left' | 'right') => {
    if (visible.length === 0) return
    const top = visible[0]
    if (!top) return

    if (!prefersReducedMotion) {
      setExiting(top._id)
      setExitX(direction === 'right' ? 600 : -600)
      setTimeout(() => {
        setRemovedIds((prev) => new Set(prev).add(top._id))
        setExiting(null)
        setExitX(0)
        setDragX(0)
      }, 300)
    } else {
      setRemovedIds((prev) => new Set(prev).add(top._id))
      setDragX(0)
    }
  }, [visible, prefersReducedMotion])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!deckRef.current?.contains(document.activeElement) && document.activeElement !== document.body) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        removeTop('left')
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        removeTop('right')
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [removeTop])

  // Pointer handlers for swipe
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (prefersReducedMotion) return
    if (topThree.length === 0) return
    dragStartX.current = e.clientX
    dragStartTime.current = Date.now()
    setIsDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [prefersReducedMotion, topThree.length])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return
    const delta = e.clientX - dragStartX.current
    setDragX(delta)
  }, [isDragging])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return
    setIsDragging(false)
    try { ;(e.target as HTMLElement).releasePointerCapture(e.pointerId) } catch {}

    const delta = e.clientX - dragStartX.current
    const elapsed = Date.now() - dragStartTime.current
    const velocity = elapsed > 0 ? Math.abs(delta) / (elapsed / 1000) : 0

    if (Math.abs(delta) > SWIPE_THRESHOLD || velocity > FLICK_VELOCITY) {
      removeTop(delta > 0 ? 'right' : 'left')
    } else {
      setDragX(0)
    }
  }, [isDragging, removeTop])

  // Dismiss entire widget
  const dismissAll = () => {
    const allIds = new Set(deck.map((a) => a._id))
    setRemovedIds(allIds)
  }

  // Empty state
  if (visible.length === 0) {
    return (
      <div className="w-full lg:w-[470px] flex-shrink-0">
        <div
          ref={deckRef}
          tabIndex={0}
          className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 min-h-[210px] flex flex-col"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">Announcements</span>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center py-6">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
              <Check className="w-6 h-6 text-green-500" />
            </div>
            <p className="text-sm font-medium text-slate-600">You're all caught up</p>
            <p className="text-xs text-slate-400 mt-1">No new announcements to read.</p>
          </div>
        </div>
      </div>
    )
  }

  const dragProgress = Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1)
  const rotation = prefersReducedMotion ? 0 : Math.max(-12, Math.min(12, dragX / 20))
  const top = topThree[0]
  const second = topThree[1]
  const third = topThree[2]

  // Stacked card transforms
  const cardTransforms = [
    { rotate: 0, y: 0, scale: 1, z: 30 },
    { rotate: 2.5, y: 10, scale: 0.96, z: 20 },
    { rotate: -3, y: 20, scale: 0.92, z: 10 },
  ]

  // Render a single card's content
  const renderCardContent = (a: Announcement) => {
    const style = ANNOUNCEMENT_STYLES[a.category]
    const isUrgent = a.priority === 'urgent'
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-slate-900">Announcements</span>
          </div>
        </div>
        {/* Body */}
        <div className="flex-1">
          <div className="flex items-start gap-2.5 mb-2">
            {isUrgent ? (
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            ) : (
              <div className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5" style={{ background: style.dot.replace('bg-', '#') === style.dot ? '#94a3b8' : undefined }}>
                <span className={`block w-2 h-2 rounded-full mx-auto mt-1 ${style.dot}`} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${isUrgent ? 'text-red-900' : 'text-slate-900'}`}>
                {a.title}
              </p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-3">
                {a.body}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 pl-6">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border ${style.pill}`}>
              {style.label}
            </span>
            <span className="text-[10px] text-slate-400">{timeAgo(a.postedDate)}</span>
            <span className="text-[10px] text-slate-400">by {a.author}</span>
          </div>
        </div>
        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
          <span className="text-[10px] text-slate-400">
            {visible.indexOf(a) + 1} of {visible.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => removeTop('left')}
              className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              aria-label="Snooze (swipe left)"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => removeTop('right')}
              className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              aria-label="Mark as read (swipe right)"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full lg:w-[470px] flex-shrink-0">
      <div
        ref={deckRef}
        tabIndex={0}
        className="relative"
        style={{ minHeight: 210 + 28, paddingBottom: 28 }}
      >
        {/* Dismiss X button — floats above the deck */}
        <button
          type="button"
          onClick={dismissAll}
          className="absolute top-2 right-2 z-40 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center text-slate-400 hover:bg-white hover:text-slate-600"
          aria-label="Dismiss all announcements"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Stacked cards */}
        {topThree.map((card, i) => {
          const transform = cardTransforms[i]
          const isTop = i === 0
          const isExiting = exiting === card._id

          // If this is the top card being dragged, apply drag transforms
          let currentX = 0
          let currentRotate = transform.rotate
          let currentY = transform.y
          let currentScale = transform.scale
          let currentZ = transform.z
          let opacity = 1

          if (isTop && isDragging) {
            currentX = dragX
            currentRotate = rotation
            currentY = transform.y
            currentScale = transform.scale
          } else if (isTop && isExiting) {
            currentX = exitX
            currentRotate = exitX / 20
            opacity = 0
          } else if (i === 1 && isDragging) {
            // Second card interpolates toward top position as drag progresses
            currentY = transform.y * (1 - dragProgress)
            currentScale = transform.scale + (1 - transform.scale) * dragProgress
            currentRotate = transform.rotate * (1 - dragProgress)
          }

          return (
            <div
              key={card._id}
              className="absolute inset-0"
              style={{
                zIndex: currentZ,
                transform: `translateY(${currentY}px) scale(${currentScale}) rotate(${currentRotate}deg)`,
                transition: isDragging && isTop
                  ? 'none'
                  : 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease',
                opacity,
                pointerEvents: isTop ? 'auto' : 'none',
              }}
            >
              <div
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-full select-none"
                style={{
                  minHeight: 210,
                  touchAction: 'pan-y',
                  cursor: isTop && !prefersReducedMotion ? (isDragging ? 'grabbing' : 'grab') : 'default',
                }}
                onPointerDown={isTop ? onPointerDown : undefined}
                onPointerMove={isTop ? onPointerMove : undefined}
                onPointerUp={isTop ? onPointerUp : undefined}
                onPointerCancel={isTop ? onPointerUp : undefined}
              >
                {renderCardContent(card)}
              </div>

              {/* Swipe direction stamps (only on top card while dragging) */}
              {isTop && isDragging && dragX > 40 && (
                <div
                  className="absolute top-4 left-4 px-3 py-1 rounded-full bg-green-500 text-white text-xs font-bold flex items-center gap-1"
                  style={{ opacity: Math.min(dragProgress * 1.5, 1) }}
                >
                  <Check className="w-3 h-3" /> READ
                </div>
              )}
              {isTop && isDragging && dragX < -40 && (
                <div
                  className="absolute top-4 right-4 px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center gap-1"
                  style={{ opacity: Math.min(dragProgress * 1.5, 1) }}
                >
                  <Clock className="w-3 h-3" /> LATER
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
