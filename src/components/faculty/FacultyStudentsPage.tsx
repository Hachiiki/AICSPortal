'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  MapPin,
  Clock,
  Users as UsersIcon,
  Search,
} from 'lucide-react'
import type { Student, View } from '@/lib/aics/types'
import type { Course, Session } from '@/lib/schedule'
import type { PortalEvent } from '@/lib/aics/events'
import type { Professor } from '@/lib/aics/professors'
import type { Task } from '@/lib/aics/tasks'
import type { Announcement } from '@/lib/aics/announcements'
import type { FacultyMember, FacultyStudent } from '@/lib/aics/faculty'
import { FacultySidebar } from './FacultySidebar'
import { Topbar } from '../portal/Topbar'
import { RemarksBadge } from '../portal/RemarksBadge'
import { DashboardSkeleton } from '../portal/Skeleton'

interface FacultyStudentsPageProps {
  student: Student
  courses: Course[]
  sessions: Session[]
  onNavigate: (view: View) => void
  onLogout: () => void
  events?: PortalEvent[]
  professors?: Professor[]
  tasks?: Task[]
  announcements?: Announcement[]
  facultyData?: { faculty: FacultyMember; subjects: any[]; students: FacultyStudent[] } | null
  facultyLoading?: boolean
}

interface FacultyApiSubject {
  code: string
  title: string
  units: number
  studentUsername: string
  professor: string
  professorEmail: string
  schedule: string
  room: string
  midterm: string
  finals: string
  finalGrade: string
  remarks: string
  academicYear: string
  semester: string
  yearLevel: string
  status: string
  gradeStatus: string
}

interface StudentWithGrades extends FacultyStudent {
  subjects: FacultyApiSubject[]
}

// A section is a unique subject + room + schedule combo
interface Section {
  key: string
  subjectCode: string
  subjectTitle: string
  room: string
  schedule: string
  yearLevel: string
  academicYear: string
  semester: string
  students: StudentWithGrades[]
}

