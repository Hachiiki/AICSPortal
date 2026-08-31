'use client'

import { useMemo } from 'react'
import type { FacultyMember, FacultyStudent } from '@/lib/aics/faculty'

export interface FacultyApiSubject {
  code: string
  title: string
  units: number
  studentUsername: string
  professor: string
  professorEmail: string
  schedule: string
  room: string
  prelim: string
  midterm: string
  finals: string
  finalGrade: string
  remarks: string
  academicYear: string
  semester: string
  yearLevel: string
  section?: string
  status: string
  gradeStatus: string
  prelimStatus?: string
  midtermStatus?: string
  finalsStatus?: string
}

export interface StudentWithGrades extends FacultyStudent {
  subjects: FacultyApiSubject[]
}

export interface FacultySection {
  key: string
  subjectCode: string
  subjectTitle: string
  room: string
  schedule: string
  yearLevel: string
  section: string // derived from enrolled students' sections (student.section is source of truth)
  academicYear: string
  semester: string
  students: StudentWithGrades[]
}

// INC = 0 for finalGrade math (per user decision)
export function computedFinalINCasZero(pre: string, mid: string, fin: string): string {
  const norm = (v: string) => {
    if (!v) return null
    if (v.toUpperCase() === 'INC') return 0
    const n = parseFloat(v)
    return isNaN(n) ? null : n
  }
  const p = norm(pre)
  const m = norm(mid)
  const f = norm(fin)
  if (p === null || m === null || f === null) return ''
  return (p * 0.3 + m * 0.3 + f * 0.4).toFixed(2)
}

export function remarksFor(final: string): string {
  if (!final) return ''
  if (final.toUpperCase() === 'INC') return 'INC'
  const v = parseFloat(final)
  if (isNaN(v)) return '—'
  if (v >= 90) return 'Excellent'
  if (v >= 85) return 'Very Good'
  if (v >= 80) return 'Good'
  if (v >= 75) return 'Passed'
  if (v >= 70) return 'Conditional'
  return 'Failed'
}

export function useFacultyRows(facultyData: { faculty: FacultyMember; subjects: any[]; students: FacultyStudent[] } | null | undefined) {
  const subjects: FacultyApiSubject[] = (facultyData?.subjects ?? []) as FacultyApiSubject[]
  const allStudents: FacultyStudent[] = facultyData?.students ?? []

  const enrichedStudents = useMemo<StudentWithGrades[]>(() => {
    return allStudents.map((stu) => ({
      ...stu,
      subjects: subjects.filter((s) => s.studentUsername === stu.username),
    }))
  }, [allStudents, subjects])

  const sections = useMemo<FacultySection[]>(() => {
    const map = new Map<string, FacultySection>()
    for (const s of subjects) {
      const key = `${s.code}|${s.academicYear || ''}|${s.semester || ''}`
      if (!map.has(key)) {
        map.set(key, {
          key,
          subjectCode: s.code,
          subjectTitle: s.title,
          room: s.room || 'TBA',
          schedule: s.schedule || 'TBA',
          yearLevel: s.yearLevel || '',
          section: '',
          academicYear: s.academicYear || '',
          semester: s.semester || '',
          students: [],
        })
      }
      const stu = enrichedStudents.find((st) => st.username === s.studentUsername)
      if (stu && !map.get(key)!.students.find((st) => st.username === stu.username)) {
        map.get(key)!.students.push(stu)
      }
    }
    const withSection = Array.from(map.values()).map((sec) => {
      const sectionsCount = new Map<string, number>()
      sec.students.forEach((st) => {
        const secName = st.section || ''
        sectionsCount.set(secName, (sectionsCount.get(secName) || 0) + 1)
      })
      let topSection = ''
      let topCount = 0
      for (const [name, cnt] of sectionsCount) {
        if (cnt > topCount) { topCount = cnt; topSection = name }
      }
      return { ...sec, section: topSection || sec.yearLevel }
    })
    return withSection.sort((a, b) => {
      if (a.academicYear !== b.academicYear) return b.academicYear.localeCompare(a.academicYear)
      return a.subjectCode.localeCompare(b.subjectCode)
    })
  }, [subjects, enrichedStudents])

  // Grade rows — one per subject enrollment, with per-period statuses
  const gradeRows = useMemo(() => {
    if (subjects.length === 0) return []
    return subjects.map((s: any) => {
      const stu = allStudents.find((st) => st.username === s.studentUsername)
      const prelimStatus = s.prelimStatus ?? s.gradeStatus ?? ''
      const midtermStatus = s.midtermStatus ?? s.gradeStatus ?? ''
      const finalsStatus = s.finalsStatus ?? s.gradeStatus ?? ''
      // overall locked if any period submitted/released? For row-level, lock only if period locked? Keep per-row locked if any period is submitted/released
      const locked = prelimStatus === 'submitted' || prelimStatus === 'released' || midtermStatus === 'submitted' || midtermStatus === 'released' || finalsStatus === 'submitted' || finalsStatus === 'released'
      return {
        _key: `${s.studentUsername}-${s.code}|${s.academicYear || ''}|${s.semester || ''}`,
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
        academicYear: s.academicYear || '',
        semester: s.semester || '',
        yearLevel: s.yearLevel || '',
        status: s.status || '',
        // per-period
        prelimStatus,
        midtermStatus,
        finalsStatus,
        gradeStatus: s.gradeStatus || '',
        locked: !!locked,
        dirty: false,
        original: { prelim: s.prelim || '', midterm: s.midterm || '', finals: s.finals || '', finalGrade: s.finalGrade || '' },
      }
    })
  }, [subjects, allStudents])

  return { subjects, allStudents, enrichedStudents, sections, gradeRows }
}
