/**
 * Odkaz zadaný používateľom bezpečne do `href`: len http(s), mailto a tel. Iné (napr. `javascript:` alebo `data:`
 * podstrčené cez API mimo formulára) sa nezobrazia ako odkaz – ochrana pred XSS.
 */
export function safeUrl(value: string | null | undefined): string | undefined {
  const text = (value ?? '').trim()
  if (!text) return undefined
  try {
    const url = new URL(text)
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol) ? url.href : undefined
  } catch {
    return undefined
  }
}
