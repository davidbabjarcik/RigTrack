// Rozmery case a reprákov: šírka (zľava doprava), hĺbka (spredu dozadu), výška (od zeme hore).
// Pri skladaní do dodávky rozhoduje skutočný vonkajší rozmer – vrátane guľových rohov a koliesok.

export const WHEEL_PLACES = ['none', 'bottom', 'back', 'side'] as const
export type WheelPlace = (typeof WHEEL_PLACES)[number]

export const WHEEL_LABELS: Record<WheelPlace, string> = {
  none: 'Bez koliesok',
  bottom: 'Kolieska zospodu',
  back: 'Kolieska vzadu (na prevrátenie)',
  side: 'Kolieska na boku',
}

type Sides = { width: number | null | undefined; depth: number | null | undefined; height: number | null | undefined }

/** „52 × 38 × 54 cm (š × h × v)“ z vyplnených rozmerov; bez rozmerov prázdny text. */
export function formatSides({ width, depth, height }: Sides, extra: { corners?: boolean | null } = {}) {
  const parts = [
    [width, 'š'],
    [depth, 'h'],
    [height, 'v'],
  ].filter((part): part is [number, string] => typeof part[0] === 'number' && part[0] > 0)
  if (parts.length === 0) return ''
  const numbers = parts.map(([value]) => String(value).replace('.', ',')).join(' × ')
  const corners = extra.corners === true ? ', s rohmi' : extra.corners === false ? ', bez rohov' : ''
  return `${numbers} cm (${parts.map(([, letter]) => letter).join(' × ')}${corners})`
}
