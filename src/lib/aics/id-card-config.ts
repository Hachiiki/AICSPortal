// ============================================================
//  ID Card Configuration — single source of truth
// ============================================================
//  All coordinates are percentages of the template image's
//  width (x, w) and height (y, h). Typography uses container
//  query width (cqw) units so text scales with the card width.
// ============================================================

/** Aspect ratio of the template PNG (1024:1536 = 2:3) */
export const ASPECT = '2 / 3'

/** When true, renders dashed outlines + labels for calibration */
export const CALIBRATE = false

/** Border radius class for the card wrapper */
export const CARD_RADIUS = 'rounded-lg'

/** Colors used by overlay text */
export const ID_COLORS = {
  yellow: '#FFD400',
  ink: '#1F2937',
  white: '#FFFFFF',
} as const

/** Font utility class names (mapped to @theme tokens in globals.css) */
export const ID_FONTS = {
  display: 'font-id-display',
  body: 'font-id-body',
} as const

export interface FieldBox {
  x: number
  y: number
  w: number
  h: number
  align: 'left' | 'center'
  font: 'display' | 'body'
  sizeCqw: number
  minCqw: number
  color: string
  lines: number
  multiline?: boolean
  uppercase?: boolean
  nowrap?: boolean
  /** Vertical centering within the box */
  vCenter?: boolean
}

// ------------------------------------------------------------
//  Field positions — derived from pixel analysis of
//  id-front-template.png (1024×1536)
//
//  Template layout:
//    y=0–43%   : White header (logo, school name, tagline)
//    y=46–53%  : Navy bar — NAME (white text)
//    y=54–85%  : Blue section (photo frame left, text right)
//    y=88–92%  : Navy bar — BRANCH (yellow text)
//    y=93–99%  : White footer — ADDRESS (dark text)
// ------------------------------------------------------------

export const FIELD_BOXES: Record<string, FieldBox> = {
  // Name — on the navy bar at y=46–53%, full width
  name: {
    x: 6, y: 45.5, w: 88, h: 7.5,
    align: 'left', font: 'display', sizeCqw: 6.0, minCqw: 4.0,
    color: ID_COLORS.white, lines: 1, nowrap: true, uppercase: true, vCenter: true,
  },
  // Photo — white frame on left side of blue section
  photo: {
    x: 6, y: 54, w: 38, h: 31.5,
    align: 'left', font: 'display', sizeCqw: 0, minCqw: 0,
    color: '', lines: 0,
  },
  // Student Number — right of photo, below yellow label
  number: {
    x: 48, y: 60, w: 50, h: 7.0,
    align: 'left', font: 'display', sizeCqw: 7.5, minCqw: 5.0,
    color: ID_COLORS.white, lines: 1, nowrap: true, vCenter: true,
  },
  // Course/Program — right of photo, below student number
  course: {
    x: 48.5, y: 69, w: 47.5, h: 15.5,
    align: 'left', font: 'display', sizeCqw: 4.6, minCqw: 3.2,
    color: ID_COLORS.white, lines: 3, multiline: true, uppercase: true, vCenter: true,
  },
  // Branch — on the bottom navy bar
  branch: {
    x: 5, y: 87.5, w: 90, h: 5.5,
    align: 'center', font: 'display', sizeCqw: 4.6, minCqw: 3.4,
    color: ID_COLORS.yellow, lines: 1, nowrap: true, uppercase: true, vCenter: true,
  },
  // Address — white footer area
  address: {
    x: 8, y: 93.4, w: 84, h: 6.2,
    align: 'center', font: 'body', sizeCqw: 3.2, minCqw: 2.6,
    color: ID_COLORS.ink, lines: 3, multiline: true, vCenter: true,
  },
}
