'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Loader2,
  RotateCcw,
  Search,
  Stamp,
  Users,
} from 'lucide-react'
import { getInitials } from '@/lib/aics/format'
import { PortalShell } from '../portal/PortalShell'
import type { AdminPageProps } from './admin-props'

// ============================================================
//  Admin People — every student, faculty, and admin account
//  across ALL branches (read-only directory).
//
//  GET /api/admin/people. Search, role/branch filters, sortable
//  name/username columns, 25-per-page pager (My Students pattern).
// ============================================================

interface Person {
  username: string
  fullName: string
  role: 'student' | 'faculty' | 'admin' | string
  branch: string
  branchName: string
  studentNumber: string
  programShort: string
  program: string
  yearLevel: string
  section: string
  enrollmentStatus: string
  email: string
  gpa: string
  deanLister: boolean
  photoUrl?: string
}

interface PeopleResponse {
  people: Person[]
  branches: { branch: string; branchName: string }[]
  counts: { total: number; students: number; faculty: number; admins: number }
}

type RoleFilter = 'all' | 'student' | 'faculty' | 'admin'
type SortKey = 'name' | 'username'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 25

const ROLE_BADGES: Record<string, string> = {
  student: 'bg-blue-50 text-blue-700 border-blue-200',
  faculty: 'bg-violet-50 text-violet-700 border-violet-200',
  admin: 'bg-amber-50 text-amber-700 border-amber-200',
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${ROLE_BADGES[role] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  )
}

function StatusPill({ status }: { status: string }) {
  if (!status) return <span className="text-xs text-slate-500">—</span>
  const tone =
    status === 'Enrolled' || status === 'Active'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : status === 'Dropped' || status === 'Transferred'
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-slate-100 text-slate-600 border-slate-200'
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${tone}`}>
      {status}
    </span>
  )
}

function PersonAvatar({ person }: { person: Person }) {
  return (
    <span className="w-8 h-8 rounded-full bg-[#153357] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden">
      {person.photoUrl ? (
        <img src={person.photoUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        getInitials(person.fullName)
      )}
    </span>
  )
}

export function AdminPeoplePage({ student, onNavigate, onLogout, events, professors, tasks, inbox }: AdminPageProps) {
  const [data, setData] = useState<PeopleResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [branchFilter, setBranchFilter] = useState<'all' | string>('all')
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(0)

  const fetchPeople = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/people')
      const json = await res.json()
      if (json.ok) setData({ people: json.people, branches: json.branches, counts: json.counts })
      else setError(json.error || 'Failed to load directory.')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPeople()
  }, [fetchPeople])

  // Filter + sort the roster. Page resets whenever any filter or the
  // sort changes so the pager never points past the last page.
  const filtered = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    const rows = data.people
      .filter((p) => (roleFilter === 'all' ? true : p.role === roleFilter))
      .filter((p) => (branchFilter === 'all' ? true : p.branch === branchFilter))
      .filter((p) => {
        if (!q) return true
        return [p.fullName, p.username, p.email, p.studentNumber, p.programShort, p.section]
          .some((v) => v.toLowerCase().includes(q))
      })
    rows.sort((a, b) => {
      const cmp =
        sortKey === 'name'
          ? a.fullName.localeCompare(b.fullName)
          : a.username.localeCompare(b.username)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return rows
  }, [data, roleFilter, branchFilter, query, sortKey, sortDir])

  useEffect(() => {
    setPage(0)
  }, [roleFilter, branchFilter, query, sortKey, sortDir])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const SortHeader = ({ label, sort, className = '' }: { label: string; sort: SortKey; className?: string }) => (
    <th className={`bg-slate-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 ${className}`}>
      <button
        type="button"
        onClick={() => toggleSort(sort)}
        className="inline-flex items-center gap-1 hover:text-slate-700"
        aria-label={`Sort by ${label}`}
      >
        {label}
        {sortKey === sort ? (
          sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : null}
      </button>
    </th>
  )

  return (
    <PortalShell
      student={student}
      active="admin-people"
      onNavigate={onNavigate}
      onLogout={onLogout}
      events={events}
      professors={professors}
      tasks={tasks}
      inbox={inbox}
    >
      <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-balance text-slate-900">Students &amp; Faculty</h1>
          <p className="text-sm text-slate-500 mt-1">
            Every account across every branch — read-only directory for lookups and audits.
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading directory...</p>
          </div>
        ) : error || !data ? (
          <div className="bg-white rounded-xl border border-red-200 shadow-sm px-6 py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-sm text-red-600 font-medium mb-1">{error || 'Something went wrong.'}</p>
            <button type="button" onClick={fetchPeople} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#153357] text-white text-sm font-semibold hover:bg-[#0f2744]">
              <RotateCcw className="w-4 h-4" /> Try again
            </button>
          </div>
        ) : (
          <>
            {/* Role filter chips with counts */}
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { key: 'all', label: 'Everyone', count: data.counts.total, icon: Users },
                  { key: 'student', label: 'Students', count: data.counts.students, icon: GraduationCap },
                  { key: 'faculty', label: 'Faculty', count: data.counts.faculty, icon: Users },
                  { key: 'admin', label: 'Admins', count: data.counts.admins, icon: Stamp },
                ] as const
              ).map(({ key, label, count, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRoleFilter(key as RoleFilter)}
                  aria-pressed={roleFilter === key}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    roleFilter === key
                      ? 'bg-[#153357] text-white border-[#153357]'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  <span className={`tabular-nums ${roleFilter === key ? 'text-blue-200' : 'text-slate-500'}`}>{count}</span>
                </button>
              ))}
            </div>

            {/* Search + branch filter */}
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, username, email, student #..."
                  aria-label="Search directory"
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                aria-label="Filter by branch"
                className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All branches</option>
                {data.branches.map((b) => (
                  <option key={b.branch} value={b.branch}>
                    {b.branchName}
                  </option>
                ))}
              </select>
            </div>

            {/* Directory table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[880px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <SortHeader label="Name" sort="name" />
                      <SortHeader label="Username" sort="username" />
                      <th className="bg-slate-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Role</th>
                      <th className="bg-slate-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Branch</th>
                      <th className="bg-slate-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Program</th>
                      <th className="bg-slate-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Year &amp; Section</th>
                      <th className="bg-slate-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                      <th className="bg-slate-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                          No accounts match your filters.
                        </td>
                      </tr>
                    ) : (
                      pageRows.map((p) => (
                        <tr key={`${p.branch}/${p.username}`} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <PersonAvatar person={p} />
                              <div className="min-w-0">
                                <p className="font-medium text-slate-800 truncate">{p.fullName}</p>
                                {p.studentNumber ? <p className="text-[11px] text-slate-500 tabular-nums">{p.studentNumber}</p> : null}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.username}</td>
                          <td className="px-4 py-3">
                            <RoleBadge role={p.role} />
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{p.branchName}</td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {p.role === 'student' ? p.programShort || '—' : '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {p.role === 'student' ? [p.yearLevel, p.section].filter(Boolean).join(' · ') || '—' : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill status={p.role === 'student' ? p.enrollmentStatus : p.role === 'faculty' ? 'Active' : ''} />
                          </td>
                          <td className="px-4 py-3 text-slate-600">{p.email || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pager */}
              {filtered.length > PAGE_SIZE ? (
                <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500 tabular-nums">
                    {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={safePage === 0}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-slate-500 tabular-nums px-1">
                      {safePage + 1} / {pageCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                      disabled={safePage >= pageCount - 1}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        )}
      </main>
    </PortalShell>
  )
}
