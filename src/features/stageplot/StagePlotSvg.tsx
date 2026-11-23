import type { PointerEvent as ReactPointerEvent, Ref } from 'react'
import { itemText, KIND_INFO, type StageItem } from './model'

export const PLOT_MARGIN = 1.2

type Props = {
  widthM: number
  depthM: number
  items: StageItem[]
  channelName: (channel: number) => string | undefined
  selectedId?: string | null
  onItemPointerDown?: (id: string, event: ReactPointerEvent<SVGGElement>) => void
  onBackgroundPointerDown?: () => void
  svgRef?: Ref<SVGSVGElement>
  className?: string
  title?: string
}

function Shape({ item, selected }: { item: StageItem; selected: boolean }) {
  const info = KIND_INFO[item.kind]
  const stroke = selected ? 'var(--color-accent, #2563eb)' : 'currentColor'
  const width = selected ? 0.06 : 0.03
  const common = { stroke, strokeWidth: width, fill: 'var(--plot-fill, #ffffff)' }
  const { w, d } = item
  if (info.shape === 'round') return <ellipse rx={w / 2} ry={d / 2} {...common} />
  if (info.shape === 'wedge') return <polygon points={`${-w / 2},${-d / 2} ${w / 2},${-d / 2} ${(w / 2) * 0.7},${d / 2} ${(-w / 2) * 0.7},${d / 2}`} {...common} />
  if (info.shape === 'hatch') return <rect x={-w / 2} y={-d / 2} width={w} height={d} {...common} fill="url(#plot-hatch)" />
  if (info.shape === 'text') return <rect x={-w / 2} y={-d / 2} width={w} height={d} fill="transparent" stroke={selected ? stroke : 'none'} strokeWidth={width} strokeDasharray="0.08 0.06" />
  return <rect x={-w / 2} y={-d / 2} width={w} height={d} {...common} />
}

/**
 * Stage plán ako SVG v metroch (mierka sa prispôsobí šírke). Bez prihlásenia aj na zdieľanej stránke – len vykreslenie,
 * ťahanie rieši editor cez onItemPointerDown. Čiernobielo čitateľné (rizer šrafovaný).
 */
export function StagePlotSvg({ widthM, depthM, items, channelName, selectedId, onItemPointerDown, onBackgroundPointerDown, svgRef, className, title }: Props) {
  const m = PLOT_MARGIN
  // Riser a bicie najprv (sú pod ostatným), popisy navrch.
  const order = (item: StageItem) => (item.kind === 'riser' ? 0 : item.kind === 'drums' ? 1 : item.kind === 'label' ? 3 : 2)
  const sorted = [...items].sort((a, b) => order(a) - order(b))
  return (
    <svg
      ref={svgRef}
      viewBox={`${-m} ${-m} ${widthM + 2 * m} ${depthM + 2 * m}`}
      className={className}
      role="img"
      aria-label={title ?? 'Stage plán'}
      style={{ touchAction: onItemPointerDown ? 'none' : undefined }}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget || (event.target as Element).getAttribute('data-bg') === '1') onBackgroundPointerDown?.()
      }}
    >
      <defs>
        <pattern id="plot-hatch" width="0.25" height="0.25" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="0.25" height="0.25" fill="var(--plot-fill, #ffffff)" />
          <line x1="0" y1="0" x2="0" y2="0.25" stroke="currentColor" strokeWidth="0.03" opacity="0.5" />
        </pattern>
      </defs>
      <rect data-bg="1" x={0} y={0} width={widthM} height={depthM} fill="var(--plot-stage, #f8fafc)" stroke="currentColor" strokeWidth={0.08} />
      {Array.from({ length: Math.floor(widthM) - (Number.isInteger(widthM) ? 1 : 0) }, (_, index) => (
        <line key={`x${index}`} data-bg="1" x1={index + 1} y1={0} x2={index + 1} y2={depthM} stroke="currentColor" strokeWidth={0.01} opacity={0.25} />
      ))}
      {Array.from({ length: Math.floor(depthM) - (Number.isInteger(depthM) ? 1 : 0) }, (_, index) => (
        <line key={`y${index}`} data-bg="1" x1={0} y1={index + 1} x2={widthM} y2={index + 1} stroke="currentColor" strokeWidth={0.01} opacity={0.25} />
      ))}
      <text x={widthM / 2} y={-0.35} fontSize={0.3} textAnchor="middle" fill="currentColor" opacity={0.7}>
        {`${widthM.toLocaleString('sk-SK')} m · zadná stena`}
      </text>
      <text x={widthM / 2} y={depthM + 0.75} fontSize={0.38} fontWeight={700} textAnchor="middle" fill="currentColor" letterSpacing={0.1}>
        PUBLIKUM
      </text>
      <text x={-0.35} y={depthM / 2} fontSize={0.3} textAnchor="middle" fill="currentColor" opacity={0.7} transform={`rotate(-90 ${-0.35} ${depthM / 2})`}>
        {`${depthM.toLocaleString('sk-SK')} m`}
      </text>
      {sorted.map((item) => {
        const text = itemText(item, channelName)
        const size = Math.max(0.18, Math.min(0.26, item.d * 0.42, (item.w / Math.max(3, text.main.length)) * 1.7))
        return (
          <g key={item.id} data-item={item.id} onPointerDown={onItemPointerDown ? (event) => onItemPointerDown(item.id, event) : undefined} style={{ cursor: onItemPointerDown ? 'grab' : undefined }}>
            <g transform={`translate(${item.x} ${item.y}) rotate(${item.rot})`}>
              <Shape item={item} selected={item.id === selectedId} />
            </g>
            <text x={item.x} y={item.y + (text.channel ? -size * 0.15 : size * 0.35)} fontSize={size} fontWeight={600} textAnchor="middle" fill="currentColor" style={{ pointerEvents: 'none' }}>
              {text.main}
            </text>
            {text.channel && (
              <text x={item.x} y={item.y + size * 0.95} fontSize={size * 0.8} textAnchor="middle" fill="currentColor" opacity={0.8} style={{ pointerEvents: 'none' }}>
                {text.channel}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
