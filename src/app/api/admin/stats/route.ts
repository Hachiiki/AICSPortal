import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb/connection'
import { requireCan } from '@/lib/authz'
import { errResponse } from '@/lib/validation'
import { HttpError } from '@/lib/http'
import type { MongoStudent, MongoSubject, MongoProfessor, MongoEvent, MongoAnnouncement, MongoEnrollment, MongoProgram, MongoCourse } from '@/lib/mongodb/types'

// GET /api/admin/stats
// School-wide snapshot for the admin dashboard: enrollment counts,
// GPA distribution, finances, and a per-branch overview. Admin-only.
//
// Scoping: this read is SCHOOL-WIDE (every branch) because the admin
// dashboard's whole job is the branch overview. Write endpoints stay
// branch-scoped to the admin's own session branch — this route never
// mutates anything, so the wider read is safe.
//
// Sizing: single-node deployment with ~100 students / ~300 subject
// rows, so plain JS aggregation over full collection scans is both
// simpler and faster than an aggregation pipeline here.
export async function GET(request: NextRequest) {
  try {
    // C2.1: session + admin-role gate centralized (admin.stats read,
    // school-wide by design per D1; issue #79 registry row).
    await requireCan(request, { kind: 'admin.stats' }, 'read')

    // getCollection<T> returns `any` (see connection.ts), so a typed
    // helper keeps the Promise.all tuple inference intact downstream.
    async function fetchAll<T>(name: string): Promise<T[]> {
      const col = await getCollection<T>(name)
      return col.find({}).toArray()
    }

    const [
      studentsAll, subjectsAll, professorsAll, eventsAll,
      announcementsAll, enrollmentsAll, programsAll, coursesAll,
    ] = await Promise.all([
      fetchAll<MongoStudent>('students'),
      fetchAll<MongoSubject>('subjects'),
      fetchAll<MongoProfessor>('professors'),
      fetchAll<MongoEvent>('events'),
      fetchAll<MongoAnnouncement>('announcements'),
      fetchAll<MongoEnrollment>('enrollments'),
      fetchAll<MongoProgram>('programs'),
      fetchAll<MongoCourse>('courses'),
    ])

    // ---------- helpers ----------
    function countBy<T>(rows: T[], key: (row: T) => string): { label: string; count: number }[] {
      const map = new Map<string, number>()
      for (const row of rows) {
        const k = key(row) || '—'
        map.set(k, (map.get(k) ?? 0) + 1)
      }
      return Array.from(map, ([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    }

    // Unit-weighted GPA per student over RELEASED final grades —
    // mirrors the student API's visibility rule (finalGrade shows
    // only when gradeStatus === 'released'). Philippine scale:
    // 1.00 is best, 3.00 is pass.
    const subjectsByStudent = new Map<string, MongoSubject[]>()
    for (const s of subjectsAll) {
      const list = subjectsByStudent.get(s.studentUsername)
      if (list) list.push(s)
      else subjectsByStudent.set(s.studentUsername, [s])
    }
    function releasedGpa(username: string): number | null {
      const rows = subjectsByStudent.get(username)
      if (!rows) return null
      let units = 0
      let weighted = 0
      for (const s of rows) {
        if (s.gradeStatus !== 'released') continue
        const g = parseFloat(s.finalGrade)
        if (!isNaN(g)) {
          units += s.units
          weighted += g * s.units
        }
      }
      if (units === 0) return null
      return weighted / units
    }

    // ---------- totals ----------
    const studentRows = studentsAll.filter((s) => s.role === 'student')
    const facultyRows = studentsAll.filter((s) => s.role === 'faculty')
    const adminRows = studentsAll.filter((s) => s.role === 'admin')
    const branches = Array.from(new Set(studentsAll.map((s) => s.branch)))

    // Pending grade releases: per-period 'submitted' statuses grouped
    // the same way the release queue page groups them, so the
    // dashboard's "Pending releases" card can deep-link into it.
    const pendingMap = new Map<string, { subjectCode: string; title: string; academicYear: string; semester: string; period: 'prelim' | 'midterm' | 'finals'; count: number }>()
    for (const s of subjectsAll) {
      const periods: Array<['prelim' | 'midterm' | 'finals', string | undefined]> = [
        ['prelim', s.prelimStatus],
        ['midterm', s.midtermStatus],
        ['finals', s.finalsStatus],
      ]
      for (const [period, status] of periods) {
        if (status !== 'submitted') continue
        const key = `${s.code}|${s.academicYear ?? ''}|${s.semester ?? ''}|${period}`
        const existing = pendingMap.get(key)
        if (existing) existing.count += 1
        else
          pendingMap.set(key, {
            subjectCode: s.code,
            title: s.title,
            academicYear: s.academicYear ?? '',
            semester: s.semester ?? '',
            period,
            count: 1,
          })
      }
    }
    const pendingReleases = Array.from(pendingMap.values()).sort((a, b) =>
      a.subjectCode.localeCompare(b.subjectCode) || a.period.localeCompare(b.period)
    )

    // ---------- GPA distribution ----------
    // Dean's lister cutoff 1.75 (AICS standard). Students without
    // released grades are counted separately, never bucketed.
    const BUCKETS: { label: string; lo: number; hi: number }[] = [
      { label: '1.00 – 1.25', lo: 0, hi: 1.25 },
      { label: '1.26 – 1.50', lo: 1.25, hi: 1.5 },
      { label: '1.51 – 1.75', lo: 1.5, hi: 1.75 },
      { label: '1.76 – 2.00', lo: 1.75, hi: 2 },
      { label: '2.01 – 2.25', lo: 2, hi: 2.25 },
      { label: '2.26 – 2.50', lo: 2.25, hi: 2.5 },
      { label: '2.51+', lo: 2.5, hi: Infinity },
    ]
    const bucketCounts = BUCKETS.map(() => 0)
    const gpaValues: number[] = []
    let withGpa = 0
    let deanListers = 0
    for (const s of studentRows) {
      const gpa = releasedGpa(s.username)
      if (gpa === null) continue
      withGpa += 1
      gpaValues.push(gpa)
      if (gpa <= 1.75) deanListers += 1
      for (let i = 0; i < BUCKETS.length; i++) {
        if (gpa > BUCKETS[i].lo && gpa <= BUCKETS[i].hi) {
          bucketCounts[i] += 1
          break
        }
      }
    }
    const gpaAverage = gpaValues.length > 0 ? gpaValues.reduce((a, b) => a + b, 0) / gpaValues.length : null

    // ---------- finances (all enrollment records, every term) ----------
    const totalAssessment = enrollmentsAll.reduce((sum, e) => sum + (e.assessment?.totalAssessment ?? 0), 0)
    const totalPaid = enrollmentsAll.reduce((sum, e) => sum + (e.assessment?.amountPaid ?? 0), 0)
    const totalBalance = enrollmentsAll.reduce((sum, e) => sum + (e.assessment?.balance ?? 0), 0)
    const paidCount = enrollmentsAll.filter((e) => e.assessment?.paymentStatus === 'paid').length
    const partialCount = enrollmentsAll.filter((e) => e.assessment?.paymentStatus === 'partial').length
    const unpaidCount = enrollmentsAll.filter((e) => e.assessment?.paymentStatus === 'unpaid').length

    // ---------- branch overview ----------
    // Branch display names come from the student docs (branch_name).
    const branchNames = new Map<string, string>()
    for (const s of studentsAll) {
      if (s.branch_name && !branchNames.has(s.branch)) branchNames.set(s.branch, s.branch_name)
    }
    const branchRows = branches.map((branch) => {
      const st = studentsAll.filter((s) => s.branch === branch)
      return {
        branch,
        branchName: branchNames.get(branch) ?? branch,
        students: st.filter((s) => s.role === 'student').length,
        faculty: st.filter((s) => s.role === 'faculty').length,
        programs: programsAll.filter((p) => p.branch === branch).length,
        courses: coursesAll.filter((c) => c.branch === branch).length,
        events: eventsAll.filter((e) => e.branch === branch).length,
        announcements: announcementsAll.filter((a) => a.branch === branch).length,
        pendingReleases: subjectsAll.filter(
          (s) =>
            s.branch === branch &&
            (s.prelimStatus === 'submitted' || s.midtermStatus === 'submitted' || s.finalsStatus === 'submitted')
        ).length,
        deanListers: st.filter((s) => {
          if (s.role !== 'student') return false
          const gpa = releasedGpa(s.username)
          return gpa !== null && gpa <= 1.75
        }).length,
        balance: enrollmentsAll
          .filter((e) => e.branch === branch)
          .reduce((sum, e) => sum + (e.assessment?.balance ?? 0), 0),
      }
    })

    // ---------- upcoming events + recent announcements ----------
    const now = new Date()
    const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const today = startOfToday(now)
    const upcomingEvents = eventsAll
      .filter((e) => {
        const d = e.date instanceof Date ? e.date : new Date(e.date)
        return d >= today && d <= inSevenDays
      })
      .sort((a, b) => {
        const da = a.date instanceof Date ? a.date : new Date(a.date)
        const db = b.date instanceof Date ? b.date : new Date(b.date)
        return da.getTime() - db.getTime()
      })
      .slice(0, 6)
      .map((e) => ({
        _id: e._id?.toString() ?? '',
        title: e.title,
        date: e.date instanceof Date ? e.date.toISOString() : String(e.date),
        endDate: e.endDate ? (e.endDate instanceof Date ? e.endDate.toISOString() : String(e.endDate)) : null,
        category: e.category,
        branch: e.branch,
      }))

    const recentAnnouncements = announcementsAll
      .slice()
      .sort((a, b) => {
        const da = a.postedDate instanceof Date ? a.postedDate.getTime() : new Date(a.postedDate).getTime() || 0
        const db = b.postedDate instanceof Date ? b.postedDate.getTime() : new Date(b.postedDate).getTime() || 0
        return db - da
      })
      .slice(0, 5)
      .map((a) => ({
        _id: a._id?.toString() ?? '',
        title: a.title,
        category: a.category,
        priority: a.priority,
        author: a.author,
        postedDate: a.postedDate instanceof Date ? a.postedDate.toISOString() : String(a.postedDate),
        expiryDate: a.expiryDate ? (a.expiryDate instanceof Date ? a.expiryDate.toISOString() : String(a.expiryDate)) : null,
        branch: a.branch,
      }))

    return NextResponse.json({
      ok: true,
      stats: {
        totals: {
          students: studentRows.length,
          faculty: facultyRows.length,
          admins: adminRows.length,
          branches: branches.length,
          programs: programsAll.length,
          courses: coursesAll.length,
          events: eventsAll.length,
          announcements: announcementsAll.length,
          pendingReleaseGroups: pendingReleases.length,
          pendingReleaseRows: pendingReleases.reduce((sum, g) => sum + g.count, 0),
          upcomingEvents: upcomingEvents.length,
        },
        enrollment: {
          byStatus: countBy(studentRows, (s) => s.enrollmentStatus),
          byYearLevel: countBy(studentRows, (s) => s.yearLevel),
          byProgram: countBy(studentRows, (s) => s.programShort),
        },
        gpa: {
          buckets: BUCKETS.map((b, i) => ({ label: b.label, count: bucketCounts[i] })),
          deanListers,
          withGpa,
          withoutGpa: studentRows.length - withGpa,
          average: gpaAverage === null ? null : gpaAverage.toFixed(2),
        },
        finances: {
          totalAssessment,
          totalPaid,
          totalBalance,
          paid: paidCount,
          partial: partialCount,
          unpaid: unpaidCount,
        },
        branches: branchRows,
        upcomingEvents,
        recentAnnouncements,
        pendingReleases,
      },
    })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Admin stats API error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to compute school stats.' }, { status: 500 })
  }
}

function startOfToday(now: Date): Date {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d
}
