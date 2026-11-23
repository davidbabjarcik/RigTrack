import type { PointerEvent as ReactPointerEvent, Ref } from 'react'
import { bounds, linkEnds, linkText, NODE_H, NODE_KIND_LABELS, NODE_W, SIGNAL_DASH, type SynLink, type SynNode } from './model'

type Props = {
  nodes: SynNode[]
  links: SynLink[]
  names?: Record<string, string>
  selected?: string | null
  connectFrom?: string | null
  onNodePointerDown?: (id: string, event: ReactPointerEvent<SVGGElement>) => void
  onLinkClick?: (id: string) => void
  onBackground?: () => void
  svgRef?: Ref<SVGSVGElement>
  /** Pevná plocha editora (aby sa pri ťahaní nemenila mierka). */
  area?: { width: number; height: number }
  className?: string
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

/** Synoptika ako SVG – uzly a prepojenia s káblom a dĺžkou. Bez prihlásenia aj na zdieľanej stránke. */
export function SynopticSvg({ nodes, links, names = {}, selected, connectFrom, onNodePointerDown, onLinkClick, onBackground, svgRef, area, className }: Props) {
  const box = area ? { x: 0, y: 0, ...area } : bounds(nodes)
  const byId = new Map(nodes.map((node) => [node.id, node]))
  return (
    <svg
      ref={svgRef}
      viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
      className={className}
      role="img"
      aria-label="Synoptika"
      style={{ touchAction: onNodePointerDown ? 'none' : undefined }}
      onPointerDown={(event) => {
        if ((event.target as Element).getAttribute('data-bg') === '1' || event.target === event.currentTarget) onBackground?.()
      }}
    >
      <defs>
        <marker id="syn-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
      </defs>
      <rect data-bg="1" x={box.x} y={box.y} width={box.width} height={box.height} fill="transparent" />
      {links.map((link) => {
        const a = byId.get(link.from)
        const b = byId.get(link.to)
        if (!a || !b) return null
        const { start, end } = linkEnds(a, b)
        const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
        const text = linkText(link)
        const active = selected === link.id
        return (
          <g key={link.id} onClick={onLinkClick ? () => onLinkClick(link.id) : undefined} style={{ cursor: onLinkClick ? 'pointer' : undefined }}>
            <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="transparent" strokeWidth={14} />
            <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={active ? 'var(--color-accent, #2563eb)' : 'currentColor'} strokeWidth={link.count > 1 ? 3.5 : 2} strokeDasharray={SIGNAL_DASH[link.signal] || undefined} markerEnd="url(#syn-arrow)" />
            {text && (
              <g style={{ pointerEvents: 'none' }}>
                <rect x={mid.x - text.length * 3.2 - 4} y={mid.y - 9} width={text.length * 6.4 + 8} height={18} rx={4} fill="var(--plot-fill, #ffffff)" opacity={0.92} />
                <text x={mid.x} y={mid.y + 4} fontSize={11} textAnchor="middle" fill="currentColor">{text}</text>
              </g>
            )}
          </g>
        )
      })}
      {nodes.map((node) => {
        const active = selected === node.id || connectFrom === node.id
        const sub = [node.equipment_id ? names[node.equipment_id] : '', node.detail].filter(Boolean).join(' · ')
        return (
          <g key={node.id} transform={`translate(${node.x} ${node.y})`} onPointerDown={onNodePointerDown ? (event) => onNodePointerDown(node.id, event) : undefined} style={{ cursor: onNodePointerDown ? 'grab' : undefined }}>
            <rect width={NODE_W} height={NODE_H} rx={8} fill="var(--plot-fill, #ffffff)" stroke={active ? 'var(--color-accent, #2563eb)' : 'currentColor'} strokeWidth={active ? 3 : 1.5} strokeDasharray={connectFrom === node.id ? '6 3' : undefined} />
            <text x={10} y={16} fontSize={10} fill="currentColor" opacity={0.65} style={{ pointerEvents: 'none' }}>{NODE_KIND_LABELS[node.kind].toUpperCase()}</text>
            <text x={10} y={35} fontSize={14} fontWeight={700} fill="currentColor" style={{ pointerEvents: 'none' }}>{clip(node.label || NODE_KIND_LABELS[node.kind], 22)}</text>
            {sub && <text x={10} y={53} fontSize={10.5} fill="currentColor" opacity={0.8} style={{ pointerEvents: 'none' }}>{clip(sub, 30)}</text>}
          </g>
        )
      })}
    </svg>
  )
}
