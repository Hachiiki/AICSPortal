import { NextRequest, NextResponse } from 'next/server'
import { getStudentByUsername } from '@/lib/mongodb/queries'
import { getCollection } from '@/lib/mongodb/connection'

// ============================================================
//  Faculty history API — GET /api/faculty/history?username=...
// ============================================================
//
//  Returns this professor's released teaching history grouped by
//  academic year and semester. Only fully released rows qualify.
//  The professor's current term never appears. Each section is
//  marked `current` (still teaching this code now) or `former`
//  (another professor teaches it now), with the current holder
//  named on former sections.
//
//  Shape:
//    { ok, terms: [{ ay, sem, status, sections: [...] }] }
//  Section:
//    { code, title, room, schedule, yearLevel, enrolled, avg,
//      assignment: 'current' | 'former', note }
// ============================================================

type Period = 'prelim' | 'midterm' | 'finals'

function isReleased(doc: any): boolean {
  if (doc.gradeStatus === 'released') return true
  return (['prelimStatus', 'midtermStatus', 'finalsStatus'] as const).every((k) => doc[k] === 'released')
}

export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get('username')
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 })
    }
    const faculty = await getStudentByUsername(username)
    if (!faculty) {
      return NextResponse.json({ ok: false, error: 'Faculty member not found.' }, { status: 404 })
    }

    const subjectsCol = await getCollection('subjects')
    const taught = await subjectsCol
      .find({ branch: faculty.branch, professor: faculty.fullName })
      .project({
        code: 1,
        title: 1,
        room: 1,
        schedule: 1,
        yearLevel: 1,
        studentUsername: 1,
        prelim: 1,
        midterm: 1,
        finals: 1,
        academicYear: 1,
        semester: 1,
        gradeStatus: 1,
        prelimStatus: 1,
        midtermStatus: 1,
        finalsStatus: 1,
      })
      .toArray()

    // Codes taught in the professor's current term. History rows for
    // these codes read `current`, everything else reads `former`.
    const currentCodes = new Set(
      taught
        .filter((d: any) => (d.academicYear || '') === (faculty.academicYear || '') && (d.semester || '') === (faculty.semester || ''))
        .map((d: any) => d.code)
    )

    // Latest professor per code, for the "now taught by" note on
    // former sections. Latest term wins; ties keep the first seen.
    // This reads every holder of these codes, not just this professor.
    const latestHolder = new Map<string, { professor: string; ay: string; sem: string }>()
    const rank = (ay: string, sem: string) => `${ay || ''}|${sem || ''}`
    const codes = Array.from(new Set((taught as any[]).map((d) => d.code).filter(Boolean)))
    if (codes.length) {
      const holders = await subjectsCol
        .find({ branch: faculty.branch, code: { $in: codes } })
        .project({ code: 1, professor: 1, academicYear: 1, semester: 1 })
        .toArray()
      for (const d of holders as any[]) {
        const prev = latestHolder.get(d.code)
        if (!prev || rank(d.academicYear, d.semester) > rank(prev.ay, prev.sem)) {
          latestHolder.set(d.code, { professor: d.professor, ay: d.academicYear || '', sem: d.semester || '' })
        }
      }
    }

    // Group released rows by term, skipping the current term.
    const terms = new Map<string, { ay: string; sem: string; sections: Map<string, any> }>()
    for (const d of taught as any[]) {
      const ay = d.academicYear || ''
      const sem = d.semester || ''
      if (!ay || !sem) continue
      if (ay === (faculty.academicYear || '') && sem === (faculty.semester || '')) continue
      if (!isReleased(d)) continue
      const termKey = `${ay}|${sem}`
      let term = terms.get(termKey)
      if (!term) {
        term = { ay, sem, sections: new Map() }
        terms.set(termKey, term)
      }
      let section = term.sections.get(d.code)
      if (!section) {
        section = {
          code: d.code,
          title: d.title || '',
          room: d.room || 'TBA',
          schedule: d.schedule || 'TBA',
          yearLevel: d.yearLevel || '',
          students: new Set<string>(),
          finals: [] as number[],
        }
        term.sections.set(d.code, section)
      }
      if (d.studentUsername) section.students.add(d.studentUsername)
      const final = parseFloat(d.finals)
      if (!isNaN(final)) section.finals.push(final)
    }

    const sortedTerms = Array.from(terms.values()).sort((a, b) =>
      `${b.ay}|${b.sem}`.localeCompare(`${a.ay}|${a.sem}`)
    )

    const outTerms = sortedTerms.map((term) => {
      const sections = Array.from(term.sections.values())
        .map((s) => {
          const assignment = currentCodes.has(s.code) ? 'current' : 'former'
          const holder = latestHolder.get(s.code)
          const avg = s.finals.length ? (s.finals.reduce((a: number, b: number) => a + b, 0) / s.finals.length).toFixed(1) : '—'
          return {
            code: s.code,
            title: s.title,
            room: s.room,
            schedule: s.schedule,
            yearLevel: s.yearLevel,
            enrolled: s.students.size,
            avg,
            assignment,
            note:
              assignment === 'former' && holder && holder.professor !== faculty.fullName
                ? `Now taught by ${holder.professor}`
                : '',
          }
        })
        .sort((a, b) => a.code.localeCompare(b.code))
      const graded = sections.length > 0
      return {
        ay: term.ay,
        sem: term.sem,
        status: graded ? 'Graded' : 'Archived',
        sections,
      }
    })

    return NextResponse.json({ ok: true, terms: outTerms })
  } catch (err) {
    console.error('Faculty history error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to load teaching history.' }, { status: 500 })
  }
}
