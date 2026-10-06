/** The map's colors as hex, since Canvas can't read CSS custom properties. Shared colors match the tokens in `index.css`. */
export const MAP_COLORS = {
  canvas: '#FBFBFC',
  ink: '#0B0D12',
  label: '#454C59',
  node: '#2B3140',
  queued: '#9AA2B1',
  edge: '#CDD1D7',
  grid: '#DDE1E7',
  arrow: '#A9AFB9',
  accent: '#5B4FD6',
  broken: '#CF3A1D',
  redirect: '#2E66E6',
  white: '#FFFFFF',
} as const;
