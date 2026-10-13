import { LOAD_FILLS, obstacleFill, obstacleLetter } from './fills'
import type { CargoSpace, Placement } from './model'

type Props = { space: CargoSpace; placements?: Placement[] }

/**
 * Pohľad zhora na nákladný priestor: dvere vľavo, kabína vpravo, ľavá stena hore
 * (tak, ako ju má človek po ľavej ruke, keď sa pozerá dopredu). Prekážky sú šrafované,
 * každá má svoju farbu a písmeno (legenda je pod nákresom),
 * balíky na podlahe plné, balíky uložené na inom sú menšie s prerušovaným okrajom.
 * Čísla zodpovedajú poradiu v zozname pod nákresom.
 */
export function LoadDiagram({ space, placements = [] }: Props) {
  const pad = Math.max(space.length, space.width) * 0.02
  const font = Math.max(space.width * 0.09, 8)
  const pattern = `hatch-${space.id}`
  return (
    <svg
      viewBox={`${-pad} ${-pad} ${space.length + pad * 2} ${space.width + pad * 2}`}
      className="w-full rounded-lg border bg-white"
      role="img"
      aria-label={`Nákres nakladania: ${space.name}, pohľad zhora, kabína vpravo`}
    >
      <defs>
        <pattern id={pattern} width={font / 2} height={font / 2} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2={font / 2} stroke="#ffffff" strokeOpacity={0.45} strokeWidth={font / 8} />
        </pattern>
      </defs>
      {/* Súradnica x rastie od kabíny, ktorá je vpravo: celý obsah je preto zrkadlovo otočený. */}
      <g transform={`translate(${space.length} 0) scale(-1 1)`}>
      <rect x={0} y={0} width={space.length} height={space.width} fill="#fafafa" stroke="#171717" strokeWidth={pad / 2} />
      {space.obstacles.map((obstacle, index) => {
        const centerX = obstacle.x + obstacle.length / 2
        return (
          <g key={`obstacle-${index}`}>
            <title>{obstacle.label || 'Prekážka'}</title>
            <rect x={obstacle.x} y={obstacle.y} width={obstacle.length} height={obstacle.width} fill={obstacleFill(index)} />
            <rect
              x={obstacle.x}
              y={obstacle.y}
              width={obstacle.length}
              height={obstacle.width}
              fill={`url(#${pattern})`}
              stroke="#171717"
              strokeWidth={pad / 4}
            />
            <text
              x={centerX}
              y={obstacle.y + obstacle.width / 2}
              transform={`translate(${centerX * 2} 0) scale(-1 1)`}
              fontSize={Math.min(font * 0.8, obstacle.width * 0.8, obstacle.length * 0.5)}
              fontWeight="700"
              fill="#ffffff"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {obstacleLetter(index)}
            </text>
          </g>
        )
      })}
      {placements.map((placement, index) => {
        const stacked = placement.z > 0
        // Balík navrchu sa kreslí menší a v pravom dolnom rohu svojho pôdorysu,
        // aby ostalo vidno číslo toho pod ním (to je vľavo hore).
        const scale = stacked ? 0.62 : 1
        const width = placement.length * scale
        const height = placement.width * scale
        const left = placement.x + placement.length - width - (stacked ? pad : 0)
        const top = placement.y + placement.width - height - (stacked ? pad : 0)
        const size = Math.min(font, height * 0.6, width * 0.6)
        // Číslo spodného balíka je v rohu pri kabíne, aby ho ten navrchu nezakryl.
        const labelX = stacked ? left + width / 2 : placement.x + size * 0.7
        return (
          <g key={placement.id}>
            <rect
              x={left}
              y={top}
              width={width}
              height={height}
              fill={LOAD_FILLS[index % LOAD_FILLS.length]}
              fillOpacity={stacked ? 0.95 : 0.75}
              stroke="#171717"
              strokeWidth={pad / 4}
              strokeDasharray={stacked ? `${pad} ${pad / 2}` : undefined}
            >
              <title>
                {placement.name} · {placement.length} × {placement.width} × {placement.height} cm
              </title>
            </rect>
            <text
              x={labelX}
              transform={`translate(${labelX * 2} 0) scale(-1 1)`}
              y={stacked ? top + height / 2 : placement.y + size * 0.8}
              fontSize={size}
              fontWeight="700"
              fill="#171717"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {index + 1}
            </text>
          </g>
        )
      })}
      </g>
    </svg>
  )
}
