'use client'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { ChevronRight, Search, Save, Calculator, ArrowDown, Info, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Student, View } from '@/lib/aics/types'
import type { Course, Session } from '@/lib/schedule'
import type { PortalEvent } from '@/lib/aics/events'
import type { Professor } from '@/lib/aics/professors'
import type { Task } from '@/lib/aics/tasks'
import type { Announcement } from '@/lib/aics/announcements'
import type { FacultyMember, FacultyStudent } from '@/lib/aics/faculty'
import { FacultySidebar } from './FacultySidebar'
import { Topbar } from '../portal/Topbar'
import { DashboardSkeleton } from '../portal/Skeleton'
import { useFacultyRows, computedFinalINCasZero, remarksFor } from '@/lib/aics/use-faculty-rows'

interface Props {
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

function badgeForRemarks(r: string) {
  if (!r) return '<span class="text-slate-400">—</span>'
  const m: any = { Excellent: 'bg-violet-50 text-violet-700 border-violet-200', 'Very Good': 'bg-blue-50 text-blue-700 border-blue-200', Good: 'bg-cyan-50 text-cyan-700 border-cyan-200', Passed: 'bg-emerald-50 text-emerald-700 border-emerald-200', Conditional: 'bg-amber-50 text-amber-700 border-amber-200', Failed: 'bg-red-50 text-red-700 border-red-200', INC: 'bg-amber-50 text-amber-700 border-amber-200' }
  return `<span class="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${m[r] || 'bg-slate-100 text-slate-600 border-slate-200'}">${r}</span>`
}

export function FacultyGradeEncodingPage({ student, onNavigate, onLogout, events, professors, tasks, facultyData, facultyLoading }: Props) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [period, setPeriod] = useState<'all' | 'prelim' | 'midterm' | 'finals'>('all')
  const [activeSection, setActiveSection] = useState('all')
  const [search, setSearch] = useState('')
  const [showOnlyDirty, setShowOnlyDirty] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const faculty = facultyData?.faculty ?? null
  const loading = facultyLoading ?? true
  const branch = faculty?.branch || student.branch || 'commonwealth'

  const { sections, gradeRows: initialRows } = useFacultyRows(facultyData as any)

  const [rows, setRows] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  useEffect(() => { if (!loading && initialRows.length) setRows(initialRows) }, [initialRows, loading])

  const getPeriodStatus = useCallback((r: any, p: string) => {
    if (p === 'prelim') return r.prelimStatus ?? ''
    if (p === 'midterm') return r.midtermStatus ?? ''
    if (p === 'finals') return r.finalsStatus ?? ''
    return r.gradeStatus ?? ''
  }, [])

  const filtered = useMemo(() => {
    let r = [...rows]
    if (activeSection !== 'all') r = r.filter((x) => x.subjectCode === activeSection)
    if (search) {
      const q = search.toLowerCase()
      r = r.filter((x) => x.studentName.toLowerCase().includes(q) || x.studentNumber.toLowerCase().includes(q) || x.subjectCode.toLowerCase().includes(q))
    }
    if (statusFilter !== 'all') {
      r = r.filter((x) => {
        const st = period === 'all' ? (x.gradeStatus || '') : getPeriodStatus(x, period) || ''
        if (statusFilter === '') return !st
        return st === statusFilter
      })
    }
    if (showOnlyDirty) r = r.filter((x) => x.dirty)
    return r
  }, [rows, activeSection, search, statusFilter, showOnlyDirty, period, getPeriodStatus])

