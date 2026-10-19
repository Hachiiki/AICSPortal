'use client'

import {
  BookOpen,
  CalendarDays,
  Info,
  LayoutDashboard,
  MapPin,
  Settings,
  Users,
} from 'lucide-react'

// ============================================================
//  PreviewReadySurface — dev-only mock of the assembled dashboard.
//
//  The third phase of the Animation Lab preview: what the workspace
//  looks like once content has actually landed. It mirrors the
//  DashboardSkeleton's layout (same rail, topbar, hero, grades and
//  schedule wells) but filled with static mock content, and it is
//  labeled as a preview surface in the hero itself — the lab must
//  never misrepresent mock data as live portal data.
//
//  Dev-only: imported exclusively by PostLoginPreview, which only
//  renders behind the SHOW_POST_LOGIN_PREVIEW gate.
// ============================================================

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: BookOpen, label: 'Academics', active: false },
  { icon: CalendarDays, label: 'Events', active: false },
  { icon: Users, label: 'Professors', active: false },
  { icon: Settings, label: 'Settings', active: false },
]

const GRADE_ROWS = [
  { code: 'IT 401', subject: 'Web Systems and Technologies', units: '3', remark: 'Passed' },
  { code: 'IT 402', subject: 'Networks and Communications', units: '3', remark: 'Passed' },
  { code: 'IT 403', subject: 'Information Assurance', units: '3', remark: 'INC' },
  { code: 'IT 404', subject: 'Systems Integration', units: '3', remark: 'Passed' },
]

const TODAY_CLASSES = [
  { time: '08:00 – 09:30', subject: 'Web Systems', room: 'Lab 2' },
  { time: '10:00 – 11:30', subject: 'Info Assurance', room: 'Room 304' },
  { time: '13:00 – 14:30', subject: 'Capstone', room: 'Room 210' },
]

export function PreviewReadySurface() {
  return (
    <div className="min-h-dvh bg-slate-50 font-sans">
      {/* Sidebar — mirror of the real shell's fixed rail */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col bg-white border-r border-slate-200 p-4">
        <div className="flex items-center gap-2.5 mb-8 px-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-800 to-blue-600 grid place-items-center">
            <img src="/aics-logo.svg" alt="" className="w-5 h-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-slate-900">AICS Portal</p>
            <p className="text-[11px] text-slate-500">Commonwealth</p>
          </div>
        </div>
        <nav className="space-y-1">
          {NAV_ITEMS.map(({ icon: Icon, label, active }) => (
            <span
              key={label}
              className={`flex items-center gap-2.5 rounded-lg px-3 h-9 text-sm ${
                active ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </span>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-60">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <p className="text-sm font-semibold text-slate-900">Dashboard</p>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 border border-blue-200 grid place-items-center text-xs font-bold text-blue-700">
              JS
            </div>
            <div className="h-8 px-3 rounded-lg border border-slate-200 bg-white hidden sm:flex items-center text-xs text-slate-600">
              juan.santos
            </div>
          </div>
        </header>

        <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 lg:space-y-8">
          {/* Hero — the surface the sign-in animation's hero crossfades into */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-slate-500">
                  1st Semester · AY 2026-2027
                </p>
                <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-blue-950">
                  Welcome back, Juan!
                </h1>
                <p className="mt-1.5 text-sm text-slate-600">
                  BS Information Technology · 3rd Year · IT-3A
                </p>
                <div className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-4">
                  <Stat label="GPA" value="1.75" />
                  <Stat label="Units Enrolled" value="24" />
                  <Stat label="Subjects" value="8" />
                  <Stat label="Standing" value="Regular" />
                </div>
                <p className="mt-5 inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Info className="w-3.5 h-3.5" />
                  Lab preview surface — mock content, not live data
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700 flex-shrink-0">
                <MapPin className="w-3.5 h-3.5" />
                AICS Commonwealth Branch
              </span>
            </div>
          </div>

          {/* Grades well */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Latest Grades</p>
                <p className="text-xs text-slate-500 mt-0.5">Released periods only</p>
              </div>
              <span className="h-8 px-3 rounded-lg border border-slate-200 flex items-center text-xs text-slate-600">
                View academics
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {GRADE_ROWS.map((row) => (
                <div key={row.code} className="px-6 py-3.5 flex items-center gap-4 text-sm">
                  <span className="text-slate-500 w-16 flex-shrink-0">{row.code}</span>
                  <span className="text-slate-800 flex-1 max-w-xs truncate">{row.subject}</span>
                  <span className="text-slate-500 w-8">{row.units}</span>
                  <span className="flex-1 max-w-[180px]" />
                  <span
                    className={`h-6 px-2 rounded-md flex items-center text-xs font-semibold ${
                      row.remark === 'INC'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-green-50 text-green-700 border border-green-200'
                    }`}
                  >
                    {row.remark}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule + today row */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Today&apos;s Schedule</p>
                  <p className="text-xs text-slate-500 mt-0.5">Wednesday · 3 classes</p>
                </div>
              </div>
              <div className="space-y-2">
                {TODAY_CLASSES.map((c) => (
                  <div
                    key={c.time}
                    className="flex items-center gap-4 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <span className="text-xs font-semibold text-slate-600 w-28">{c.time}</span>
                    <span className="text-sm text-slate-800 flex-1">{c.subject}</span>
                    <span className="text-xs text-slate-500">{c.room}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-full lg:w-[320px] flex-shrink-0 rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-3">
              <div className="pb-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900">Announcements</p>
                <p className="text-xs text-slate-500 mt-0.5">2 unread</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-sm font-medium text-slate-800">Enrollment opens Oct 25</p>
                <p className="text-xs text-slate-500 mt-0.5">Registrar · 2 days ago</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-sm font-medium text-slate-800">IT Week assembly</p>
                <p className="text-xs text-slate-500 mt-0.5">Student Affairs · 4 days ago</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-blue-950">{value}</p>
    </div>
  )
}
