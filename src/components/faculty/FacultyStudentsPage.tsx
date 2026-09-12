'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  X,
  MapPin,
  Clock,
  History,
  Users as UsersIcon,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Student, View } from '@/lib/aics/types'
import type { Course, Session } from '@/lib/schedule'
import type { PortalEvent } from '@/lib/aics/events'
import type { Professor } from '@/lib/aics/professors'
import type { Task } from '@/lib/aics/tasks'
import type { NotificationInbox } from '@/lib/aics/notifications'
import type { Announcement } from '@/lib/aics/announcements'
import type { FacultyMember, FacultyStudent } from '@/lib/aics/faculty'
import { PortalShell } from '../portal/PortalShell'
import { Modal } from '../portal/Modal'
import { RemarksBadge } from '../portal/RemarksBadge'
import { DashboardSkeleton } from '../portal/Skeleton'
import { AttendanceModal } from './AttendanceModal'
import { useFacultyRows, type FacultyApiSubject, type StudentWithGrades } from '@/lib/aics/use-faculty-rows'

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
  inbox?: NotificationInbox
  facultyLoading?: boolean
}



interface Section {
  key: string
  subjectCode: string
  subjectTitle: string
  room: string
  schedule: string
  yearLevel: string
  section: string
  academicYear: string
  semester: string
  students: StudentWithGrades[]
}

// Roster rows per page in an expanded section. The pager only
// appears when a section holds more than this many students.
const PAGE_SIZE = 25

