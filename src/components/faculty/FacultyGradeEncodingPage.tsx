'use client'
import { useState, useMemo, useEffect } from 'react'
import { ChevronRight, Search, Filter, Save, Loader2, Calculator, ArrowDown, Info } from 'lucide-react'
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

export function FacultyGradeEncodingPage({ student, onNavigate, onLogout, events, professors, tasks, facultyData, facultyLoading }: Props) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [period, setPeriod] = useState<'all'|'prelim'|'midterm'|'finals'>('all')
  const [activeSection, setActiveSection] = useState('all')
  const [search, setSearch] = useState('')
  const [showOnlyDirty, setShowOnlyDirty] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const faculty = facultyData?.faculty ?? null
  const subjects: any[] = facultyData?.subjects ?? []
  const allStudents: FacultyStudent[] = facultyData?.students ?? []
  const loading = facultyLoading ?? true

  // Build sections like StudentsPage — group by code|ay|sem
  const sections = useMemo(()=>{
    const map=new Map<string,{key:string,code:string,title:string,room:string,schedule:string}>()
    for(const s of subjects){
      const key=`${s.code}|${s.academicYear||''}|${s.semester||''}`
      if(!map.has(key)) map.set(key,{key,code:s.code,title:s.title,room:s.room||'TBA',schedule:s.schedule||'TBA'})
    }
    return Array.from(map.values())
  },[subjects])

  const gradeRows = useMemo(()=>{
    if(subjects.length===0) return []
    return subjects.map((s:any)=>{
      const stu=allStudents.find(st=>st.username===s.studentUsername)
      return {
        _key: `${s.studentUsername}-${s.code}`,
        studentUsername: s.studentUsername,
        studentName: stu?.fullName ?? s.studentUsername,
        studentNumber: stu?.studentNumber ?? '',
        section: stu?.section ?? '',
        secKey: s.code,
        subjectCode: s.code,
        subjectTitle: s.title,
        prelim: s.prelim || '',
        midterm: s.midterm || '',
        finals: s.finals || '',
        finalGrade: s.finalGrade || '',
        remarks: s.remarks || '',
        status: s.gradeStatus || s.status || 'draft',
        gradeStatus: s.gradeStatus || 'draft',
        locked: s.locked || false,
        dirty: false,
        original: { prelim: s.prelim||'', midterm: s.midterm||'', finals: s.finals||'', finalGrade: s.finalGrade||'' }
      }
    })
  },[subjects, allStudents])

  const [rows, setRows]=useState<any[]>([])
  useEffect(()=>{ if(!loading && gradeRows.length) setRows(gradeRows) },[gradeRows,loading])

  const computedFinal=(pre:string,mid:string,fin:string)=>{
    const up=(v:string)=>v?v.toString().toUpperCase():''
    if(up(pre)==='INC'||up(mid)==='INC'||up(fin)==='INC') return 'INC'
    const has=(v:string)=>v!==''&&!isNaN(parseFloat(v))
    if(!has(pre)||!has(mid)||!has(fin)) return ''
    return (parseFloat(pre)*0.3+parseFloat(mid)*0.3+parseFloat(fin)*0.4).toFixed(2)
  }
  const remarksFor=(final:string)=>{
    if(!final) return ''
    if(final.toUpperCase()==='INC') return 'INC'
    const v=parseFloat(final); if(isNaN(v)) return '—'
    if(v>=90) return 'Excellent'; if(v>=85) return 'Very Good'; if(v>=80) return 'Good'; if(v>=75) return 'Passed'; if(v>=70) return 'Conditional'; return 'Failed'
  }
  const badgeForRemarks=(r:string)=>{
    if(!r) return '<span class="text-slate-400">—</span>'
    const m:any={Excellent:'bg-violet-50 text-violet-700 border-violet-200', 'Very Good':'bg-blue-50 text-blue-700 border-blue-200', Good:'bg-cyan-50 text-cyan-700 border-cyan-200', Passed:'bg-emerald-50 text-emerald-700 border-emerald-200', Conditional:'bg-amber-50 text-amber-700 border-amber-200', Failed:'bg-red-50 text-red-700 border-red-200', INC:'bg-amber-50 text-amber-700 border-amber-200'}
    return `<span class="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${m[r]||'bg-slate-100 text-slate-600 border-slate-200'}">${r}</span>`
  }

  const filtered = useMemo(()=>{
    let r=[...rows]
    if(activeSection!=='all') r=r.filter(x=>x.subjectCode===activeSection)
    if(search){ const q=search.toLowerCase(); r=r.filter(x=>x.studentName.toLowerCase().includes(q)||x.studentNumber.toLowerCase().includes(q)||x.subjectCode.toLowerCase().includes(q)) }
    if(statusFilter!=='all') r=r.filter(x=>x.gradeStatus===statusFilter)
    if(showOnlyDirty) r=r.filter(x=>x.dirty)
    return r
  },[rows,activeSection,search,statusFilter,showOnlyDirty])

  const onGradeInput=(key:string,field:string,val:string)=>{
    const up=val.toUpperCase()
    if(up==='INC') val='INC'
    else if(val!=='' && (isNaN(Number(val))||Number(val)<0||Number(val)>100)) return
    setRows(prev=>prev.map(r=> r._key===key ? {...r,[field]:val,dirty: !(r.prelim===r.original.prelim && r.midterm===r.original.midterm && r.finals===r.original.finals && (r.finalGrade||'')===(r.original.finalGrade||'')), gradeStatus:'draft'} : r))
  }

  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submitPeriod, setSubmitPeriod] = useState<'prelim'|'midterm'|'finals'|'all'>('prelim')
  const [submitNote, setSubmitNote] = useState('')
  const submitScope = (() => {
    const visible = activeSection==='all' ? filtered : filtered.filter(r=>r.subjectCode===activeSection)
    // not used directly, computed in modal
    return visible
  })()

  if(loading) return <DashboardSkeleton />
  if(!faculty) return <div className="min-h-dvh grid place-items-center"><p className="text-sm text-red-600">Faculty data not found.</p></div>

  const showPrelim = period==='all'||period==='prelim'
  const showMidterm = period==='all'||period==='midterm'
  const showFinals = period==='all'||period==='finals'
  const showFinal = period==='all'||period==='finals'

  const openSubmit = (p: 'prelim'|'midterm'|'finals'|'all') => {
    setSubmitPeriod(p)
    setShowSubmitModal(true)
  }

  return (
    <div className="min-h-dvh bg-slate-50 font-sans">
      <FacultySidebar active="grade-encoding" onNavigate={onNavigate} mobileOpen={mobileNavOpen} onMobileClose={()=>setMobileNavOpen(false)} />
      <div className="lg:pl-64">
        <Topbar student={student} onOpenMobileNav={()=>setMobileNavOpen(true)} onProfile={()=>onNavigate('profile')} onNavigate={onNavigate} onLogout={onLogout} events={events} professors={professors} tasks={tasks} />
        <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <button onClick={()=>onNavigate('dashboard')} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 mb-3"><ChevronRight className="w-4 h-4 rotate-180"/> Back to Dashboard</button>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Grade Encoding</h1>
              <p className="text-sm text-slate-500 mt-1">1st Sem • AY 2026-2027 - Prelim / Midterm / Finals → final auto-computed</p>
            </div>
            <div className="hidden sm:flex items-center gap-1 p-1 rounded-full bg-slate-50 border border-slate-200 shadow-sm self-center">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-xs font-medium"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"/> Draft</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium"><span className="w-1.5 h-1.5 rounded-full bg-blue-600"/> Submitted</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/> Released</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 text-xs font-medium">Incomplete</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Section</span>
            <div className="flex flex-wrap gap-2">
              <button onClick={()=>setActiveSection('all')} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${activeSection==='all'?'bg-[#153357] text-white border-[#153357]':'bg-white text-slate-700 border-slate-200'}`}>All sections ({filtered.length})</button>
              {Array.from(new Set(subjects.map((s:any)=>s.code))).map(code=>(
                <button key={code} onClick={()=>setActiveSection(code)} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${activeSection===code?'bg-[#287CBB] text-white border-[#287CBB]':'bg-white text-slate-700 border-slate-200'}`}>{code}</button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex gap-2">
                {(['all','prelim','midterm','finals'] as const).map(p=>(
                  <button key={p} onClick={()=>setPeriod(p)} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${period===p?'bg-[#153357] text-white border-[#153357]':'bg-white text-slate-700 border-slate-200'}`}>{p==='all'?'All periods': p==='prelim'?'Prelim only': p==='midterm'?'Midterm only':'Finals only'}</button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-amber-700 bg-[#fffbeb] border border-amber-100 rounded-full px-2.5 py-1"><Info className="w-3.5 h-3.5"/> Final • auto-computed • editable</span>
                <button onClick={()=>toast.info('Auto-compute: Final = Prelim*0.3+Mid*0.3+Finals*0.4')} className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-700 hover:bg-blue-100 inline-flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5"/> Auto-compute</button>
                <button onClick={()=>toast.info('Fill down — enter value for current period')} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium hover:bg-slate-50 inline-flex items-center gap-1.5"><ArrowDown className="w-3.5 h-3.5"/> Fill down…</button>
              </div>
            </div>
            {period!=='all' && (
              <div className="px-4 py-3 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-600"><span className="font-semibold text-slate-900">{period==='prelim'?'Prelim only':period==='midterm'?'Midterm only':'Finals only'} — {activeSection==='all'?`All sections (${filtered.length})`:`${activeSection} • ${filtered.length} students`} • per-period save/lock</span></p>
                <div className="flex items-center gap-2">
                  <button onClick={()=>{ const c=filtered.filter(r=>r.dirty).length; if(c===0) toast.info('No changes to save.'); else { setRows(prev=>prev.map(r=> filtered.some(f=>f._key===r._key && r.dirty) ? {...r, dirty:false, original:{...r, [period]: r[period as any]}}:r)); toast.success(`Saved ${c} ${period} draft(s)`)} } } className="px-4 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold hover:bg-slate-50 inline-flex items-center gap-1.5"><Save className="w-3.5 h-3.5"/> Save {period==='prelim'?'Prelim only':period==='midterm'?'Midterm only':'Finals only'}</button>
                  <button onClick={()=>openSubmit(period)} className="px-4 py-1.5 rounded-lg bg-[#153357] text-white text-xs font-semibold hover:bg-[#0f2744] inline-flex items-center gap-1.5"><Save className="w-3.5 h-3.5"/> Submit {period==='prelim'?'Prelim only':period==='midterm'?'Midterm only':'Finals only'} — {activeSection==='all'?`All sections (${filtered.length})`:`${activeSection} • ${activeSection} (${filtered.length})`}</button>
                </div>
              </div>
            )}
            <div className="px-4 py-3 flex flex-wrap gap-3 items-center border-b border-slate-100">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search student…" className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-white shadow-sm text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
              <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="h-9 px-3 pr-8 rounded-xl border border-slate-200 bg-white text-sm shadow-sm">
                <option value="all">All statuses</option><option value="draft">Draft</option><option value="submitted">Submitted</option><option value="released">Released</option>
              </select>
              <span className="text-xs text-slate-500">{filtered.length} records</span>
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
                    {period==='finals' && <th className="px-2 py-2.5 text-center w-28">Remarks</th>}
                    {period!=='all' && <th className="px-3 py-2.5 text-center w-24">Status</th>}
                    {period!=='all' && <th className="px-3 py-2.5 text-left w-40">Audit</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(row=>{
                    const fg = (row.finalGrade && row.finalGrade!=='') ? row.finalGrade : computedFinal(row.prelim,row.midterm,row.finals)
                    const rm = remarksFor(fg)
                    return (
                      <tr key={row._key} className={`border-b border-slate-100 last:border-b-0 ${row.dirty?'bg-amber-50/60':''}`}>
                        <td className="px-3 py-2.5"><p className="text-sm font-medium">{row.studentName}</p><p className="text-[11px] text-slate-500 font-mono">{row.studentNumber} • {row.section}</p></td>
                        {showPrelim && <td className="px-2 py-2.5 text-center"><input value={row.prelim} onChange={e=>onGradeInput(row._key,'prelim',e.target.value)} className="w-[72px] h-8 px-2 text-center mono text-sm rounded-lg border border-slate-200" /></td>}
                        {showMidterm && <td className="px-2 py-2.5 text-center"><input value={row.midterm} onChange={e=>onGradeInput(row._key,'midterm',e.target.value)} className="w-[72px] h-8 px-2 text-center mono text-sm rounded-lg border border-slate-200" /></td>}
                        {showFinals && <td className="px-2 py-2.5 text-center"><input value={row.finals} onChange={e=>onGradeInput(row._key,'finals',e.target.value)} className="w-[72px] h-8 px-2 text-center mono text-sm rounded-lg border border-slate-200" /></td>}
                        {showFinal && <td className="px-2 py-2.5 text-center"><input value={fg} readOnly className="w-[72px] h-8 px-2 text-center mono text-sm font-bold rounded-lg border bg-blue-50/30 border-blue-200" /></td>}
                        {period==='finals' && <td className="px-2 py-2.5 text-center" dangerouslySetInnerHTML={{__html: badgeForRemarks(rm)}} />}
                        {period!=='all' && <td className="px-3 py-2.5 text-center"><span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px]">Draft</span></td>}
                        {period!=='all' && <td className="px-3 py-2.5 text-left text-[11px] text-slate-500">m.reyes • draft</td>}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Submit modal — scope-aware, blank → INC, draft→submitted */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={()=>setShowSubmitModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold">Submit grades?</h3>
              <p className="text-xs text-slate-500 mt-1">This submits the selected period (draft → submitted). Students will see grades after admin <b>Releases</b>.</p>
              <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs font-semibold" id="submitScopeText">{activeSection==='all'?`All sections (${filtered.length})`: `${activeSection} • ${filtered.length} students`} — {submitPeriod==='all'?'All periods': submitPeriod==='prelim'?'Prelim only': submitPeriod==='midterm'?'Midterm only':'Finals only'}</p>
                <p className="text-xs text-slate-500 mt-1" id="submitScopeDetail">
                  {(() => {
                    const vis = activeSection==='all'? filtered : filtered.filter(r=>r.subjectCode===activeSection)
                    const need = submitPeriod==='prelim' ? vis.filter(r=>!r.prelim).length : submitPeriod==='midterm' ? vis.filter(r=>!r.midterm).length : submitPeriod==='finals' ? vis.filter(r=>!r.finals && !r.finalGrade).length : 0
                    const drafts = vis.filter(r=>r.gradeStatus==='draft' && !r.locked && (submitPeriod==='prelim'?r.prelim: submitPeriod==='midterm'?r.midterm: r.finals||r.finalGrade)).length
                    if(need>0) return `${need} blank(s) will be set to INC on submit — ${drafts} graded + ${need} INC total.`
                    return `This will submit ${drafts} draft grades in this scope.`
                  })()}
                </p>
              </div>
              {(() => {
                const vis = activeSection==='all'? filtered : filtered.filter(r=>r.subjectCode===activeSection)
                const need = submitPeriod==='prelim' ? vis.filter(r=>!r.prelim).length : submitPeriod==='midterm' ? vis.filter(r=>!r.midterm).length : submitPeriod==='finals' ? vis.filter(r=>!r.finals && !r.finalGrade).length : 0
                if(need===0) return null
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
              <select value={submitPeriod} onChange={e=>setSubmitPeriod(e.target.value as any)} className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white">
                <option value="prelim">Prelim only</option>
                <option value="midterm">Midterm only</option>
                <option value="finals">Finals only</option>
                <option value="all">All periods (Final Grade)</option>
              </select>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Note (audit log)</label>
              <textarea value={submitNote} onChange={e=>setSubmitNote(e.target.value)} rows={2} placeholder="e.g., Validated against class record…" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500" />
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={()=>setShowSubmitModal(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium">Cancel</button>
              <button onClick={()=>{
                const vis = activeSection==='all'? filtered : filtered.filter(r=>r.subjectCode===activeSection)
                let toSubmit: any[] = []
                if(submitPeriod==='all'){
                  vis.forEach(r=>{ if(r.gradeStatus==='draft' && !r.locked){ ['prelim','midterm','finals'].forEach((f:any)=>{ if(!r[f]){ r[f]='INC'; if(f==='finals') r.finalGrade='INC' }}) } })
                  toSubmit = vis.filter(r=>r.gradeStatus==='draft' && !r.locked)
                } else {
                  const f = submitPeriod as any
                  vis.forEach(r=>{ if(!r[f] && r.gradeStatus==='draft' && !r.locked){ r[f]='INC'; if(f==='finals') r.finalGrade='INC'; r.dirty=true } })
                  toSubmit = vis.filter(r=>r.gradeStatus==='draft' && !r.locked && r[f]!=='')
                }
                if(toSubmit.length===0){ toast.info('No draft grades to submit for '+submitPeriod); return }
                toSubmit.forEach(r=>{ r.locked=true; r.gradeStatus='submitted'; r.dirty=false; r.original={...r} })
                setRows([...rows])
                setShowSubmitModal(false)
                toast.success(`Submitted ${toSubmit.length} records (${submitPeriod}) — draft → submitted`)
              }} className="px-4 py-2 rounded-lg bg-[#153357] text-white text-sm font-semibold inline-flex items-center gap-2">Submit <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">{filtered.filter(r=>r.gradeStatus==='draft').length}</span></button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
