// QR kódy na štítkoch: obyčajný odkaz do appky (…/equipment/<id>, …/cases/<id>, …/warehouse?spot=<id>).
// Fotoaparát v mobile ho otvorí aj bez RigTracku; skener v appke z neho vyčíta, čo to je.

export type QrTarget = { kind: 'equipment' | 'case' | 'spot'; id: string }

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const PATTERN = new RegExp(`/(equipment|cases)/(${UUID})(?:[/?#]|$)`, 'i')
const SPOT_PATTERN = new RegExp(`/warehouse\\?(?:[^#]*&)?spot=(${UUID})(?:[&#]|$)`, 'i')

/** Cesta v appke, kam QR vedie. */
export function qrPath(target: QrTarget) {
  if (target.kind === 'spot') return `/warehouse?spot=${target.id}`
  return `/${target.kind === 'case' ? 'cases' : 'equipment'}/${target.id}`
}

/** Odkaz do appky pre štítok. */
export function qrUrl(target: QrTarget, origin: string) {
  return `${origin}${qrPath(target)}`
}

/** Z textu QR kódu vyčíta techniku, case alebo miesto v sklade; cudzí QR (Wi-Fi, web…) vráti null. */
export function parseQr(text: string): QrTarget | null {
  const spot = SPOT_PATTERN.exec(text.trim())
  if (spot) return { kind: 'spot', id: spot[1].toLowerCase() }
  const match = PATTERN.exec(text.trim())
  if (!match) return null
  return { kind: match[1].toLowerCase() === 'cases' ? 'case' : 'equipment', id: match[2].toLowerCase() }
}