export function FacultyStudentsPage({
  student, courses, sessions, onNavigate, onLogout,
  events, professors, tasks, announcements,
  facultyData, facultyLoading,
}: FacultyStudentsPageProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<StudentWithGrades | null>(null)

  const faculty = facultyData?.faculty ?? null
  const subjects: FacultyApiSubject[] = facultyData?.subjects ?? []
  const allStudents: FacultyStudent[] = facultyData?.students ?? []
  const loading = facultyLoading ?? true

  // Build enriched students with their subjects
  const enrichedStudents = useMemo<StudentWithGrades[]>(() => {
    return allStudents.map((stu) => ({
      ...stu,
      subjects: subjects.filter((s) => s.studentUsername === stu.username),
    }))
  }, [allStudents, subjects])

  // Group students by section (subject code + room + schedule)
  const sections = useMemo<Section[]>(() => {
    const map = new Map<string, Section>()

    for (const s of subjects) {
      // Section key = subject code + academic year + semester
      // (same subject taught in different terms = different sections)
      const key = `${s.code}|${s.academicYear || ''}|${s.semester || ''}`
      if (!map.has(key)) {
        map.set(key, {
          key,
          subjectCode: s.code,
          subjectTitle: s.title,
          room: s.room || 'TBA',
          schedule: s.schedule || 'TBA',
          yearLevel: s.yearLevel || '',
          academicYear: s.academicYear || '',
          semester: s.semester || '',
          students: [],
        })
      }

      // Find the student for this subject enrollment
      const stu = enrichedStudents.find((st) => st.username === s.studentUsername)
      if (stu && !map.get(key)!.students.find((st) => st.username === stu.username)) {
        map.get(key)!.students.push(stu)
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      // Sort by academic year descending (current term first), then by subject code
      if (a.academicYear !== b.academicYear) return b.academicYear.localeCompare(a.academicYear)
      return a.subjectCode.localeCompare(b.subjectCode)
    })
  }, [subjects, enrichedStudents])

  // Filter sections by search
  const filteredSections = useMemo(() => {
    if (!searchQuery) return sections
    const q = searchQuery.toLowerCase()
    return sections.map((sec) => ({
      ...sec,
      students: sec.students.filter((stu) =>
        stu.fullName.toLowerCase().includes(q) ||
        stu.studentNumber.toLowerCase().includes(q) ||
        stu.username.toLowerCase().includes(q)
      ),
    })).filter((sec) => sec.students.length > 0 || sec.subjectCode.toLowerCase().includes(q) || sec.subjectTitle.toLowerCase().includes(q))
  }, [sections, searchQuery])

  const handleNavigate = (v: View) => {
    onNavigate(v)
  }

  const totalStudents = useMemo(() => {
    const usernames = new Set<string>()
    sections.forEach((sec) => sec.students.forEach((s) => usernames.add(s.username)))
    return usernames.size
  }, [sections])

  if (loading) {
    return <DashboardSkeleton />
  }

  if (!faculty) {
    return (
      <div className="min-h-dvh bg-slate-50 font-sans flex items-center justify-center">
        <p className="text-red-600 text-sm">Faculty data not found.</p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-slate-50 font-sans">
      <FacultySidebar active="my-students" onNavigate={handleNavigate} mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
      <div className="lg:pl-60">
        <Topbar student={student} onOpenMobileNav={() => setMobileNavOpen(true)} onProfile={() => onNavigate('profile')} onNavigate={onNavigate} onLogout={onLogout} events={events} professors={professors} tasks={tasks} />
        <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 min-w-0 space-y-6">
          {/* Page header — 1st Sem • AY 2026-2027 - 3 classes • 72 students + Export/Take attendance (prototype V23) */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <button onClick={() => onNavigate('dashboard')} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 mb-3">
                <ChevronRight className="w-4 h-4 rotate-180" /> Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Classes</h1>
              <p className="text-sm text-slate-500 mt-1">1st Sem • AY 2026-2027 - <span className="font-medium text-slate-900">{sections.length} classes</span> • <span className="font-medium text-slate-900">{totalStudents} students</span></p>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium hover:bg-slate-50 inline-flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Export roster (CSV)
              </button>
              <button className="px-3 py-2 rounded-lg bg-[#153357] text-white text-sm font-semibold inline-flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11h-6"/><path d="M19 8v6"/></svg> Take attendance
              </button>
            </div>
          </div>

          {/* Filters — card-less, styled dropdowns with section details (prototype V23) */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[220px]">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Search</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student name, number, or subject..."
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-sm bg-white shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Section / Room</label>
              <div className="relative mt-1">
                <select
                  value={searchQuery ? 'all' : 'all'}
                  onChange={() => {}}
                  className="h-10 px-3 pr-8 rounded-xl border border-slate-200 bg-white text-sm font-medium shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none appearance-none"
                >
                  <option value="all">All sections ({sections.length})</option>
                  {sections.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.subjectCode} — {s.room} • {s.schedule}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</label>
              <div className="relative mt-1">
                <select className="h-10 px-3 pr-8 rounded-xl border border-slate-200 bg-white text-sm font-medium shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none appearance-none">
                  <option>All statuses</option>
                  <option>Active</option>
                  <option>Dropped</option>
                  <option>Transferred</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Section cards (accordion) */}
          {filteredSections.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-16 text-center">
              <UsersIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No classes found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSections.map((sec) => {
                const isExpanded = expandedSection === sec.key
                return (
                  <div key={sec.key} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Section header (clickable) */}
                    <div
                      onClick={() => setExpandedSection(isExpanded ? null : sec.key)}
                      className="px-6 py-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-700">{sec.subjectCode}</span>
                          <h3 className="text-sm font-semibold text-slate-900 truncate">{sec.subjectTitle}</h3>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                            <MapPin className="w-3 h-3" /> {sec.room}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                            <Clock className="w-3 h-3" /> {sec.schedule}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {sec.yearLevel} &bull; AY {sec.academicYear} &bull; {sec.semester}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-medium text-slate-500 px-2 py-0.5 rounded-md bg-slate-100">
                          {sec.students.length} {sec.students.length === 1 ? 'student' : 'students'}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded roster — matches prototype V23: Prelim/Mid/Finals/FG with audit footer */}
                    {isExpanded && (
                      <div className="border-t border-slate-100">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-left">Student</th>
                                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-left">Student #</th>
                                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-left">Section</th>
                                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">Prelim</th>
                                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">Midterm</th>
                                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">Finals</th>
                                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">FG</th>
                                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">Remarks</th>
                                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">Status</th>
                                <th className="px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sec.students.map((stu) => {
                                const subj = stu.subjects.find((s) => s.code === sec.subjectCode)
                                const prelim = (subj as any)?.prelim || '-'
                                return (
                                  <tr key={stu.username} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60">
                                    <td className="px-6 py-3">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-semibold flex-shrink-0" style={{ background: '#1e293b' }}>
                                          {stu.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                        </div>
                                        <span className="text-sm font-medium text-slate-900">{stu.fullName}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3"><span className="font-mono text-xs text-slate-500">{stu.studentNumber}</span></td>
                                    <td className="px-4 py-3"><span className="text-xs text-slate-600">{stu.section}</span></td>
                                    <td className="px-4 py-3 text-center font-mono text-sm text-slate-700">{prelim}</td>
                                    <td className="px-4 py-3 text-center font-mono text-sm text-slate-700">{subj?.midterm || '-'}</td>
                                    <td className="px-4 py-3 text-center font-mono text-sm text-slate-700">{subj?.finals || '-'}</td>
                                    <td className="px-4 py-3 text-center"><span className="font-mono text-sm font-bold text-blue-700">{subj?.finalGrade || '-'}</span></td>
                                    <td className="px-4 py-3 text-center">{subj && <RemarksBadge remarks={subj.remarks} />}</td>
                                    <td className="px-4 py-3 text-center">
                                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                      <div className="flex justify-end gap-1">
                                        <button
                                          type="button"
                                          onClick={() => setSelectedStudent(stu)}
                                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200"
                                        >
                                          View
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => onNavigate('grade-encoding')}
                                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-200 hover:bg-slate-50"
                                        >
                                          Grade
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2 text-xs">
                          <button className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-medium hover:bg-slate-50 inline-flex items-center gap-1.5">
                            <UsersIcon className="w-3.5 h-3.5" /> Message section
                          </button>
                          <button className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-medium hover:bg-slate-50 inline-flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" /> Take attendance
                          </button>
                          <span className="ml-auto text-slate-500">Click View for student file.</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>

      {/* Student detail drawer — slide-over from right (prototype V23 drawer, not modal) */}
      <AnimatePresence>
        {selectedStudent && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
              onClick={() => setSelectedStudent(null)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ x: 520 }}
              animate={{ x: 0 }}
              exit={{ x: 520 }}
              transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
              className="fixed right-0 top-0 h-full w-full max-w-[520px] bg-white shadow-2xl z-50 flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label="Student file"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-14 px-6 border-b border-slate-200 flex items-center justify-between shrink-0">
                <h3 className="font-bold text-sm text-slate-900">Student file • Branch-scoped</h3>
                <button type="button" onClick={() => setSelectedStudent(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0" style={{ background: '#1e293b' }}>
                    {selectedStudent.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{selectedStudent.fullName}</p>
                    <p className="text-xs text-slate-500 font-mono">{selectedStudent.studentNumber} • {selectedStudent.username} • {selectedStudent.program} {selectedStudent.section}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Branch-scoped</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Contact</p>
                    <p className="font-medium mt-1 text-slate-900">{selectedStudent.fullName}</p>
                    <p className="text-xs text-slate-500">—</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Year / Section</p>
                    <p className="font-medium mt-1 text-slate-900">{selectedStudent.yearLevel} / {selectedStudent.section}</p>
                    <p className="text-xs text-slate-500">{selectedStudent.program}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Username</p>
                    <p className="font-medium mt-1 font-mono text-slate-900">{selectedStudent.username}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Program</p>
                    <p className="font-medium mt-1 text-slate-900">{selectedStudent.program}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Grades you teach this student</p>
                    <span className="text-xs font-mono bg-white border px-2 py-0.5 rounded">{selectedStudent.subjects.length} subjects</span>
                  </div>
                  <div className="p-3 space-y-2">
                    {selectedStudent.subjects.length === 0 ? (
                      <p className="text-xs text-slate-400">No shared subjects.</p>
                    ) : (
                      selectedStudent.subjects.map((s, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="min-w-0">
                            <p className="font-mono text-xs font-bold text-blue-700">{s.code}</p>
                            <p className="text-xs text-slate-700 truncate">{s.title}</p>
                            <p className="text-[10px] text-slate-500">{s.academicYear} {s.semester} • {s.yearLevel}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="flex gap-2 text-xs">
                              <span>
                                <span className="text-slate-400">P:</span> <span className="font-mono text-slate-700">{(s as any).prelim || '-'}</span>
                              </span>
                              <span>
                                <span className="text-slate-400">M:</span> <span className="font-mono text-slate-700">{s.midterm || '-'}</span>
                              </span>
                              <span>
                                <span className="text-slate-400">F:</span> <span className="font-mono text-slate-700">{s.finals || '-'}</span>
                              </span>
                              <span>
                                <span className="text-slate-400">FG:</span> <span className="font-mono font-bold text-blue-700">{s.finalGrade || '-'}</span>
                              </span>
                            </div>
                            <div className="mt-1">
                              <RemarksBadge remarks={s.remarks} />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Classroom management</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button className="h-9 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50">Upload materials</button>
                    <button className="h-9 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50">Announce quiz</button>
                    <button className="h-9 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50">Attendance history</button>
                    <button className="h-9 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50">In/Out log</button>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-slate-200 flex gap-2 shrink-0">
                <button type="button" onClick={() => setSelectedStudent(null)} className="flex-1 h-10 rounded-lg border border-slate-200 font-medium text-sm hover:bg-slate-50">
                  Close
                </button>
                <button type="button" onClick={() => onNavigate('grade-encoding')} className="flex-1 h-10 rounded-lg bg-[#153357] text-white font-semibold text-sm inline-flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5z"/></svg> Encode grades
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