export function FacultyStudentsPage({
  student, courses, sessions, onNavigate, onLogout,
  events, professors, tasks, announcements,
  facultyData, facultyLoading,
  inbox,
}: FacultyStudentsPageProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<StudentWithGrades | null>(null)
  const [sectionFilter, setSectionFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'number' | 'prelim'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  // Roster pagination: one page number shared by the single expanded
  // section. Resets whenever the visible rows change.
  const [page, setPage] = useState(1)
  const [attendanceKey, setAttendanceKey] = useState<string | null>(null)
  // Section the student-file drawer was opened from, so its
  // Attendance history button knows which sessions to list.
  const [selectedSectionKey, setSelectedSectionKey] = useState<string | null>(null)
  // Message-section composer (refs #34, option B): one section at a
  // time, sent through the existing notification fan-out.
  const [messageSec, setMessageSec] = useState<{ key: string; subjectCode: string; subjectTitle: string; room: string } | null>(null)
  const [msgTitle, setMsgTitle] = useState('')
  const [msgBody, setMsgBody] = useState('')
  const [sending, setSending] = useState(false)
  // Stable closer: Modal's mount-only focus effect depends on onClose identity.
  const closeMessage = useCallback(() => {
    setMessageSec(null)
    setMsgTitle('')
    setMsgBody('')
  }, [])

  // Materials manager (refs #35): files go to Cloudinary (signed
  // direct upload into the portal's folder tree), links are just
  // posted. One subject at a time, resolved from the drawer.
  const [materialsSec, setMaterialsSec] = useState<{ key: string; subjectCode: string; subjectTitle: string } | null>(null)
  const [matTitle, setMatTitle] = useState('')
  const [matTab, setMatTab] = useState<'upload' | 'link'>('upload')
  const [matUrl, setMatUrl] = useState('')
  const [matFile, setMatFile] = useState<File | null>(null)
  const [matSaving, setMatSaving] = useState(false)
  const [matList, setMatList] = useState<{ _id: string; title: string; kind: string; url: string; bytes: number | null; format: string | null; uploadedAt: string }[] | null>(null)
  const [matLoading, setMatLoading] = useState(false)
  const [uploadsConfigured, setUploadsConfigured] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  // Stable closer for the materials modal.
  const closeMaterials = useCallback(() => {
    setMaterialsSec(null)
    setMatTitle('')
    setMatUrl('')
    setMatFile(null)
    setMatTab('upload')
  }, [])

  const fetchMaterials = useCallback(async (subjectCode: string) => {
    setMatLoading(true)
    try {
      const res = await fetch(`/api/materials?username=${encodeURIComponent(student.username)}`)
      const data = await res.json()
      if (data.ok) {
        setUploadsConfigured(data.uploadsConfigured !== false)
        if (data.uploadsConfigured === false) setMatTab('link')
        setMatList(((data.materials || []) as any[]).filter((m) => m.subjectCode === subjectCode))
      } else {
        toast.error(data.error || 'Failed to load materials.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setMatLoading(false)
    }
  }, [student.username])

  const openMaterials = (sectionKey: string | null) => {
    const sec = filteredSections.find((s) => s.key === sectionKey)
    if (!sec) {
      toast.info('Expand a class first, then open its materials.')
      return
    }
    setMaterialsSec({ key: sec.key, subjectCode: sec.subjectCode, subjectTitle: sec.subjectTitle })
    setMatList(null)
    fetchMaterials(sec.subjectCode)
  }

  const postLink = async () => {
    if (!materialsSec) return
    if (matTitle.trim().length === 0 || matUrl.trim().length === 0) {
      toast.error('Give the link a title and a URL first.')
      return
    }
    setMatSaving(true)
    try {
      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch: faculty?.branch || student.branch,
          subjectCode: materialsSec.subjectCode,
          title: matTitle.trim(),
          kind: 'link',
          url: matUrl.trim(),
          performedBy: student.username,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        toast.success(data.message || 'Link posted.')
        setMatTitle('')
        setMatUrl('')
        fetchMaterials(materialsSec.subjectCode)
      } else {
        toast.error(data.error || 'Failed to post link.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setMatSaving(false)
    }
  }

  const matExt = (name: string) => {
    const parts = name.toLowerCase().split('.')
    return parts.length > 1 ? parts[parts.length - 1] : ''
  }

  const postFile = async () => {
    if (!materialsSec || !matFile) return
    if (matTitle.trim().length === 0) {
      toast.error('Give the file a title first.')
      return
    }
    const ext = matExt(matFile.name)
    const resourceType = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext) ? 'image'
      : ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'csv', 'zip'].includes(ext) ? 'raw' : null
    if (!resourceType) {
      toast.error('That file type is not allowed (pdf, office docs, images, txt, csv, zip).')
      return
    }
    if (matFile.size > 10 * 1024 * 1024) {
      toast.error('Files must be 10 MB or less.')
      return
    }
    setMatSaving(true)
    try {
      // 1. Signed params for one direct browser upload.
      const signRes = await fetch('/api/materials/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectCode: materialsSec.subjectCode, resourceType, performedBy: student.username }),
      })
      const sign = await signRes.json()
      if (!sign.ok) throw new Error(sign.error || 'Upload is not available right now.')
      // 2. File goes straight to Cloudinary, never through Vercel.
      const form = new FormData()
      form.append('file', matFile)
      form.append('api_key', sign.apiKey)
      form.append('timestamp', String(sign.timestamp))
      form.append('folder', sign.folder)
      form.append('signature', sign.signature)
      const upRes = await fetch(sign.uploadUrl, { method: 'POST', body: form })
      const uploaded = await upRes.json()
      if (!upRes.ok || !uploaded.secure_url) throw new Error(uploaded?.error?.message || 'Cloudinary upload failed.')
      // 3. Record the asset so the subject sees it.
      const recRes = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch: faculty?.branch || student.branch,
          subjectCode: materialsSec.subjectCode,
          title: matTitle.trim(),
          kind: 'file',
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
          resourceType,
          bytes: uploaded.bytes,
          format: uploaded.format,
          filename: matFile.name,
          performedBy: student.username,
        }),
      })
      const rec = await recRes.json()
      if (!rec.ok) throw new Error(rec.error || 'Failed to save the file record.')
      toast.success(rec.message || 'File posted.')
      setMatTitle('')
      setMatFile(null)
      fetchMaterials(materialsSec.subjectCode)
    } catch (e: any) {
      toast.error(e.message || 'Upload failed.')
    } finally {
      setMatSaving(false)
    }
  }

  const deleteMaterial = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/materials/${id}?username=${encodeURIComponent(student.username)}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.ok) {
        toast.success(data.message || 'Material deleted.')
        setMatList((prev) => (prev || []).filter((m) => m._id !== id))
      } else {
        toast.error(data.error || 'Failed to delete material.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }
  // Attendance history drawer: sessions for one section (newest
  // first) plus the present/absent map for the picked date.
  const [historyKey, setHistoryKey] = useState<string | null>(null)
  const [historySessions, setHistorySessions] = useState<{ date: string; takenBy: string; takenAt: string }[] | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyDate, setHistoryDate] = useState<string | null>(null)
  const [historyRecords, setHistoryRecords] = useState<Record<string, string> | null>(null)
  const [recordsLoading, setRecordsLoading] = useState(false)

  const faculty = facultyData?.faculty ?? null
  const loading = facultyLoading ?? true
  const { sections, enrichedStudents } = useFacultyRows(facultyData as any)

  const filteredSections = useMemo(() => {
    let result = sections
    if (sectionFilter !== 'all') {
      result = result.filter((sec) => sec.key === sectionFilter)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.map((sec) => ({
        ...sec,
        students: sec.students.filter((stu) =>
          stu.fullName.toLowerCase().includes(q) ||
          stu.studentNumber.toLowerCase().includes(q) ||
          stu.username.toLowerCase().includes(q)
        ),
      })).filter((sec) => sec.students.length > 0 || sec.subjectCode.toLowerCase().includes(q) || sec.subjectTitle.toLowerCase().includes(q))
    }
    if (statusFilter !== 'all') {
      result = result.map((sec) => ({
        ...sec,
        students: sec.students.filter((stu) => {
          const status = (stu.enrollmentStatus || 'Enrolled').toLowerCase()
          return status === statusFilter.toLowerCase()
        }),
      })).filter((sec) => sec.students.length > 0)
    }
    // Sorting per section for polish
    const dir = sortDir === 'asc' ? 1 : -1
    result = result.map((sec) => ({
      ...sec,
      students: [...sec.students].sort((a, b) => {
        if (sortBy === 'name') return a.fullName.localeCompare(b.fullName) * dir
        if (sortBy === 'number') return a.studentNumber.localeCompare(b.studentNumber) * dir
        if (sortBy === 'prelim') {
          const aSub = a.subjects.find((s) => s.code === sec.subjectCode)
          const bSub = b.subjects.find((s) => s.code === sec.subjectCode)
          const aPre = aSub?.prelim || ''
          const bPre = bSub?.prelim || ''
          // INC sorts last
          if (aPre === 'INC' && bPre !== 'INC') return 1 * dir
          if (bPre === 'INC' && aPre !== 'INC') return -1 * dir
          return aPre.localeCompare(bPre) * dir
        }
        return 0
      }),
    }))
    return result
  }, [sections, searchQuery, sectionFilter, statusFilter, sortBy, sortDir])

  const handleNavigate = (v: View) => { onNavigate(v) }

  // Page resets to 1 whenever the visible rows change. Each filter,
  // sort, and expand handler calls resetPage alongside its own setter
  // so the pager never points past the last page.
  const resetPage = () => { setPage(1) }

  // Section the attendance modal is open for, resolved from its key
  // so the modal always sees fresh roster data.
  const attendanceSec = attendanceKey
    ? filteredSections.find((sec) => sec.key === attendanceKey) || null
    : null

  const openAttendance = (sec: { key: string } | null) => {
    if (!sec) {
      toast.info('Pick a section first, then take attendance.')
      return
    }
    setAttendanceKey(sec.key)
  }

  const openHeaderAttendance = () => {
    if (sectionFilter !== 'all') {
      const sec = filteredSections.find((s) => s.key === sectionFilter)
      openAttendance(sec || null)
      return
    }
    openAttendance(filteredSections[0] || null)
  }

  const sendMessage = async () => {
    if (!messageSec) return
    if (msgTitle.trim().length === 0 || msgBody.trim().length === 0) {
      toast.error('Give the message a title and a body first.')
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch: faculty?.branch || student.branch,
          title: msgTitle.trim(),
          body: msgBody.trim(),
          sectionKeys: [messageSec.key],
          performedBy: student.username,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        toast.success(data.message || 'Message sent.')
        closeMessage()
      } else {
        toast.error(data.error || 'Failed to send message.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const loadHistoryRecords = async (key: string, date: string) => {
    setRecordsLoading(true)
    try {
      const params = new URLSearchParams({ username: student.username, sectionKey: key, date })
      const res = await fetch(`/api/attendance?${params.toString()}`)
      const data = await res.json()
      if (data.ok) {
        setHistoryDate(date)
        setHistoryRecords(data.records || {})
      } else {
        toast.error(data.error || 'Failed to load attendance records.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setRecordsLoading(false)
    }
  }

  const openHistory = async (sectionKey: string | null) => {
    if (!sectionKey) {
      toast.info('Expand a class first, then open its attendance history.')
      return
    }
    setHistoryKey(sectionKey)
    setHistorySessions(null)
    setHistoryDate(null)
    setHistoryRecords(null)
    setHistoryLoading(true)
    try {
      const params = new URLSearchParams({ username: student.username, sectionKey })
      const res = await fetch(`/api/attendance?${params.toString()}`)
      const data = await res.json()
      if (data.ok) {
        const sessions = (data.sessions || []) as { date: string; takenBy: string; takenAt: string }[]
        setHistorySessions(sessions)
        // The API also returns the latest record map; show it right away.
        if (sessions.length > 0) {
          setHistoryDate(sessions[0].date)
          setHistoryRecords(data.records || {})
        }
      } else {
        toast.error(data.error || 'Failed to load attendance history.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setHistoryLoading(false)
    }
  }

  const totalStudents = useMemo(() => {
    const usernames = new Set<string>()
    sections.forEach((sec) => sec.students.forEach((s) => usernames.add(s.username)))
    return usernames.size
  }, [sections])

  const handleExportCsv = () => {
    const rows: string[] = []
    rows.push(['Student Name', 'Student #', 'Username', 'Section', 'Program', 'Subject Code', 'Subject Title', 'Prelim', 'Midterm', 'Finals', 'Final Grade', 'Remarks', 'Status', 'Academic Year', 'Semester'].join(','))
    for (const sec of filteredSections) {
      for (const stu of sec.students) {
        const subj = stu.subjects.find((s) => s.code === sec.subjectCode)
        rows.push([
          `"${stu.fullName.replace(/"/g, '""')}"`,
          stu.studentNumber,
          stu.username,
          stu.section,
          `"${(stu.program || '').replace(/"/g, '""')}"`,
          sec.subjectCode,
          `"${sec.subjectTitle.replace(/"/g, '""')}"`,
          subj?.prelim || '',
          subj?.midterm || '',
          subj?.finals || '',
          subj?.finalGrade || '',
          subj?.remarks || '',
          stu.enrollmentStatus || 'Enrolled',
          sec.academicYear,
          sec.semester,
        ].join(','))
      }
    }
    if (rows.length === 1) {
      toast.info('No students to export for the current filters.')
      return
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `my-students-${faculty?.academicYear || 'export'}-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`Exported ${rows.length - 1} rows.`)
  }

  if (loading) return <DashboardSkeleton />
  if (!faculty) {
    return (
      <div className="min-h-dvh bg-slate-50 font-sans flex items-center justify-center">
        <p className="text-red-600 text-sm">Faculty data not found.</p>
      </div>
    )
  }

  return (
    <PortalShell
      student={student}
      active="my-students"
      onNavigate={handleNavigate}
      onLogout={onLogout}
      events={events}
      professors={professors}
      tasks={tasks}
      facultyData={facultyData}
      inbox={inbox}
    >
        <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 min-w-0 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <button onClick={() => onNavigate('dashboard')} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 mb-3">
                <ChevronLeft className="w-4 h-4" /> Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold tracking-tight text-balance text-slate-900">My Classes</h1>
              <p className="text-sm text-slate-500 mt-1">{faculty.semester} • AY {faculty.academicYear} - <span className="font-medium text-slate-900">{sections.length} classes</span> • <span className="font-medium text-slate-900">{totalStudents} students</span></p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleExportCsv} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium hover:bg-slate-50 inline-flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Export roster (CSV)
              </button>
              <button onClick={openHeaderAttendance} className="px-3 py-2 rounded-lg bg-[#153357] text-white text-sm font-semibold inline-flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11h-6"/><path d="M19 8v6"/></svg> Take attendance
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[220px]">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Search</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); resetPage() }} placeholder="Search student name, number, or subject..." className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-sm bg-white shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Section / Room</label>
              <div className="relative mt-1">
                <select value={sectionFilter} onChange={(e) => { setSectionFilter(e.target.value); resetPage() }} className="h-10 px-3 pr-8 rounded-xl border border-slate-200 bg-white text-sm font-medium shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none appearance-none">
                  <option value="all">All sections ({sections.length})</option>
                  {sections.map((s) => (<option key={s.key} value={s.key}>{s.subjectCode} — {s.room} • {s.schedule}</option>))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</label>
              <div className="relative mt-1">
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); resetPage() }} className="h-10 px-3 pr-8 rounded-xl border border-slate-200 bg-white text-sm font-medium shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none appearance-none">
                  <option value="all">All statuses</option>
                  <option value="Enrolled">Enrolled</option>
                  <option value="Active">Active</option>
                  <option value="Dropped">Dropped</option>
                  <option value="Transferred">Transferred</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {filteredSections.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-16 text-center">
              <UsersIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No classes found.</p>
              {(searchQuery || sectionFilter !== 'all' || statusFilter !== 'all') && (<button onClick={() => { setSearchQuery(''); setSectionFilter('all'); setStatusFilter('all'); resetPage() }} className="mt-3 text-xs font-medium text-blue-600 hover:underline">Clear filters</button>)}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSections.map((sec) => {
                const isExpanded = expandedSection === sec.key
                const pageCount = Math.max(1, Math.ceil(sec.students.length / PAGE_SIZE))
                const safePage = Math.min(page, pageCount)
                const pageStudents = sec.students.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
                return (
                  <div key={sec.key} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div onClick={() => { setExpandedSection(isExpanded ? null : sec.key); resetPage() }} className="px-6 py-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-700">{sec.subjectCode}</span>
                          <h3 className="text-sm font-semibold text-slate-900 truncate">{sec.subjectTitle}</h3>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500"><MapPin className="w-3 h-3" /> {sec.room}</span>
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500"><Clock className="w-3 h-3" /> {sec.schedule}</span>
                          <span className="text-[10px] text-slate-500">{sec.section || sec.yearLevel} &bull; {sec.yearLevel} &bull; AY {sec.academicYear} &bull; {sec.semester}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-medium text-slate-500 px-2 py-0.5 rounded-md bg-slate-100">{sec.students.length} {sec.students.length === 1 ? 'student' : 'students'}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-slate-100">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10">
                              <tr className="bg-slate-50 border-b border-slate-100">
                                <th onClick={() => { if (sortBy === 'name') setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); else { setSortBy('name'); setSortDir('asc') } resetPage(); }} className="px-6 py-2.5 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-left cursor-pointer hover:text-slate-700 select-none">Student {sortBy === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                                <th onClick={() => { if (sortBy === 'number') setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); else { setSortBy('number'); setSortDir('asc') } resetPage(); }} className="px-4 py-2.5 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-left cursor-pointer hover:text-slate-700 select-none">Student # {sortBy === 'number' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                                <th className="px-4 py-2.5 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-left">Section</th>
                                <th onClick={() => { if (sortBy === 'prelim') setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); else { setSortBy('prelim'); setSortDir('asc') } resetPage(); }} className="px-4 py-2.5 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center cursor-pointer hover:text-slate-700 select-none">Prelim {sortBy === 'prelim' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                                <th className="px-4 py-2.5 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">Midterm</th>
                                <th className="px-4 py-2.5 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">Finals</th>
                                <th className="px-4 py-2.5 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">FG</th>
                                <th className="px-4 py-2.5 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">Remarks</th>
                                <th className="px-4 py-2.5 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">Status</th>
                                <th className="px-6 py-2.5 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pageStudents.map((stu) => {
                                const subj = stu.subjects.find((s) => s.code === sec.subjectCode)
                                const prelim = subj?.prelim || '-'
                                const rawStatus = stu.enrollmentStatus || 'Enrolled'
                                const statusLower = rawStatus.toLowerCase()
                                const statusBadge = statusLower === 'dropped' ? 'bg-red-50 text-red-700 border-red-200' : statusLower === 'transferred' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                return (
                                  <tr key={stu.username} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60">
                                    <td className="px-6 py-3">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-semibold flex-shrink-0" style={{ background: '#1e293b' }}>{stu.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
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
                                    <td className="px-4 py-3 text-center"><span className={`text-[11px] px-2 py-0.5 rounded-full border ${statusBadge}`}>{rawStatus}</span></td>
                                    <td className="px-6 py-3 text-right">
                                      <div className="flex justify-end gap-1">
                                        <button type="button" onClick={() => { setSelectedStudent(stu); setSelectedSectionKey(sec.key) }} className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200">View</button>
                                        <button type="button" onClick={() => onNavigate('grade-encoding')} className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-200 hover:bg-slate-50">Grade</button>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                        {sec.students.length > PAGE_SIZE && (
                          <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
                            <span className="text-slate-500">
                              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sec.students.length)} of {sec.students.length}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={safePage <= 1}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Prev
                              </button>
                              <span className="text-slate-500 font-medium">Page {safePage} of {pageCount}</span>
                              <button
                                type="button"
                                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                                disabled={safePage >= pageCount}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2 text-xs">
                          <button onClick={() => setMessageSec({ key: sec.key, subjectCode: sec.subjectCode, subjectTitle: sec.subjectTitle, room: sec.room })} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-medium hover:bg-slate-50 inline-flex items-center gap-1.5"><UsersIcon className="w-3.5 h-3.5" /> Message section</button>
                          <button onClick={() => openAttendance(sec)} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-medium hover:bg-slate-50 inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Take attendance</button>
                          <button onClick={() => openHistory(sec.key)} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-medium hover:bg-slate-50 inline-flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> History</button>
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

      <AnimatePresence>
        {selectedStudent && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" onClick={() => setSelectedStudent(null)} aria-hidden="true" />
            <motion.div initial={{ x: 520 }} animate={{ x: 0 }} exit={{ x: 520 }} transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }} className="fixed right-0 top-0 h-full w-full max-w-[520px] bg-white shadow-2xl z-50 flex flex-col" role="dialog" aria-modal="true" aria-label="Student file" onClick={(e) => e.stopPropagation()}>
              <div className="h-14 px-6 border-b border-slate-200 flex items-center justify-between shrink-0">
                <h3 className="font-bold text-sm text-slate-900">Student file</h3>
                <button type="button" onClick={() => setSelectedStudent(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0" style={{ background: '#1e293b' }}>{selectedStudent.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('')}</div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{selectedStudent.fullName}</p>
                    <p className="text-xs text-slate-500 font-mono">{selectedStudent.studentNumber} • {selectedStudent.username} • {selectedStudent.program} {selectedStudent.section}</p>
                    <div className="flex gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${selectedStudent.enrollmentStatus?.toLowerCase() === 'dropped' ? 'bg-red-50 text-red-700 border-red-200' : selectedStudent.enrollmentStatus?.toLowerCase() === 'transferred' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{selectedStudent.enrollmentStatus || 'Enrolled'}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{faculty.branch}</span>
                      {selectedStudent.gpa && <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">GPA {selectedStudent.gpa}</span>}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Contact</p>
                    <p className="font-medium mt-1 text-slate-900">{selectedStudent.email || '—'}</p>
                    <p className="text-xs text-slate-500">{selectedStudent.phone || 'No phone on file'}</p>
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
                    <p className="text-xs text-slate-500">GPA: {selectedStudent.gpa || '—'}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Grades you teach this student</p>
                    <span className="text-xs font-mono bg-white border px-2 py-0.5 rounded">{selectedStudent.subjects.length} subjects</span>
                  </div>
                  <div className="p-3 space-y-2">
                    {selectedStudent.subjects.length === 0 ? (<p className="text-xs text-slate-500">No shared subjects.</p>) : (selectedStudent.subjects.map((s, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="min-w-0">
                            <p className="font-mono text-xs font-bold text-blue-700">{s.code}</p>
                            <p className="text-xs text-slate-700 truncate">{s.title}</p>
                            <p className="text-[10px] text-slate-500">{s.academicYear} {s.semester} • {s.yearLevel}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="flex gap-2 text-xs">
                              <span><span className="text-slate-500">P:</span> <span className="font-mono text-slate-700">{s.prelim || '-'}</span></span>
                              <span><span className="text-slate-500">M:</span> <span className="font-mono text-slate-700">{s.midterm || '-'}</span></span>
                              <span><span className="text-slate-500">F:</span> <span className="font-mono text-slate-700">{s.finals || '-'}</span></span>
                              <span><span className="text-slate-500">FG:</span> <span className="font-mono font-bold text-blue-700">{s.finalGrade || '-'}</span></span>
                            </div>
                            <div className="mt-1"><RemarksBadge remarks={s.remarks} /></div>
                            <p className="text-[10px] text-slate-500 mt-1">{s.gradeStatus || 'No status'} • {s.status}</p>
                          </div>
                        </div>
                      )))}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Classroom management</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button onClick={() => openMaterials(selectedSectionKey)} className="h-9 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50">Upload materials</button>
                    <button
                      onClick={() => {
                        // Refs #36: Announce quiz is just a Quiz-type task post,
                        // so hand off to the Tasks composer with Quiz (and this
                        // class) preselected instead of toasting coming soon.
                        try {
                          const sec = filteredSections.find((s) => s.key === selectedSectionKey)
                          window.sessionStorage.setItem('aics_tasks_handoff', JSON.stringify({ type: 'Quiz', subjectCode: sec?.subjectCode }))
                        } catch {}
                        onNavigate('tasks')
                      }}
                      className="h-9 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50"
                    >
                      Announce quiz
                    </button>
                    <button onClick={() => openHistory(selectedSectionKey)} className="h-9 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50">Attendance history</button>
                    <div
                      aria-disabled="true"
                      title="Coming soon — needs a campus entry/exit data source"
                      className="h-9 rounded-lg border border-slate-200 bg-slate-50 font-medium inline-flex items-center justify-center gap-1.5 cursor-not-allowed select-none text-slate-500"
                    >
                      In/Out log
                      <span
                        className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{ background: '#f1f5f9', color: '#64748b' }}
                      >
                        Soon
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-slate-200 flex gap-2 shrink-0">
                <button type="button" onClick={() => { setSelectedStudent(null); setSelectedSectionKey(null) }} className="flex-1 h-10 rounded-lg border border-slate-200 font-medium text-sm hover:bg-slate-50">Close</button>
                <button type="button" onClick={() => onNavigate('grade-encoding')} className="flex-1 h-10 rounded-lg bg-[#153357] text-white font-semibold text-sm inline-flex items-center justify-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5z"/></svg> Encode grades</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {historyKey && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" onClick={() => setHistoryKey(null)} aria-hidden="true" />
            <motion.div initial={{ x: 520 }} animate={{ x: 0 }} exit={{ x: 520 }} transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }} className="fixed right-0 top-0 h-full w-full max-w-[520px] bg-white shadow-2xl z-50 flex flex-col" role="dialog" aria-modal="true" aria-label="Attendance history" onClick={(e) => e.stopPropagation()}>
              {(() => {
                const sec = filteredSections.find((s) => s.key === historyKey)
                const roster = new Map((sec?.students || []).map((s) => [s.username, s]))
                const names = (u: string) => roster.get(u)?.fullName || u
                const present = Object.entries(historyRecords || {}).filter(([, v]) => v === 'present').map(([u]) => u)
                const absent = Object.entries(historyRecords || {}).filter(([, v]) => v !== 'present').map(([u]) => u)
                const fmtDate = (d: string) => {
                  const dt = new Date(d.length <= 10 ? `${d}T12:00:00` : d)
                  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                }
                return (
                  <>
                    <div className="h-14 px-6 border-b border-slate-200 flex items-center justify-between shrink-0">
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-slate-900">Attendance history</h3>
                        <p className="text-xs text-slate-500 truncate">{sec ? `${sec.subjectCode} — ${sec.subjectTitle} • ${sec.room}` : historyKey}</p>
                      </div>
                      <button type="button" onClick={() => setHistoryKey(null)} aria-label="Close attendance history" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Sessions (newest first)</p>
                        {historyLoading || historySessions === null ? (
                          <p className="text-xs text-slate-500">Loading sessions…</p>
                        ) : historySessions.length === 0 ? (
                          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-center">
                            <p className="text-sm text-slate-500">No sessions yet</p>
                            <p className="text-xs text-slate-500 mt-1">Take attendance for this class and it will show up here.</p>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {historySessions.map((s) => (
                              <button
                                key={s.date}
                                type="button"
                                onClick={() => loadHistoryRecords(historyKey, s.date)}
                                aria-pressed={historyDate === s.date}
                                className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${historyDate === s.date ? 'bg-[#153357] text-white border-[#153357]' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                              >
                                {fmtDate(s.date)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {historyDate && (
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
                            {fmtDate(historyDate)} • {present.length} present • {absent.length} absent
                          </p>
                          {recordsLoading || historyRecords === null ? (
                            <p className="text-xs text-slate-500">Loading records…</p>
                          ) : (
                            <div className="space-y-3">
                              <div>
                                <p className="text-xs font-semibold text-emerald-700 mb-1.5">Present ({present.length})</p>
                                {present.length === 0 ? (
                                  <p className="text-xs text-slate-500">Nobody marked present.</p>
                                ) : (
                                  <ul className="space-y-1">
                                    {present.map((u) => (
                                      <li key={u} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-emerald-50/60 border border-emerald-100">
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-semibold flex-shrink-0" style={{ background: '#1e293b' }}>{names(u).split(' ').map((n) => n[0]).slice(0, 2).join('')}</div>
                                        <span className="text-sm font-medium text-slate-900 truncate">{names(u)}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-red-700 mb-1.5">Absent ({absent.length})</p>
                                {absent.length === 0 ? (
                                  <p className="text-xs text-slate-500">Nobody marked absent.</p>
                                ) : (
                                  <ul className="space-y-1">
                                    {absent.map((u) => (
                                      <li key={u} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-red-50/60 border border-red-100">
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-semibold flex-shrink-0" style={{ background: '#1e293b' }}>{names(u).split(' ').map((n) => n[0]).slice(0, 2).join('')}</div>
                                        <span className="text-sm font-medium text-slate-900 truncate">{names(u)}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="p-4 border-t border-slate-200 shrink-0">
                      <button type="button" onClick={() => setHistoryKey(null)} className="w-full h-10 rounded-lg border border-slate-200 font-medium text-sm hover:bg-slate-50">Close</button>
                    </div>
                  </>
                )
              })()}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {messageSec && (
        <Modal
          title={<>Message section — <span className="font-mono text-blue-700">{messageSec.subjectCode}</span></>}
          description={<>To every enrolled student in <span className="font-medium text-slate-700">{messageSec.subjectTitle} • {messageSec.room}</span>. Lands in their bell inbox; read state persists there.</>}
          onClose={closeMessage}
          footer={
            <>
              <button type="button" onClick={closeMessage} disabled={sending} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50 disabled:opacity-60">Cancel</button>
              <button
                type="button"
                onClick={sendMessage}
                disabled={sending || msgTitle.trim().length === 0 || msgBody.trim().length === 0}
                className="px-4 py-2 rounded-lg bg-[#153357] text-white text-sm font-semibold hover:bg-[#0f2744] disabled:opacity-60"
              >
                {sending ? 'Sending...' : 'Send message'}
              </button>
            </>
          }
        >
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Title</label>
          <input
            type="text"
            value={msgTitle}
            onChange={(e) => setMsgTitle(e.target.value)}
            maxLength={120}
            placeholder="e.g., Quiz moved to Friday"
            className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Message</label>
          <textarea
            value={msgBody}
            onChange={(e) => setMsgBody(e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="What should the section know..."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-y"
          />
        </Modal>
      )}

      {materialsSec && (
        <Modal
          title={<>Materials — <span className="font-mono text-blue-700">{materialsSec.subjectCode}</span></>}
          description={<>Files upload to the portal's Cloudinary folder; links post as-is. Enrolled students see both under Academics → Materials.</>}
          onClose={closeMaterials}
          maxWidthClass="max-w-2xl"
          footer={
            <button type="button" onClick={closeMaterials} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50">Close</button>
          }
        >
          {!uploadsConfigured && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              File uploads are not configured on this deployment — post a link instead.
            </p>
          )}
          <div className="flex gap-1 p-1 rounded-xl bg-slate-100 w-fit">
            <button
              type="button"
              onClick={() => setMatTab('upload')}
              disabled={!uploadsConfigured}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${matTab === 'upload' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'} disabled:opacity-50`}
            >
              Upload file
            </button>
            <button
              type="button"
              onClick={() => setMatTab('link')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${matTab === 'link' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Paste link
            </button>
          </div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Title</label>
          <input
            type="text"
            value={matTitle}
            onChange={(e) => setMatTitle(e.target.value)}
            maxLength={120}
            placeholder="e.g., Week 3 slides: Normalization"
            className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          {matTab === 'upload' ? (
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">File (10 MB max: pdf, office docs, images, txt, csv, zip)</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.webp,.gif,.zip"
                onChange={(e) => setMatFile(e.target.files?.[0] || null)}
                aria-label="Choose a file to upload"
                className="w-full text-sm text-slate-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border file:border-slate-200 file:bg-white file:text-xs file:font-medium hover:file:bg-slate-50"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={postFile}
                  disabled={matSaving || !matFile || matTitle.trim().length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#153357] text-white text-sm font-semibold hover:bg-[#0f2744] disabled:opacity-60"
                >
                  {matSaving ? 'Uploading...' : 'Upload & post'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">URL</label>
              <input
                type="url"
                value={matUrl}
                onChange={(e) => setMatUrl(e.target.value)}
                maxLength={2000}
                placeholder="https://..."
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={postLink}
                  disabled={matSaving || matTitle.trim().length === 0 || matUrl.trim().length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#153357] text-white text-sm font-semibold hover:bg-[#0f2744] disabled:opacity-60"
                >
                  {matSaving ? 'Posting...' : 'Post link'}
                </button>
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Posted for {materialsSec.subjectCode}</p>
            {matLoading || matList === null ? (
              <p className="text-xs text-slate-500">Loading materials…</p>
            ) : matList.length === 0 ? (
              <p className="text-xs text-slate-500">Nothing posted yet.</p>
            ) : (
              <div className="max-h-[30vh] overflow-y-auto space-y-2 pr-1">
                {matList.map((m) => (
                  <div key={m._id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border flex-shrink-0 ${m.kind === 'file' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                      {m.kind === 'file' ? 'File' : 'Link'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{m.title}</p>
                      <p className="text-[11px] text-slate-500">{new Date(m.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{m.format ? ` • ${String(m.format).toUpperCase()}` : ''}</p>
                    </div>
                    <a href={m.url} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-medium hover:bg-slate-100 flex-shrink-0">Open</a>
                    <button
                      type="button"
                      onClick={() => deleteMaterial(m._id)}
                      disabled={deletingId === m._id}
                      className="px-2.5 py-1.5 rounded-lg border border-red-200 bg-white text-[11px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 flex-shrink-0"
                    >
                      {deletingId === m._id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {attendanceSec && (
        <AttendanceModal
          sectionKey={attendanceSec.key}
          code={attendanceSec.subjectCode}
          title={attendanceSec.subjectTitle}
          students={attendanceSec.students}
          facultyUsername={student.username}
          branch={faculty.branch}
          onClose={() => setAttendanceKey(null)}
          onSaved={() => setAttendanceKey(null)}
        />
      )}
    </PortalShell>
  )
}
