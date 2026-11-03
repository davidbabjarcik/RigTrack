/** Riadky poznámky ako zoznam úloh: bez prázdnych riadkov a bez odrážok („- “, „• “, „1. “, „[ ] “). */
export function noteLines(body: string) {
  return body
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•–]\s+|\d+[.)]\s+|\[\s?[xX ]?\s?\]\s*)/, '').trim())
    .filter(Boolean)
}

/** Text poznámky po prevedení vybraných riadkov na úlohy – zostanú len tie, ktoré ste nevybrali. */
export function remainingBody(body: string, converted: Set<number>) {
  const kept: string[] = []
  let index = -1
  for (const line of body.split(/\r?\n/)) {
    const clean = noteLines(line)[0]
    if (!clean) continue
    index += 1
    if (!converted.has(index)) kept.push(line.trimEnd())
  }
  return kept.join('\n')
}
