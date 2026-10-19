import type { Placement } from './processor'

const COLORS = ['#0ea5e9', '#f97316', '#22c55e', '#a855f7', '#eab308', '#ef4444']

/** Ako sú steny poukladané vo vstupných obrazoch procesora (napr. HDMI 1 a HDMI 2 vo Full HD). */
export function CanvasDiagram({ placements, canvases, inputW, inputH, walls }: { placements: Placement[]; canvases: number; inputW: number; inputH: number; walls: string[] }) {
  const scale = 300 / inputW
  return (
    <div className="flex flex-wrap gap-3">
      {Array.from({ length: canvases }, (_, canvas) => {
        const inside = placements.filter((place) => place.canvas === canvas || (place.canvas < canvas && place.canvas + place.tilesX * place.tilesY > canvas))
        return (
          <figure key={canvas} className="flex flex-col gap-1">
            <svg viewBox={`0 0 ${inputW * scale} ${inputH * scale}`} width={inputW * scale} className="max-w-full rounded border bg-slate-900" role="img" aria-label={`Vstup ${canvas + 1}`}>
              {inside.map((place) => {
                const color = COLORS[walls.indexOf(place.wall) % COLORS.length]
                const tiled = place.tilesX * place.tilesY > 1
                return (
                  <g key={place.wall}>
                    <rect
                      x={tiled ? 0 : place.x * scale}
                      y={tiled ? 0 : place.y * scale}
                      width={tiled ? inputW * scale : place.w * scale}
                      height={tiled ? inputH * scale : place.h * scale}
                      fill={color}
                      fillOpacity={0.35}
                      stroke={color}
                      strokeWidth={2}
                    />
                    <text x={(tiled ? 0 : place.x * scale) + 6} y={(tiled ? 0 : place.y * scale) + 16} fill="#ffffff" fontSize={12} fontFamily="sans-serif">
                      {place.wall} {tiled ? `(časť ${canvas - place.canvas + 1}/${place.tilesX * place.tilesY})` : `${place.w}×${place.h}`}
                    </text>
                  </g>
                )
              })}
            </svg>
            <figcaption className="text-xs text-muted-foreground">
              Vstup {canvas + 1} ({inputW}×{inputH})
            </figcaption>
          </figure>
        )
      })}
    </div>
  )
}