  const onGradeInput = useCallback((key: string, field: string, val: string) => {
    const up = val.toUpperCase()
    if (up === 'INC') val = 'INC'
    else if (val !== '' && (isNaN(Number(val)) || Number(val) < 0 || Number(val) > 100)) return
    setRows((prev) =>
      prev.map((r) => {
        if (r._key !== key) return r
        const statusForPeriod = field === 'prelim' ? r.prelimStatus : field === 'midterm' ? r.midtermStatus : field === 'finals' ? r.finalsStatus : r.gradeStatus
        const isLocked = statusForPeriod === 'submitted' || statusForPeriod === 'released'
        if (isLocked) return r
        const next = { ...r, [field]: val }
        const isDirty = !(next.prelim === r.original.prelim && next.midterm === r.original.midterm && next.finals === r.original.finals && (next.finalGrade || '') === (r.original.finalGrade || ''))
        // per-period draft
        if (field === 'prelim') next.prelimStatus = 'draft'
        if (field === 'midterm') next.midtermStatus = 'draft'
        if (field === 'finals') next.finalsStatus = 'draft'
        next.gradeStatus = 'draft'
        return { ...next, dirty: isDirty }
      })
    )
  }, [])

  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submitPeriod, setSubmitPeriod] = useState<'prelim' | 'midterm' | 'finals' | 'all'>('prelim')
  const [submitNote, setSubmitNote] = useState('')
  const [showFillModal, setShowFillModal] = useState(false)
  const [fillValue, setFillValue] = useState('')
  const isFillDisabled = period === 'all' || activeSection === 'all'
  const openFill = () => {
    if (isFillDisabled) {
      toast.info('Fill down only works for a specific section and period (Prelim/Midterm/Finals). Select a section and period first.')
      return
    }
    setFillValue('')
    setShowFillModal(true)
  }

  const handleSavePeriod = useCallback(async () => {
    if (period === 'all') {
      toast.info('Select a specific period (Prelim/Midterm/Finals) to save. All is read-only.')
      return
    }
    const field = period as 'prelim' | 'midterm' | 'finals'
    const statusKey = field === 'prelim' ? 'prelimStatus' : field === 'midterm' ? 'midtermStatus' : 'finalsStatus'
    const targets = filtered.filter((r) => r.dirty && (r as any)[field] !== (r.original as any)[field] && (r as any)[statusKey] !== 'submitted' && (r as any)[statusKey] !== 'released')
    if (targets.length === 0) {
      toast.info(`No ${period} changes to save for ${activeSection === 'all' ? `All sections (${filtered.length})` : `${activeSection} (${filtered.length})`}.`)
      return
    }
    setSaving(true)
    try {
      const updates = targets.map((r: any) => {
        const fg = computedFinalINCasZero(r.prelim, r.midterm, r.finals)
        const payload: any = { studentUsername: r.studentUsername, subjectCode: r.subjectCode, branch, academicYear: r.academicYear, semester: r.semester, [field]: (r as any)[field], performedBy: faculty?.username || student.username }
        if (fg) {
          payload.finalGrade = fg
          payload.remarks = remarksFor(fg) || r.remarks
        } else if (field === 'finals' && !(r as any)[field]) {
          payload.finalGrade = ''
        }
        return payload
      })
      const res = await fetch('/api/grades/update', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates, performedBy: faculty?.username || student.username }) })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to save')
      setRows((prev) =>
        prev.map((r) => {
          const isTarget = targets.some((t: any) => t._key === r._key)
          if (!isTarget) return r
          const fg = computedFinalINCasZero(r.prelim, r.midterm, r.finals)
          return { ...r, dirty: false, original: { prelim: r.prelim, midterm: r.midterm, finals: r.finals, finalGrade: fg || r.finalGrade }, [statusKey]: 'draft', gradeStatus: 'draft' }
        })
      )
      toast.success(`Saved ${targets.length} ${period} draft(s) — ${activeSection === 'all' ? `All sections (${filtered.length})` : `${activeSection} (${filtered.length})`}`)
    } catch (e: any) {
      toast.error(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [period, filtered, activeSection, branch, faculty?.username, student.username])

  const handleSubmitConfirm = useCallback(async () => {
    const vis = activeSection === 'all' ? filtered : filtered.filter((r) => r.subjectCode === activeSection)
    if (vis.length === 0) { toast.info('No records in scope'); return }
    setSubmitting(true)
    try {
      const fieldMap: any = { prelim: 'prelim', midterm: 'midterm', finals: 'finals' }
      const statusMap: any = { prelim: 'prelimStatus', midterm: 'midtermStatus', finals: 'finalsStatus' }
      if (submitPeriod !== 'all') {
        const f = fieldMap[submitPeriod]
        const sKey = statusMap[submitPeriod]
        const patchedRows = rows.map((r) => {
          const inScope = vis.some((v: any) => v._key === r._key)
          if (!inScope) return r
          const st = (r as any)[sKey] ?? ''
          if (st && st !== 'draft') return r
          if (r.locked) return r
          if (!(r as any)[f] || (r as any)[f] === '') {
            return { ...r, [f]: 'INC', finalGrade: f === 'finals' ? 'INC' : r.finalGrade, remarks: f === 'finals' ? 'INC' : r.remarks, dirty: true, [sKey]: 'draft', gradeStatus: 'draft' }
          }
          return r
        })
        const dirtyForPatch = patchedRows.filter((r: any) => vis.some((v: any) => v._key === r._key) && r.dirty && (!(r as any)[sKey] || (r as any)[sKey] === 'draft') && !r.locked)
        if (dirtyForPatch.length > 0) {
          const updates = dirtyForPatch.map((r: any) => {
            const fg = r.finalGrade || computedFinalINCasZero(r.prelim, r.midterm, r.finals)
            return { studentUsername: r.studentUsername, subjectCode: r.subjectCode, branch, academicYear: r.academicYear, semester: r.semester, prelim: r.prelim, midterm: r.midterm, finals: r.finals, finalGrade: fg, remarks: remarksFor(fg) || r.remarks, performedBy: faculty?.username || student.username }
          })
          const res = await fetch('/api/grades/update', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates, performedBy: faculty?.username || student.username }) })
          const data = await res.json()
          if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to save INC fills')
        }
        setRows(patchedRows)
        const distinct = new Map<string, { subjectCode: string; academicYear: string; semester: string }>()
        vis.forEach((r: any) => {
          const st = (r as any)[sKey] ?? ''
          if ((!st || st === 'draft') && !r.locked) {
            const k = `${r.subjectCode}|${r.academicYear}|${r.semester}`
            if (!distinct.has(k)) distinct.set(k, { subjectCode: r.subjectCode, academicYear: r.academicYear, semester: r.semester })
          }
        })
        let totalSubmitted = 0
        for (const { subjectCode, academicYear, semester } of distinct.values()) {
          const res = await fetch('/api/grades/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ branch, subjectCode, academicYear, semester, period: submitPeriod, performedBy: faculty?.username || student.username, note: submitNote }) })
          const data = await res.json()
          if (!res.ok || !data.ok) throw new Error(data.error || `Submit failed for ${subjectCode}`)
          totalSubmitted += data.modifiedCount || 0
        }
        setRows((prev) =>
          prev.map((r: any) => {
            const inScope = vis.some((v: any) => v._key === r._key)
            if (!inScope) return r
            const st = (r as any)[sKey] ?? ''
            if (st && st !== 'draft') return r
            if (r.locked) return r
            const hasVal = (r as any)[f]
            if (!hasVal) return r
            return { ...r, [sKey]: 'submitted', gradeStatus: 'submitted', locked: true, dirty: false, original: { prelim: r.prelim, midterm: r.midterm, finals: r.finals, finalGrade: r.finalGrade } }
          })
        )
        toast.success(`Submitted ${totalSubmitted || vis.filter((r: any) => !(r as any)[sKey] || (r as any)[sKey] === 'draft').length} records (${submitPeriod}) — draft → submitted`)
        setShowSubmitModal(false)
      } else {
        const patchedRows = rows.map((r: any) => {
          const inScope = vis.some((v: any) => v._key === r._key)
          if (!inScope || r.locked) return r
          const hasDraft = !r.prelimStatus || r.prelimStatus === 'draft' || !r.midtermStatus || r.midtermStatus === 'draft' || !r.finalsStatus || r.finalsStatus === 'draft'
          if (!hasDraft && r.gradeStatus && r.gradeStatus !== 'draft') return r
          let nr: any = { ...r }
          let changed = false
            ;(['prelim', 'midterm', 'finals'] as const).forEach((f) => { if (!(nr as any)[f]) { (nr as any)[f] = 'INC'; changed = true } })
          if (changed) { nr.finalGrade = computedFinalINCasZero(nr.prelim, nr.midterm, nr.finals) || 'INC'; nr.remarks = remarksFor(nr.finalGrade) || 'INC'; nr.dirty = true; nr.prelimStatus = nr.prelimStatus || 'draft'; nr.midtermStatus = nr.midtermStatus || 'draft'; nr.finalsStatus = nr.finalsStatus || 'draft' }
          return nr
        })
        const dirtyForPatch = patchedRows.filter((r: any) => vis.some((v: any) => v._key === r._key) && r.dirty)
        if (dirtyForPatch.length > 0) {
          const updates = dirtyForPatch.map((r: any) => ({ studentUsername: r.studentUsername, subjectCode: r.subjectCode, branch, academicYear: r.academicYear, semester: r.semester, prelim: r.prelim, midterm: r.midterm, finals: r.finals, finalGrade: r.finalGrade, remarks: r.remarks, performedBy: faculty?.username || student.username }))
          const res = await fetch('/api/grades/update', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates, performedBy: faculty?.username || student.username }) })
          const data = await res.json()
          if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to save')
        }
        setRows(patchedRows)
        const distinct = new Map<string, { subjectCode: string; academicYear: string; semester: string }>()
        vis.forEach((r: any) => { if (!r.locked) { const k = `${r.subjectCode}|${r.academicYear}|${r.semester}`; if (!distinct.has(k)) distinct.set(k, { subjectCode: r.subjectCode, academicYear: r.academicYear, semester: r.semester }) } })
        let totalSubmitted = 0
        for (const { subjectCode, academicYear, semester } of distinct.values()) {
          const res = await fetch('/api/grades/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ branch, subjectCode, academicYear, semester, period: 'all', performedBy: faculty?.username || student.username, note: submitNote }) })
          const data = await res.json()
          if (!res.ok || !data.ok) throw new Error(data.error || `Submit failed for ${subjectCode}`)
          totalSubmitted += data.modifiedCount || 0
        }
        setRows((prev) => prev.map((r: any) => vis.some((v: any) => v._key === r._key) && !r.locked ? { ...r, prelimStatus: 'submitted', midtermStatus: 'submitted', finalsStatus: 'submitted', gradeStatus: 'submitted', locked: true, dirty: false, original: { prelim: r.prelim, midterm: r.midterm, finals: r.finals, finalGrade: r.finalGrade } } : r))
        toast.success(`Submitted ${totalSubmitted || vis.length} records (all periods)`)
        setShowSubmitModal(false)
      }
    } catch (e: any) {
      toast.error(e.message || 'Submit failed')
    } finally {
      setSubmitting(false)
    }
  }, [rows, filtered, activeSection, branch, submitPeriod, faculty?.username, student.username, submitNote])

  if (loading) return <DashboardSkeleton />
  if (!faculty) return <div className="min-h-dvh grid place-items-center"><p className="text-sm text-red-600">Faculty data not found.</p></div>

  const showPrelim = period === 'all' || period === 'prelim'
  const showMidterm = period === 'all' || period === 'midterm'
  const showFinals = period === 'all' || period === 'finals'
  const showFinal = period === 'all' || period === 'finals'

  const openSubmit = (p: 'prelim' | 'midterm' | 'finals' | 'all') => { setSubmitPeriod(p); setShowSubmitModal(true) }

  return (
    <div className="min-h-dvh bg-slate-50 font-sans">
      <FacultySidebar active="grade-encoding" onNavigate={onNavigate} mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
      <div className="lg:pl-64">
        <Topbar student={student} onOpenMobileNav={() => setMobileNavOpen(true)} onProfile={() => onNavigate('profile')} onNavigate={onNavigate} onLogout={onLogout} events={events} professors={professors} tasks={tasks} />
        <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <button onClick={() => onNavigate('dashboard')} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 mb-3"><ChevronRight className="w-4 h-4 rotate-180" /> Back to Dashboard</button>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Grade Encoding</h1>
              <p className="text-sm text-slate-500 mt-1">{faculty.semester} • AY {faculty.academicYear} — Prelim / Midterm / Finals → final auto-computed (INC = 0)</p>
            </div>
            <div className="hidden sm:flex items-center gap-1 p-1 rounded-full bg-slate-50 border border-slate-200 shadow-sm self-center">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium">No status</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-xs font-medium"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Draft</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium"><span className="w-1.5 h-1.5 rounded-full bg-blue-600" /> Submitted</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Released</span>
            </div>
          </div>

            <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Section</span>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setActiveSection('all')} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${activeSection === 'all' ? 'bg-[#153357] text-white border-[#153357]' : 'bg-white text-slate-700 border-slate-200'}`}>All sections ({sections.length} • {rows.length} rows)</button>
              {sections.map((s) => (<button key={s.key} onClick={() => setActiveSection(s.subjectCode)} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${activeSection === s.subjectCode ? 'bg-[#287CBB] text-white border-[#287CBB]' : 'bg-white text-slate-700 border-slate-200'}`}>{s.subjectCode} — {s.room}</button>))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex gap-2">
                {(['all', 'prelim', 'midterm', 'finals'] as const).map((p) => (<button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${period === p ? 'bg-[#153357] text-white border-[#153357]' : 'bg-white text-slate-700 border-slate-200'}`}>{p === 'all' ? 'All periods' : p === 'prelim' ? 'Prelim only' : p === 'midterm' ? 'Midterm only' : 'Finals only'}</button>))}
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-amber-700 bg-[#fffbeb] border border-amber-100 rounded-full px-2.5 py-1"><Info className="w-3.5 h-3.5" /> Final • auto-computed (INC = 0)</span>
                <button onClick={() => toast.info('Auto-compute: Final = Prelim*0.3+Mid*0.3+Finals*0.4, INC counts as 0')} className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-700 hover:bg-blue-100 inline-flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5" /> Auto-compute</button>
                <button onClick={openFill} disabled={isFillDisabled} title={isFillDisabled ? 'Select a specific section and period to use Fill down' : 'Fill down for ' + period + ' in ' + activeSection} className={`px-3 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 ${isFillDisabled ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60' : 'bg-white border-slate-200 hover:bg-slate-50'}`}><ArrowDown className="w-3.5 h-3.5" /> Fill down…</button>
              </div>
            </div>
            {period !== 'all' && (
              <div className="px-4 py-3 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-600"><span className="font-semibold text-slate-900">{period === 'prelim' ? 'Prelim only' : period === 'midterm' ? 'Midterm only' : 'Finals only'} — {activeSection === 'all' ? `All sections (${filtered.length})` : `${activeSection} • ${filtered.length} students`} • per-period save</span></p>
                <div className="flex items-center gap-2">
                  <button onClick={handleSavePeriod} disabled={saving} className="px-4 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold hover:bg-slate-50 inline-flex items-center gap-1.5 disabled:opacity-60"><Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : `Save ${period === 'prelim' ? 'Prelim only' : period === 'midterm' ? 'Midterm only' : 'Finals only'}`}</button>
                  <button onClick={() => openSubmit(period)} disabled={submitting} className="px-4 py-1.5 rounded-lg bg-[#153357] text-white text-xs font-semibold hover:bg-[#0f2744] inline-flex items-center gap-1.5 disabled:opacity-60"><Save className="w-3.5 h-3.5" /> Submit {period === 'prelim' ? 'Prelim only' : period === 'midterm' ? 'Midterm only' : 'Finals only'}</button>
                </div>
              </div>
            )}
            <div className="px-4 py-3 flex flex-wrap gap-3 items-center border-b border-slate-100">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student…" className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-white shadow-sm text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 px-3 pr-8 rounded-xl border border-slate-200 bg-white text-sm shadow-sm">
                <option value="all">All statuses</option><option value="">No status</option><option value="draft">Draft</option><option value="submitted">Submitted</option><option value="released">Released</option>
              </select>
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-600"><input type="checkbox" checked={showOnlyDirty} onChange={(e) => setShowOnlyDirty(e.target.checked)} className="rounded" /> Dirty only</label>
              <span className="text-xs text-slate-500">{filtered.length} / {rows.length} records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-2.5 text-left w-56">Student</th>
                    {showPrelim && <th className="px-2 py-2.5 text-center w-[88px]">Prelim</th>}
                    {showMidterm && <th className="px-2 py-2.5 text-center w-[88px]">Midterm</th>}
                    {showFinals && <th className="px-2 py-2.5 text-center w-[88px]">Finals</th>}
                    {showFinal && <th className="px-2 py-2.5 text-center w-[88px] bg-blue-50/50">Final</th>}
                    {period === 'finals' && <th className="px-2 py-2.5 text-center w-28">Remarks</th>}
                    {period !== 'all' && <th className="px-3 py-2.5 text-center w-24">Status</th>}
                    {period !== 'all' && <th className="px-3 py-2.5 text-left w-40">Audit</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const fg = (row.finalGrade && row.finalGrade !== '') ? row.finalGrade : computedFinalINCasZero(row.prelim, row.midterm, row.finals)
                    const rm = remarksFor(fg)
                    const periodStatus = period === 'prelim' ? row.prelimStatus : period === 'midterm' ? row.midtermStatus : period === 'finals' ? row.finalsStatus : row.gradeStatus
                    const isLocked = periodStatus === 'submitted' || periodStatus === 'released'
                    const statusBadge = !periodStatus ? 'bg-slate-100 text-slate-500 border-slate-200' : periodStatus === 'submitted' ? 'bg-blue-50 text-blue-700 border-blue-200' : periodStatus === 'released' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                    return (
                      <tr key={row._key} className={`border-b border-slate-100 last:border-b-0 ${row.dirty ? 'bg-amber-50/60' : ''} ${isLocked ? 'opacity-75' : ''}`}>
                        <td className="px-3 py-2.5"><p className="text-sm font-medium">{row.studentName}</p><p className="text-[11px] text-slate-500 font-mono">{row.studentNumber} • {row.section}</p><p className="text-[10px] text-slate-400">{row.academicYear} {row.semester}</p></td>
                        {showPrelim && <td className="px-2 py-2.5 text-center"><input disabled={period === 'all' || (row.prelimStatus === 'submitted' || row.prelimStatus === 'released')} value={period === 'all' && !row.prelim ? 'INC' : row.prelim} onChange={(e) => onGradeInput(row._key, 'prelim', e.target.value)} placeholder={period === 'all' ? 'INC' : '—'} className={`w-[72px] h-8 px-2 text-center mono text-sm rounded-lg border ${period === 'all' || row.prelimStatus === 'submitted' || row.prelimStatus === 'released' ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-white border-slate-200 focus:border-blue-500 focus:ring-1'}`} /></td>}
                        {showMidterm && <td className="px-2 py-2.5 text-center"><input disabled={period === 'all' || (row.midtermStatus === 'submitted' || row.midtermStatus === 'released')} value={period === 'all' && !row.midterm ? 'INC' : row.midterm} onChange={(e) => onGradeInput(row._key, 'midterm', e.target.value)} placeholder={period === 'all' ? 'INC' : '—'} className={`w-[72px] h-8 px-2 text-center mono text-sm rounded-lg border ${period === 'all' || row.midtermStatus === 'submitted' || row.midtermStatus === 'released' ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-white border-slate-200 focus:border-blue-500 focus:ring-1'}`} /></td>}
                        {showFinals && <td className="px-2 py-2.5 text-center"><input disabled={period === 'all' || (row.finalsStatus === 'submitted' || row.finalsStatus === 'released')} value={period === 'all' && !row.finals ? 'INC' : row.finals} onChange={(e) => onGradeInput(row._key, 'finals', e.target.value)} placeholder={period === 'all' ? 'INC' : '—'} className={`w-[72px] h-8 px-2 text-center mono text-sm rounded-lg border ${period === 'all' || row.finalsStatus === 'submitted' || row.finalsStatus === 'released' ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-white border-slate-200 focus:border-blue-500 focus:ring-1'}`} /></td>}
                        {showFinal && <td className="px-2 py-2.5 text-center"><input value={fg} readOnly className="w-[72px] h-8 px-2 text-center mono text-sm font-bold rounded-lg border bg-blue-50/30 border-blue-200" /></td>}
                        {period === 'finals' && <td className="px-2 py-2.5 text-center" dangerouslySetInnerHTML={{ __html: badgeForRemarks(rm) }} />}
                        {period !== 'all' && <td className="px-3 py-2.5 text-center"><span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusBadge}`}>{periodStatus || '—'}</span></td>}
                        {period !== 'all' && <td className="px-3 py-2.5 text-left text-[11px] text-slate-500">{faculty?.username || '—'} • {periodStatus || 'No status'} {row.dirty ? '• unsaved' : ''}</td>}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && <div className="py-10 text-center text-sm text-slate-500">No records for current filters</div>}
          </div>
        </main>
      </div>

      {showFillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setShowFillModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold">Fill down — <span className="text-[#287CBB]">{period === 'prelim' ? 'Prelim' : period === 'midterm' ? 'Midterm' : 'Finals'}</span></h3>
              <p className="text-xs text-slate-500 mt-1">Fill this value for all visible students in <span className="font-medium text-slate-700">{activeSection === 'all' ? `All sections (${filtered.length})` : `${activeSection} • ${filtered.length} students`}</span> • {period === 'prelim' ? 'Prelim' : period === 'midterm' ? 'Midterm' : 'Finals'} only. Then <b>Save</b> to persist.</p>
            </div>
            <div className="px-6 py-4 space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Value (0-100 or INC)</label>
              <input value={fillValue} onChange={(e) => setFillValue(e.target.value)} placeholder="e.g., 85 or INC" className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              <p className="text-xs text-slate-500">Per-period — only fills the current tab’s column for the filtered section. Dirty rows need Save.</p>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setShowFillModal(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium">Cancel</button>
              <button onClick={() => {
                const v = fillValue.trim(); const up = v.toUpperCase()
                let val = v; if (up === 'INC') val = 'INC'; else if (v === '' || isNaN(Number(v)) || Number(v) < 0 || Number(v) > 100) { toast.info('Enter 0-100 or INC'); return }
                const field = period as any
                const statusKey = field === 'prelim' ? 'prelimStatus' : field === 'midterm' ? 'midtermStatus' : 'finalsStatus'
                if (period === 'all') { toast.info('Select a specific period (Prelim/Midterm/Finals) to use Fill down'); return }
                if (activeSection === 'all') { toast.info('Select a specific section to use Fill down'); return }
                setRows((prev) => prev.map((r: any) => (r.subjectCode === activeSection && (r as any)[statusKey] !== 'submitted' && (r as any)[statusKey] !== 'released' ? { ...r, [field]: val, dirty: true, [statusKey]: 'draft', gradeStatus: 'draft' } : r)))
                setShowFillModal(false); setFillValue(''); toast.success(`Filled ${val} for ${activeSection} • ${field} — click Save to persist`)
              }} className="px-4 py-2 rounded-lg bg-[#153357] text-white text-sm font-semibold inline-flex items-center gap-2"><ArrowDown className="w-4 h-4" /> Fill</button>
            </div>
          </div>
        </div>
      )}

      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setShowSubmitModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold">Submit grades?</h3>
              <p className="text-xs text-slate-500 mt-1">This submits the selected period (draft → submitted). Students will see grades after admin <b>Releases</b>.</p>
              <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs font-semibold">{activeSection === 'all' ? `All sections (${filtered.length})` : `${activeSection} • ${filtered.length} students`} — {submitPeriod === 'all' ? 'All periods' : submitPeriod === 'prelim' ? 'Prelim only' : submitPeriod === 'midterm' ? 'Midterm only' : 'Finals only'}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {(() => {
                    const vis = activeSection === 'all' ? filtered : filtered.filter((r: any) => r.subjectCode === activeSection)
                    const need = submitPeriod === 'prelim' ? vis.filter((r: any) => !r.prelim).length : submitPeriod === 'midterm' ? vis.filter((r: any) => !r.midterm).length : submitPeriod === 'finals' ? vis.filter((r: any) => !r.finals && !r.finalGrade).length : 0
                    const drafts = vis.filter((r: any) => { const k = submitPeriod === 'prelim' ? 'prelimStatus' : submitPeriod === 'midterm' ? 'midtermStatus' : submitPeriod === 'finals' ? 'finalsStatus' : 'gradeStatus'; const st = (r as any)[k] ?? ''; return (!st || st === 'draft') && !r.locked && (submitPeriod === 'prelim' ? r.prelim : submitPeriod === 'midterm' ? r.midterm : r.finals || r.finalGrade) }).length
                    if (need > 0) return `${need} blank(s) will be set to INC on submit — ${drafts} graded + ${need} INC total.`
                    return `This will submit ${drafts} draft grades in this scope.`
                  })()}
                </p>
              </div>
              {(() => {
                const vis = activeSection === 'all' ? filtered : filtered.filter((r: any) => r.subjectCode === activeSection)
                const need = submitPeriod === 'prelim' ? vis.filter((r: any) => !r.prelim).length : submitPeriod === 'midterm' ? vis.filter((r: any) => !r.midterm).length : submitPeriod === 'finals' ? vis.filter((r: any) => !r.finals && !r.finalGrade).length : 0
                if (need === 0) return null
                return (
                  <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 flex gap-2">
                    <span className="text-amber-600">⚠</span>
                    <div className="text-xs">
                      <p className="font-semibold text-amber-800">Blanks will be set to INC on submit</p>
                      <p className="text-amber-700 mt-1">{need} student(s) still have blank {submitPeriod}. Fill with a grade (0-100) or INC, or they will become INC.</p>
                    </div>
                  </div>
                )
              })()}
            </div>
            <div className="px-6 py-4 space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Which period?</label>
              <select value={submitPeriod} onChange={(e) => setSubmitPeriod(e.target.value as any)} className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white">
                <option value="prelim">Prelim only</option><option value="midterm">Midterm only</option><option value="finals">Finals only</option><option value="all">All periods (Final Grade)</option>
              </select>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Note (audit log)</label>
              <textarea value={submitNote} onChange={(e) => setSubmitNote(e.target.value)} rows={2} placeholder="e.g., Validated against class record…" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500" />
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setShowSubmitModal(false)} disabled={submitting} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium disabled:opacity-60">Cancel</button>
              <button onClick={handleSubmitConfirm} disabled={submitting} className="px-4 py-2 rounded-lg bg-[#153357] text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {submitting ? 'Submitting…' : 'Submit'} <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">{filtered.filter((r: any) => { const k = period === 'all' ? 'gradeStatus' : period === 'prelim' ? 'prelimStatus' : period === 'midterm' ? 'midtermStatus' : 'finalsStatus'; const st = (r as any)[k] ?? ''; return !st || st === 'draft' }).length}</span></button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
