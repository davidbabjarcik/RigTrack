// Art-Net / sACN node (prevodník sieť → DMX): aktívne protokoly a ktorý výstup posiela ktorú universe.

export const NODE_PROTOCOLS = ['artnet', 'sacn'] as const
export type NodeProtocol = (typeof NODE_PROTOCOLS)[number]
export const NODE_PROTOCOL_LABELS: Record<NodeProtocol, string> = { artnet: 'Art-Net', sacn: 'sACN' }

/** Jeden výstup (port) nodu: universe, ktorú posiela, a pri nodoch s oboma protokolmi aj ktorým. */
export type NodePort = { port: number; universe: number | null; protocol?: NodeProtocol; note?: string }

/** Najvyššia universe (sACN až 63999; Art-Net 0–32767). */
export const MAX_UNIVERSE = 63999

/** Výstupy 1…count; existujúce nastavenie ostane, nové sú prázdne. */
export function resizePorts(ports: NodePort[], count: number): NodePort[] {
  return Array.from({ length: Math.max(0, Math.min(64, count)) }, (_, index) => ports.find((item) => item.port === index + 1) ?? { port: index + 1, universe: null })
}

/** Všetkým výstupom rovnaká universe (node ako splitter, napr. 1–4 = universe 0). */
export const sameUniverse = (ports: NodePort[], universe: number) => ports.map((item) => ({ ...item, universe }))

/** Universe za sebou od zadanej (1, 2, 3 … alebo 9, 10, 11 …). */
export const sequentialUniverses = (ports: NodePort[], start: number) => ports.map((item, index) => ({ ...item, universe: start + index }))

/** „1–4 → U0 · 5 → U9“: súvislé výstupy s rovnakou universe spolu. */
export function describePorts(ports: NodePort[]) {
  const parts: string[] = []
  const sorted = [...ports].sort((a, b) => a.port - b.port)
  for (let index = 0; index < sorted.length; index++) {
    const start = sorted[index]
    let end = index
    while (end + 1 < sorted.length && sorted[end + 1].universe === start.universe && sorted[end + 1].protocol === start.protocol && sorted[end + 1].port === sorted[end].port + 1) end++
    if (start.universe !== null) {
      const ports = end > index ? `${start.port}–${sorted[end].port}` : `${start.port}`
      parts.push(`${ports} → U${start.universe}${start.protocol ? ` ${NODE_PROTOCOL_LABELS[start.protocol]}` : ''}`)
    }
    index = end
  }
  return parts.join(' · ')
}

/** Ktoré výstupy (aj z viacerých nodov) posielajú danú universe – na tlač DMX patch listu. */
export function portsForUniverse<T extends { id: string; name: string; attributes: { nodePorts?: NodePort[] } }>(nodes: T[], universe: number) {
  return nodes.flatMap((node) => (node.attributes.nodePorts ?? []).filter((item) => item.universe === universe).map((item) => ({ node, port: item.port, protocol: item.protocol })))
}
