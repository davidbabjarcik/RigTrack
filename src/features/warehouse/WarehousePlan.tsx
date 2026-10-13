import { SPOT_KIND_FILLS, type Spot, type Warehouse } from './model'

type Props = {
  warehouse: Warehouse
  spots: Spot[]
  /** Počet cases na každom mieste. */
  counts: Map<string, number>
  selectedId: string | null
  /** Miesta, kde leží hľadaný case. */
  highlighted: Set<string>
  onSelect: (id: string | null) => void
}

/** Pôdorys skladu, pohľad zhora. Mriežka má štvorce po 1 m; kliknutím sa vyberie miesto. */
export function WarehousePlan({ warehouse, spots, counts, selectedId, highlighted, onSelect }: Props) {
  const { lengthCm, widthCm } = warehouse
  const pad = Math.max(lengthCm, widthCm) * 0.015
  const font = Math.min(lengthCm, widthCm) * 0.045
  return (
    <svg
      viewBox={`${-pad} ${-pad} ${lengthCm + pad * 2} ${widthCm + pad * 2}`}
      className="max-h-[70dvh] w-full rounded-lg border bg-white select-none"
      role="group"
      aria-label="Plán skladu, pohľad zhora"
    >
      <defs>
        <pattern id="warehouse-grid" width={100} height={100} patternUnits="userSpaceOnUse">
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#e5e5e5" strokeWidth={pad / 5} />
        </pattern>
      </defs>
      <rect x={0} y={0} width={lengthCm} height={widthCm} fill="url(#warehouse-grid)" stroke="#171717" strokeWidth={pad / 2} onClick={() => onSelect(null)} />
      {spots.map((spot) => {
        const active = spot.id === selectedId
        const hit = highlighted.has(spot.id)
        const count = counts.get(spot.id) ?? 0
        const size = Math.min(font, spot.width * 0.32, (spot.length / Math.max(spot.name.length, 4)) * 1.5)
        return (
          <g
            key={spot.id}
            role="button"
            tabIndex={0}
            aria-pressed={active}
            aria-label={`${spot.name}, cases: ${count}`}
            className="cursor-pointer outline-none focus-visible:[&>rect]:stroke-[#f97316]"
            onClick={() => onSelect(active ? null : spot.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect(active ? null : spot.id)
              }
            }}
          >
            <rect
              x={spot.x}
              y={spot.y}
              width={spot.length}
              height={spot.width}
              rx={pad / 2}
              fill={SPOT_KIND_FILLS[spot.kind]}
              fillOpacity={count === 0 ? 0.45 : 0.85}
              stroke={active || hit ? '#f97316' : '#171717'}
              strokeWidth={active || hit ? pad : pad / 4}
            />
            <text
              x={spot.x + spot.length / 2}
              y={spot.y + spot.width / 2 - size * 0.45}
              fontSize={size}
              fontWeight="700"
              fill="#ffffff"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {spot.name}
            </text>
            <text
              x={spot.x + spot.length / 2}
              y={spot.y + spot.width / 2 + size * 0.75}
              fontSize={size * 0.8}
              fill="#ffffff"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {count === 0 ? 'prázdne' : `${count} ${count === 1 ? 'case' : 'cases'}`}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
