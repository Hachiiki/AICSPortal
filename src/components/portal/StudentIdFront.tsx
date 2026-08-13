'use client'

import type { Student } from '@/lib/aics/types'
import { FIELD_BOXES, ID_FONTS, CALIBRATE } from '@/lib/aics/id-card-config'
import { FitText } from './FitText'

interface StudentIdFrontProps {
  student: Student
}

// ------------------------------------------------------------
//  Data derivation (Part 6 of spec)
// ------------------------------------------------------------

function deriveIdName(student: Student): string {
  const parts: string[] = []
  if (student.firstName) parts.push(student.firstName)
  if (student.middleName) {
    const initial = student.middleName.trim()[0]
    if (initial) parts.push(initial + '.')
  }
  if (student.lastName) parts.push(student.lastName)
  return parts.join(' ').toUpperCase()
}

function deriveIdNumber(student: Student): string {
  return student.studentNumber
}

function deriveIdCourse(student: Student): string {
  return student.program.toUpperCase()
}

function deriveIdBranch(student: Student): string {
  return (student.branch.replace(/^AICS\s+/i, '') + ' BRANCH').toUpperCase()
}

function deriveIdAddress(student: Student): string {
  return student.branchAddress
}

// ------------------------------------------------------------
//  Overlay rendering
// ------------------------------------------------------------

export function StudentIdFront({ student }: StudentIdFrontProps) {
  const idName = deriveIdName(student)
  const idNumber = deriveIdNumber(student)
  const idCourse = deriveIdCourse(student)
  const idBranch = deriveIdBranch(student)
  const idAddress = deriveIdAddress(student)

  return (
    <>
      {/* NAME */}
      <OverlayBox box={FIELD_BOXES.name} calibrate={CALIBRATE} label="name">
        <FitText
          maxCqw={FIELD_BOXES.name.sizeCqw}
          minCqw={FIELD_BOXES.name.minCqw}
          className={`${ID_FONTS.display} uppercase whitespace-nowrap`}
        >
          {idName}
        </FitText>
      </OverlayBox>

      {/* PHOTO */}
      <OverlayBox box={FIELD_BOXES.photo} calibrate={CALIBRATE} label="photo">
        {student.photoUrl ? (
          <img
            src={student.photoUrl}
            alt={`Photo of ${student.fullName}`}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: '50% 18%' }}
            draggable={false}
          />
        ) : (
          <img
            src="/assets/student-id/photo-placeholder.svg"
            alt={`Photo placeholder for ${student.fullName}`}
            className="absolute inset-0 h-full w-full object-contain"
            draggable={false}
          />
        )}
      </OverlayBox>

      {/* STUDENT NUMBER */}
      <OverlayBox box={FIELD_BOXES.number} calibrate={CALIBRATE} label="number">
        <FitText
          maxCqw={FIELD_BOXES.number.sizeCqw}
          minCqw={FIELD_BOXES.number.minCqw}
          className={`${ID_FONTS.display} whitespace-nowrap`}
        >
          {idNumber}
        </FitText>
      </OverlayBox>

      {/* COURSE */}
      <OverlayBox box={FIELD_BOXES.course} calibrate={CALIBRATE} label="course">
        <FitText
          maxCqw={FIELD_BOXES.course.sizeCqw}
          minCqw={FIELD_BOXES.course.minCqw}
          className={`${ID_FONTS.display} uppercase leading-[1.2] text-left`}
          multiline
        >
          {idCourse}
        </FitText>
      </OverlayBox>

      {/* BRANCH */}
      <OverlayBox box={FIELD_BOXES.branch} calibrate={CALIBRATE} label="branch">
        <FitText
          maxCqw={FIELD_BOXES.branch.sizeCqw}
          minCqw={FIELD_BOXES.branch.minCqw}
          className={`${ID_FONTS.display} uppercase whitespace-nowrap text-center`}
        >
          {idBranch}
        </FitText>
      </OverlayBox>

      {/* ADDRESS */}
      <OverlayBox box={FIELD_BOXES.address} calibrate={CALIBRATE} label="address">
        <FitText
          maxCqw={FIELD_BOXES.address.sizeCqw}
          minCqw={FIELD_BOXES.address.minCqw}
          className={`${ID_FONTS.body} text-center leading-[1.25]`}
          multiline
        >
          {idAddress}
        </FitText>
      </OverlayBox>

      {/* Calibration grid */}
      {CALIBRATE && <CalibrationGrid />}
    </>
  )
}

// ------------------------------------------------------------
//  Overlay box — absolutely positioned container for one field
// ------------------------------------------------------------

function OverlayBox({
  box,
  calibrate,
  label,
  children,
}: {
  box: typeof FIELD_BOXES[string]
  calibrate: boolean
  label: string
  children: React.ReactNode
}) {
  const justifyContent = box.vCenter ? 'center' : 'flex-start'
  const alignItems = box.align === 'center' ? 'center' : 'flex-start'

  return (
    <div
      className="absolute pointer-events-none overflow-hidden flex flex-col"
      style={{
        left: `${box.x}%`,
        top: `${box.y}%`,
        width: `${box.w}%`,
        height: `${box.h}%`,
        justifyContent,
        alignItems,
      }}
    >
      {calibrate && (
        <div
          className="absolute inset-0 border-2 border-dashed"
          style={{ borderColor: 'red' }}
        >
          <span
            className="absolute -top-4 left-0 text-[8px] font-mono"
            style={{ color: 'red' }}
          >
            {label}
          </span>
        </div>
      )}
      <div
        className="w-full overflow-hidden"
        style={{
          textAlign: box.align === 'center' ? 'center' : 'left',
          color: box.color || undefined,
          display: 'block',
          whiteSpace: box.nowrap ? 'nowrap' : 'normal',
          lineHeight: box.multiline ? (box.align === 'center' ? '1.25' : '1.2') : '1.1',
        }}
      >
        {children}
      </div>
    </div>
  )
}

/** 10% grid overlay for calibration mode */
function CalibrationGrid() {
  const lines: React.ReactNode[] = []
  for (let i = 10; i < 100; i += 10) {
    lines.push(
      <div
        key={`v${i}`}
        className="absolute top-0 bottom-0 border-l"
        style={{ left: `${i}%`, borderColor: 'rgba(255,0,0,0.2)' }}
      />
    )
    lines.push(
      <div
        key={`h${i}`}
        className="absolute left-0 right-0 border-t"
        style={{ top: `${i}%`, borderColor: 'rgba(255,0,0,0.2)' }}
      />
    )
  }
  return <>{lines}</>
}
