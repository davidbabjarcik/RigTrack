// QR kódy na štítkoch: obyčajný odkaz do appky (…/equipment/<id>, …/cases/<id>, …/warehouse?spot=<id>).
// Fotoaparát v mobile ho otvorí aj bez RigTracku; skener v appke z neho vyčíta, čo to je.

/** `unit` = číslo kusu (#7) pri technike evidovanej po kusoch – každý kus má vlastný QR. */
export type QrTarget = { kind: 'equipment' | 'case' | 'spot'; id: string; unit?: number }

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const PATTERN = new RegExp(`/(equipment|cases)/(${UUID})(?:[/?#]|$)`, 'i')
const SPOT_PATTERN = new RegExp(`/warehouse\\?(?:[^#]*&)?spot=(${UUID})(?:[&#]|$)`, 'i')

/** Cesta v appke, kam QR vedie. */
export function qrPath(target: QrTarget) {
  if (target.kind === 'spot') return `/warehouse?spot=${target.id}`
  return `/${target.kind === 'case' ? 'cases' : 'equipment'}/${target.id}${target.kind === 'equipment' && target.unit ? `?unit=${target.unit}` : ''}`
}

/** Odkaz do appky pre štítok. */
export function qrUrl(target: QrTarget, origin: string, base: string = import.meta.env.BASE_URL ?? '/') {
  // Appka beží v podpriečinku (napr. …/RigTrack/) – bez neho by QR viedol na cudziu 404.
  return `${origin}${base.replace(/\/$/, '')}${qrPath(target)}`
}

/** Z textu QR kódu vyčíta techniku, case alebo miesto v sklade; cudzí QR (Wi-Fi, web…) vráti null. */
export function parseQr(text: string): QrTarget | null {
  const spot = SPOT_PATTERN.exec(text.trim())
  if (spot) return { kind: 'spot', id: spot[1].toLowerCase() }
  const match = PATTERN.exec(text.trim())
  if (!match) return null
  const kind = match[1].toLowerCase() === 'cases' ? 'case' : 'equipment'
  const unit = kind === 'equipment' ? /[?&]unit=(\d+)/.exec(text)?.[1] : undefined
  return { kind, id: match[2].toLowerCase(), ...(unit ? { unit: Number(unit) } : {}) }
}
