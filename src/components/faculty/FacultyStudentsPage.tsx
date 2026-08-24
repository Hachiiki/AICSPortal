'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronRight,
  Search,
  X,
  Mail,
  Phone,
  BookOpen,
  Users as UsersIcon,
  Filter,
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
  // Faculty-specific data lifted to parent so it persists across route switches
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
}

interface StudentWithGrades extends FacultyStudent {
  subjects: FacultyApiSubject[]
}

export function FacultyStudentsPage({ student, courses, sessions, onNavigate, onLogout, events, professors, tasks, announcements, facultyData, facultyLoading }: FacultyStudentsPageProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [selectedStudent, setSelectedStudent] = useState<StudentWithGrades | null>(null)

  // Faculty data comes from the parent (lifted state), not an internal fetch.
  const faculty = facultyData?.faculty ?? null
  const subjects: FacultyApiSubject[] = facultyData?.subjects ?? []
  const allStudents: FacultyStudent[] = facultyData?.students ?? []
  const loading = facultyLoading ?? true

  // Build unique subject codes the faculty teaches
  const subjectCodes = useMemo(() => {
    const codes = new Map<string, string>()
    for (const s of subjects) {
      if (!codes.has(s.code)) codes.set(s.code, s.title)
    }
    return Array.from(codes.entries()).map(([code, title]) => ({ code, title }))
  }, [subjects])

  // Build enriched student list with their subjects
  const enrichedStudents = useMemo<StudentWithGrades[]>(() => {
    return allStudents.map((stu) => ({
      ...stu,
      subjects: subjects.filter((s) => s.studentUsername === stu.username),
    }))
  }, [allStudents, subjects])

  // Filter students by search + subject
  const filteredStudents = useMemo(() => {
    return enrichedStudents.filter((stu) => {
      if (subjectFilter !== 'all' && !stu.subjects.some((s) => s.code === subjectFilter)) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          stu.fullName.toLowerCase().includes(q) ||
          stu.studentNumber.toLowerCase().includes(q) ||
          stu.username.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [enrichedStudents, searchQuery, subjectFilter])

  const handleNavigate = (v: View) => {
    onNavigate(v)
  }

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
          {/* Page header */}
          <div>
            <button onClick={() => onNavigate('dashboard')} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 mb-3">
              <ChevronRight className="w-4 h-4 rotate-180" /> Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Students</h1>
            <p className="text-sm text-slate-500 mt-1">
              {faculty?.semester} &bull; AY {faculty?.academicYear} &bull; {enrichedStudents.length} students across {subjectCodes.length} subjects
            </p>
          </div>

          {/* Summary chips */}
          <div className="flex gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm">
              <UsersIcon className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-slate-500">Students</span>
              <span className="text-sm font-bold text-slate-900">{enrichedStudents.length}</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-slate-500">Subjects</span>
              <span className="text-sm font-bold text-slate-900">{subjectCodes.length}</span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, student number, or username..."
                className="w-full h-10 pl-10 pr-3 rounded-lg border border-slate-200 text-sm bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="flex items-center gap-1">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 bg-white"
              >
                <option value="all">All Subjects</option>
                {subjectCodes.map((s) => (
                  <option key={s.code} value={s.code}>{s.code} - {s.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Student roster table */}
          {filteredStudents.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-16 text-center">
              <UsersIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No students found.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-left">Student</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-left">Student #</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-left">Program</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-left">Year / Section</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">Subjects</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((stu) => (
                      <tr key={stu.username} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0" style={{ background: '#1e293b' }}>
                              {stu.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </div>
                            <span className="text-sm font-medium text-slate-900">{stu.fullName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3"><span className="font-mono text-xs text-slate-500">{stu.studentNumber}</span></td>
                        <td className="px-4 py-3"><span className="text-xs text-slate-600">{stu.program}</span></td>
                        <td className="px-4 py-3"><span className="text-xs text-slate-600">{stu.yearLevel} / {stu.section}</span></td>
                        <td className="px-4 py-3 text-center"><span className="text-sm font-medium text-slate-700">{stu.subjects.length}</span></td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedStudent(stu)}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Student detail modal */}
      {selectedStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          onClick={() => setSelectedStudent(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Student Details</h3>
              <button type="button" onClick={() => setSelectedStudent(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Student header */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0" style={{ background: '#1e293b' }}>
                  {selectedStudent.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{selectedStudent.fullName}</p>
                  <p className="text-xs text-slate-500 font-mono">{selectedStudent.studentNumber}</p>
                </div>
              </div>

              {/* Info rows */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-slate-400">Program</span><p className="text-slate-700 font-medium">{selectedStudent.program}</p></div>
                <div><span className="text-slate-400">Year / Section</span><p className="text-slate-700 font-medium">{selectedStudent.yearLevel} / {selectedStudent.section}</p></div>
                <div><span className="text-slate-400">Username</span><p className="text-slate-700 font-medium font-mono">{selectedStudent.username}</p></div>
              </div>

              {/* Subjects + Grades */}
              <div className="pt-3 border-t border-slate-100">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-2">Subjects you teach this student</p>
                {selectedStudent.subjects.length === 0 ? (
                  <p className="text-xs text-slate-400">No shared subjects.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedStudent.subjects.map((s, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-slate-50">
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-bold text-blue-700">{s.code}</p>
                          <p className="text-xs text-slate-600 truncate">{s.title}</p>
                          <p className="text-[10px] text-slate-400">{s.academicYear} {s.semester}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="flex gap-3 text-xs">
                            <div><span className="text-slate-400">M:</span> <span className="font-mono text-slate-700">{s.midterm}</span></div>
                            <div><span className="text-slate-400">F:</span> <span className="font-mono text-slate-700">{s.finals}</span></div>
                            <div><span className="text-slate-400">FG:</span> <span className="font-mono font-bold text-blue-700">{s.finalGrade}</span></div>
                          </div>
                          <div className="mt-1">
                            <RemarksBadge remarks={s.remarks} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
              <button type="button" onClick={() => setSelectedStudent(null)} className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50">Close</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
