'use client'

import type { Student } from '@/lib/aics/types'
import { PALETTE } from '@/lib/aics/palette'

interface COEDocumentProps {
  student: Student
}

/**
 * The printable Certificate of Enrollment document.
 * Rendered inside the COE modal and also what gets printed when the
 * user clicks Print / Save as PDF (controlled by the `.coe-print-area`
 * CSS rule in globals.css).
 */
export function COEDocument({ student }: COEDocumentProps) {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const totalUnits = student.subjects.reduce((sum, s) => sum + s.units, 0)

  return (
    <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: PALETTE.navy }}>
      {/* Letterhead */}
      <div
        className="flex items-center gap-4 pb-4"
        style={{ borderBottom: `2px solid ${PALETTE.navy}` }}
      >
        <img src="/aics-logo.svg" alt="AICS" className="w-16 h-16" />
        <div className="flex-1 text-center">
          <p className="text-[10px] uppercase tracking-widest" style={{ color: '#6b7280' }}>
            Republic of the Philippines
          </p>
          <h1 className="text-xl font-bold" style={{ color: PALETTE.navy }}>
            ASIAN INSTITUTE OF COMPUTER STUDIES
          </h1>
          <p className="text-xs" style={{ color: '#6b7280' }}>
            {student.branchAddress}
          </p>
        </div>
      </div>

      {/* Title */}
      <div className="text-center my-8">
        <h2
          className="text-lg font-bold tracking-widest uppercase"
          style={{ color: PALETTE.navy }}
        >
          Certificate of Enrollment
        </h2>
        <div className="w-32 h-0.5 mx-auto mt-2" style={{ background: PALETTE.ocean }} />
      </div>

      {/* Body */}
      <div className="text-sm leading-relaxed" style={{ color: PALETTE.navy }}>
        <p className="mb-4 pl-8">
          <strong>TO WHOM IT MAY CONCERN:</strong>
        </p>
        <p className="mb-4 pl-8 text-justify">
          This is to certify that <strong>{student.fullName}</strong>, Student Number{' '}
          <strong>{student.studentNumber}</strong>, is officially enrolled at the {student.branch} for
          the {student.semester} of Academic Year {student.academicYear}, in the program{' '}
          <strong>{student.program}</strong>, currently in <strong>{student.yearLevel}</strong> level,
          Section <strong>{student.section}</strong>.
        </p>
        <p className="mb-4 pl-8 text-justify">
          The student is carrying a total load of <strong>{totalUnits} units</strong> consisting of{' '}
          {student.subjects.length} subjects for the said semester, as listed below:
        </p>
      </div>

      {/* Subjects table */}
      <div className="mb-8">
        <table className="w-full text-xs border-collapse" style={{ color: PALETTE.navy }}>
          <thead>
            <tr style={{ background: `${PALETTE.mist}55` }}>
              <th
                className="border px-2 py-1.5 text-left font-semibold"
                style={{ borderColor: PALETTE.navy }}
              >
                Code
              </th>
              <th
                className="border px-2 py-1.5 text-left font-semibold"
                style={{ borderColor: PALETTE.navy }}
              >
                Subject Title
              </th>
              <th
                className="border px-2 py-1.5 text-center font-semibold"
                style={{ borderColor: PALETTE.navy }}
              >
                Units
              </th>
              <th
                className="border px-2 py-1.5 text-left font-semibold"
                style={{ borderColor: PALETTE.navy }}
              >
                Schedule
              </th>
              <th
                className="border px-2 py-1.5 text-left font-semibold"
                style={{ borderColor: PALETTE.navy }}
              >
                Room
              </th>
            </tr>
          </thead>
          <tbody>
            {student.subjects.map((s) => (
              <tr key={s.code}>
                <td className="border px-2 py-1.5" style={{ borderColor: `${PALETTE.mist}88` }}>
                  {s.code}
                </td>
                <td className="border px-2 py-1.5" style={{ borderColor: `${PALETTE.mist}88` }}>
                  {s.title}
                </td>
                <td
                  className="border px-2 py-1.5 text-center"
                  style={{ borderColor: `${PALETTE.mist}88` }}
                >
                  {s.units}
                </td>
                <td className="border px-2 py-1.5" style={{ borderColor: `${PALETTE.mist}88` }}>
                  {s.schedule}
                </td>
                <td className="border px-2 py-1.5" style={{ borderColor: `${PALETTE.mist}88` }}>
                  {s.room}
                </td>
              </tr>
            ))}
            <tr style={{ background: `${PALETTE.mist}33` }}>
              <td
                className="border px-2 py-1.5 font-bold"
                colSpan={2}
                style={{ borderColor: PALETTE.navy }}
              >
                Total
              </td>
              <td
                className="border px-2 py-1.5 text-center font-bold"
                style={{ borderColor: PALETTE.navy }}
              >
                {totalUnits}
              </td>
              <td
                className="border px-2 py-1.5"
                colSpan={2}
                style={{ borderColor: PALETTE.navy }}
              ></td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mb-8 pl-8 text-sm text-justify" style={{ color: PALETTE.navy }}>
        This certification is being issued upon the request of the above-named student for whatever
        legal purpose it may serve.
      </p>

      {/* Signature */}
      <div className="flex justify-end mt-12">
        <div className="text-center">
          <p className="text-xs mb-1" style={{ color: '#6b7280' }}>
            Issued on: {today}
          </p>
          <div
            className="w-56 border-t"
            style={{ borderColor: PALETTE.navy, marginTop: '2.5rem' }}
          />
          <p className="text-xs font-semibold mt-1" style={{ color: PALETTE.navy }}>
            Office of the Registrar
          </p>
        </div>
      </div>
    </div>
  )
}
