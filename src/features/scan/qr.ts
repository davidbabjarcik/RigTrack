// QR kódy na štítkoch: obyčajný odkaz do appky (…/equipment/<id>, …/cases/<id>).
// Fotoaparát v mobile ho otvorí aj bez RigTracku; skener v appke z neho vyčíta, čo to je.

export type QrTarget = { kind: 'equipment' | 'case'; id: string }

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const PATTERN = new RegExp(`/(equipment|cases)/(${UUID})(?:[/?#]|$)`, 'i')

/** Odkaz do appky pre štítok. */
export function qrUrl(target: QrTarget, origin: string) {
  return `${origin}/${target.kind === 'case' ? 'cases' : 'equipment'}/${target.id}`
}

/** Z textu QR kódu vyčíta techniku alebo case; cudzí QR (Wi-Fi, web…) vráti null. */
export function parseQr(text: string): QrTarget | null {
  const match = PATTERN.exec(text.trim())
  if (!match) return null
  return { kind: match[1].toLowerCase() === 'cases' ? 'case' : 'equipment', id: match[2].toLowerCase() }
}

/** Cesta v appke, kam QR vedie. */
export function qrPath(target: QrTarget) {
  return `/${target.kind === 'case' ? 'cases' : 'equipment'}/${target.id}`
}
