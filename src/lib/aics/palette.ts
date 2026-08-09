// AICS brand color palette
// Used consistently across all portal components.
export const PALETTE = {
  white: '#FFFFFF',
  mist: '#D2D2D3',
  sky: '#64BFE9',
  azure: '#4EA4D7',
  ocean: '#287CBB',
  navy: '#153357',
} as const

export type PaletteColor = keyof typeof PALETTE
