'use client'

import { useMemo } from 'react'
import type { FacultyMember, FacultyStudent } from '@/lib/aics/faculty'
import { gradePeriodStatus } from '@/lib/aics/grades'
import type { GradePeriodStatus } from '@/lib/mongodb/types'

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
  gradeStatus?: GradePeriodStatus
  prelimStatus?: GradePeriodStatus
  midtermStatus?: GradePeriodStatus
  finalsStatus?: GradePeriodStatus
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

export { computedFinalINCasZero, remarksFor } from './grades'

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
    return subjects.map((s) => {
      const stu = allStudents.find((st) => st.username === s.studentUsername)
      const prelimStatus = gradePeriodStatus(s, 'prelim') ?? ''
      const midtermStatus = gradePeriodStatus(s, 'midterm') ?? ''
      const finalsStatus = gradePeriodStatus(s, 'finals') ?? ''
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
        dirty: false,
        original: { prelim: s.prelim || '', midterm: s.midterm || '', finals: s.finals || '', finalGrade: s.finalGrade || '' },
      }
    })
  }, [subjects, allStudents])

  return { subjects, allStudents, enrichedStudents, sections, gradeRows }
}
