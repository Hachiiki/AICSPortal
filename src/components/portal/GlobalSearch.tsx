'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Search,
  Home,
  GraduationCap,
  CalendarDays,
  Users,
  User,
  BookOpen,
  FileText,
  ClipboardList,
  CornerDownLeft,
  X,
  type LucideIcon,
} from 'lucide-react'
import type { View, Student } from '@/lib/aics/types'
import type { PortalEvent } from '@/lib/aics/events'
import { CATEGORY_LABELS } from '@/lib/aics/events'
import type { Professor } from '@/lib/aics/professors'
import type { Task } from '@/lib/aics/tasks'

interface GlobalSearchProps {
  student: Student
  events?: PortalEvent[]
  professors?: Professor[]
  tasks?: Task[]
  onNavigate: (view: View) => void
}

// A single entry in the searchable index.
interface SearchItem {
  id: string
  type: ResultType
  label: string
  hint: string
  icon: LucideIcon
  view: View
  // Lowercased haystack used for matching.
  keywords: string
}

type ResultType = 'Page' | 'Subject' | 'Professor' | 'Event' | 'Task' | 'Document'

// Order in which result groups are displayed.
const GROUP_ORDER: ResultType[] = ['Page', 'Subject', 'Professor', 'Event', 'Task', 'Document']

const GROUP_LABELS: Record<ResultType, string> = {
  Page: 'Pages',
  Subject: 'Subjects',
  Professor: 'Professors',
  Event: 'Events',
  Task: 'Tasks',
  Document: 'Documents',
}

// Pages the user can jump to. Shown verbatim when the search is empty
// (focused with no query) so the search doubles as quick navigation.
const QUICK_LINKS: SearchItem[] = [
  { id: 'page-dashboard', type: 'Page', label: 'Dashboard', hint: 'Overview & today\'s classes', icon: Home, view: 'dashboard', keywords: 'dashboard home overview' },
  { id: 'page-academics', type: 'Page', label: 'Academics', hint: 'Grades, subjects & tasks', icon: GraduationCap, view: 'academics', keywords: 'academics grades subjects tasks school' },
  { id: 'page-events', type: 'Page', label: 'Events', hint: 'School calendar', icon: CalendarDays, view: 'events', keywords: 'events calendar schedule holiday deadline campus' },
  { id: 'page-professors', type: 'Page', label: 'Professors', hint: 'Faculty directory', icon: Users, view: 'professors', keywords: 'professors faculty teacher instructor directory' },
  { id: 'page-profile', type: 'Page', label: 'Profile', hint: 'Student ID & documents', icon: User, view: 'profile', keywords: 'profile id card account documents settings' },
]

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// Build the full searchable index from the student's data plus the
// optional collections (events / professors / tasks) that the parent
// page happens to have loaded.
function buildIndex(
  student: Student,
  events?: PortalEvent[],
  professors?: Professor[],
  tasks?: Task[],
): SearchItem[] {
  const items: SearchItem[] = [...QUICK_LINKS]

  for (const s of student.subjects) {
    items.push({
      id: `subject-${s.code}`,
      type: 'Subject',
      label: s.title,
      hint: `${s.code} · ${s.professor || 'No professor'}`,
      icon: BookOpen,
      view: 'academics',
      keywords: `${s.code} ${s.title} ${s.professor} ${s.professorEmail} subject`.toLowerCase(),
    })
  }

  for (const d of student.documents ?? []) {
    items.push({
      id: `doc-${d.name}`,
      type: 'Document',
      label: d.name,
      hint: d.submitted ? `Submitted${d.dateSubmitted ? ' ' + formatDate(d.dateSubmitted) : ''}` : 'Not submitted',
      icon: FileText,
      view: 'profile',
      keywords: `${d.name} document requirement`.toLowerCase(),
    })
  }

  for (const p of professors ?? []) {
    items.push({
      id: `prof-${p._id}`,
      type: 'Professor',
      label: p.name,
      hint: [p.room, p.email].filter(Boolean).join(' · '),
      icon: Users,
      view: 'professors',
      keywords: `${p.name} ${p.email} ${p.room} ${p.officeHours} professor faculty`.toLowerCase(),
    })
  }

  for (const e of events ?? []) {
    items.push({
      id: `event-${e._id}`,
      type: 'Event',
      label: e.title,
      hint: `${formatDate(e.date)} · ${CATEGORY_LABELS[e.category] ?? e.category}`,
      icon: CalendarDays,
      view: 'events',
      keywords: `${e.title} ${e.description ?? ''} ${CATEGORY_LABELS[e.category] ?? ''} event`.toLowerCase(),
    })
  }

  for (const t of tasks ?? []) {
    items.push({
      id: `task-${t._id}`,
      type: 'Task',
      label: t.title,
      hint: `${t.subjectCode} · ${t.type} · due ${formatDate(t.dueDate)}`,
      icon: ClipboardList,
      view: 'academics',
      keywords: `${t.title} ${t.subjectCode} ${t.type} ${t.description ?? ''} task assignment`.toLowerCase(),
    })
  }

  return items
}

