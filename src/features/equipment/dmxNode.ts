// Art-Net / sACN node (prevodník sieť → DMX): aktívne protokoly a ktorú universe posiela každý výstup.
// Jeden port môže mať pre Art-Net inú universe ako pre sACN (napr. Art-Net 0, sACN 9).

export const NODE_PROTOCOLS = ['artnet', 'sacn'] as const
export type NodeProtocol = (typeof NODE_PROTOCOLS)[number]
export const NODE_PROTOCOL_LABELS: Record<NodeProtocol, string> = { artnet: 'Art-Net', sacn: 'sACN' }

/** Jeden výstup (port) nodu: universe pre Art-Net a pre sACN (prázdne = protokol na porte nie je). */
export type NodePort = { port: number; artnet?: number | null; sacn?: number | null; note?: string; /** staršie uloženie (4.12) */ universe?: number | null; protocol?: NodeProtocol }

/** Najvyššia universe (sACN až 63999; Art-Net 0–32767). */
export const MAX_UNIVERSE = 63999

/** Prevod staršieho uloženia (jedna universe + protokol) na Art-Net / sACN. */
export function normalizePort(item: NodePort): NodePort {
  if (item.artnet !== undefined || item.sacn !== undefined || item.universe === undefined) return { port: item.port, artnet: item.artnet ?? null, sacn: item.sacn ?? null }
  return {
    port: item.port,
    artnet: item.protocol === 'sacn' ? null : item.universe,
    sacn: item.protocol === 'artnet' ? null : item.universe,
  }
}

/** Výstupy 1…count; existujúce nastavenie ostane, nové sú prázdne. */
export function resizePorts(ports: NodePort[], count: number): NodePort[] {
  return Array.from({ length: Math.max(0, Math.min(64, count)) }, (_, index) => {
    const found = ports.find((item) => item.port === index + 1)
    return found ? normalizePort(found) : { port: index + 1, artnet: null, sacn: null }
  })
}

/** Všetkým výstupom rovnaká universe pre protokol (node ako splitter, napr. 1–4 = universe 0). */
export const sameUniverse = (ports: NodePort[], protocol: NodeProtocol, universe: number) => ports.map((item) => ({ ...normalizePort(item), [protocol]: universe }))

/** Universe za sebou od zadanej (9, 10, 11 …) pre protokol. */
export const sequentialUniverses = (ports: NodePort[], protocol: NodeProtocol, start: number) => ports.map((item, index) => ({ ...normalizePort(item), [protocol]: start + index }))

/** „Art-Net 1–4 → U0 · sACN 1–4 → U9“: súvislé výstupy s rovnakou universe spolu, po protokoloch. */
export function describePorts(ports: NodePort[]) {
  const normalized = ports.map(normalizePort).sort((a, b) => a.port - b.port)
  const parts: string[] = []
  for (const protocol of NODE_PROTOCOLS) {
    const used = normalized.filter((item) => item[protocol] !== null && item[protocol] !== undefined)
    const ranges: string[] = []
    for (let index = 0; index < used.length; index++) {
      let end = index
      while (end + 1 < used.length && used[end + 1][protocol] === used[index][protocol] && used[end + 1].port === used[end].port + 1) end++
      ranges.push(`${end > index ? `${used[index].port}–${used[end].port}` : used[index].port} → U${used[index][protocol]}`)
      index = end
    }
    if (ranges.length > 0) parts.push(`${NODE_PROTOCOL_LABELS[protocol]} ${ranges.join(', ')}`)
  }
  return parts.join(' · ')
}

/** Ktoré výstupy (aj z viacerých nodov) posielajú danú universe – na tlač DMX patch listu. */
export function portsForUniverse<T extends { id: string; name: string; attributes: { nodePorts?: NodePort[] } }>(nodes: T[], universe: number) {
  return nodes.flatMap((node) =>
    (node.attributes.nodePorts ?? []).map(normalizePort).flatMap((item) =>
      NODE_PROTOCOLS.filter((protocol) => item[protocol] === universe).map((protocol) => ({ node, port: item.port, protocol })),
    ),
  )
}
