'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { FolderOpen, FileText, Link2, ExternalLink } from 'lucide-react'
import type { Student } from '@/lib/aics/types'
import { TasksSkeleton } from './Skeleton'

// ============================================================
//  MaterialsTab — the "Materials" mini-tab inside Academics.
//  Lists the faculty-posted files + links for the student's own
//  current-term subjects (refs #35). Self-fetching: the list is
//  small and scoped, so it loads on first visit only.
// ============================================================

export interface MaterialItem {
  _id: string
  subjectCode: string
  title: string
  kind: 'link' | 'file'
  url: string
  bytes: number | null
  format: string | null
  uploadedAt: string
  uploadedBy: string
}

function formatBytes(bytes: number | null): string | null {
  if (bytes === null || bytes === undefined) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MaterialsTab({ student }: { student: Student }) {
  const [materials, setMaterials] = useState<MaterialItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`/api/materials?username=${encodeURIComponent(student.username)}`)
        const data = await res.json()
        if (cancelled) return
        if (data.ok) setMaterials(data.materials || [])
        else setError(data.error || 'Failed to load materials.')
      } catch {
        if (!cancelled) setError('Network error. Please try again.')
      }
    }
    load()
    return () => { cancelled = true }
  }, [student.username])

  const currentSubjects = useMemo(() =>
    student.subjects.filter((s) => s.academicYear === student.academicYear && s.semester === student.semester),
  [student.subjects, student.academicYear, student.semester])

  const grouped = useMemo(() => {
    const map = new Map<string, MaterialItem[]>()
    for (const m of materials || []) {
      if (!map.has(m.subjectCode)) map.set(m.subjectCode, [])
      map.get(m.subjectCode)!.push(m)
    }
    return Array.from(map.entries())
  }, [materials])

  if (materials === null && !error) return <TasksSkeleton />
  if (error) return <div className="text-red-600 text-sm">{error}</div>

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Materials</h2>
        <p className="text-xs text-slate-500 mt-0.5">Files and links your teachers posted for this term</p>
      </div>

      {grouped.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-16 text-center">
          <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No materials posted yet.</p>
          <p className="text-xs text-slate-500 mt-1">When a teacher shares a file or link, it shows up here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([subjectCode, items]) => {
            const subject = currentSubjects.find((s) => s.code === subjectCode)
            return (
              <div key={subjectCode} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-700">{subjectCode}</span>
                    <h3 className="text-sm font-semibold text-slate-900 truncate">{subject?.title || subjectCode}</h3>
                  </div>
                  {subject && <p className="text-xs text-slate-500 mt-0.5">{subject.professor}</p>}
                </div>
                <ul className="divide-y divide-slate-100">
                  {items.map((m) => (
                    <li key={m._id} className="px-6 py-3 flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border flex-shrink-0 ${m.kind === 'file' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                        {m.kind === 'file' ? <FileText className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
                        {m.kind === 'file' ? 'File' : 'Link'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate">{m.title}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(m.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {formatBytes(m.bytes) ? ` • ${formatBytes(m.bytes)}` : ''}
                          {m.format ? ` • ${m.format.toUpperCase()}` : ''}
                        </p>
                      </div>
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium hover:bg-slate-50 flex-shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Open
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