interface MatchedItem extends SearchItem {
  score: number
}

function searchIndex(index: SearchItem[], query: string): SearchItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const tokens = q.split(/\s+/).filter(Boolean)
  const matched: MatchedItem[] = []

  for (const item of index) {
    const label = item.label.toLowerCase()
    const hint = item.hint.toLowerCase()
    let score = 0
    let allTokensMatched = true

    for (const token of tokens) {
      if (label.includes(token)) {
        score += label.startsWith(token) ? 50 : 30
      } else if (hint.includes(token)) {
        score += 15
      } else if (item.keywords.includes(token)) {
        score += 8
      } else {
        allTokensMatched = false
        break
      }
    }

    if (allTokensMatched) {
      // Prefer page results slightly so navigation wins ties.
      if (item.type === 'Page') score += 5
      matched.push({ ...item, score })
    }
  }

  matched.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))

  // Cap results so the dropdown stays manageable — at most 3 per group,
  // 8 total.
  const perGroup = new Map<ResultType, number>()
  const out: SearchItem[] = []
  for (const m of matched) {
    const count = perGroup.get(m.type) ?? 0
    if (count >= 3) continue
    perGroup.set(m.type, count + 1)
    out.push(m)
    if (out.length >= 8) break
  }
  return out
}

export function GlobalSearch({ student, events, professors, tasks, onNavigate }: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const index = useMemo(
    () => buildIndex(student, events, professors, tasks),
    [student, events, professors, tasks],
  )

  // Empty query → quick links; otherwise filter the full index.
  const results = useMemo(() => {
    if (!query.trim()) return QUICK_LINKS
    return searchIndex(index, query)
  }, [index, query])

  // Keep the active index in range as the result set changes.
  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  // Close on outside pointer interaction.
  useEffect(() => {
    if (!open) return
    const handlePointer = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointer)
    return () => document.removeEventListener('pointerdown', handlePointer)
  }, [open])

  // Global Ctrl/Cmd+K to focus the search.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const choose = (item: SearchItem) => {
    onNavigate(item.view)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = results[activeIndex]
      if (item) choose(item)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
      inputRef.current?.blur()
    }
  }

  // Group results for display.
  const grouped = useMemo(() => {
    const map = new Map<ResultType, SearchItem[]>()
    for (const r of results) {
      const arr = map.get(r.type) ?? []
      arr.push(r)
      map.set(r.type, arr)
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({ type: g, items: map.get(g)! }))
  }, [results])

  // Running flat index so keyboard nav can map activeIndex → item.
  const flat = results

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      {/* Search field */}
      <div
        className={`flex items-center gap-2 h-9 px-3 rounded-lg border bg-slate-50 transition-colors ${
          open ? 'border-blue-500 bg-white ring-2 ring-blue-100' : 'border-slate-200 hover:bg-white'
        }`}
      >
        <Search className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search pages, subjects, professors, events…"
          aria-label="Search the portal"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls="global-search-results"
          className="flex-1 min-w-0 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
            aria-label="Clear search"
            className="text-slate-400 hover:text-slate-700 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <kbd className="hidden sm:inline-block text-[10px] font-medium text-slate-400 border border-slate-200 rounded px-1.5 py-0.5 flex-shrink-0">
            Ctrl K
          </kbd>
        )}
      </div>

      {/* Results dropdown */}
      {open && (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-lg shadow-slate-900/5 overflow-hidden z-50 max-h-[70vh] overflow-y-auto"
        >
          {flat.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Search className="w-6 h-6 text-slate-300 mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm text-slate-500">No matches for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-slate-400 mt-1">Try a different keyword.</p>
            </div>
          ) : (
            <div className="py-2">
              {grouped.map(({ type, items }) => (
                <div key={type}>
                  <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {GROUP_LABELS[type]}
                  </p>
                  {items.map((item) => {
                    const flatIdx = flat.findIndex((f) => f.id === item.id)
                    const isActive = flatIdx === activeIndex
                    const Icon = item.icon
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onMouseEnter={() => setActiveIndex(flatIdx)}
                        onClick={() => choose(item)}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                          isActive ? 'bg-blue-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                            isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-slate-900 truncate">
                            {item.label}
                          </span>
                          <span className="block text-xs text-slate-500 truncate">{item.hint}</span>
                        </span>
                        {isActive && (
                          <CornerDownLeft className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" aria-hidden="true" />
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
