import { tx } from '@/lib/i18n'
import type { WheelPlace } from '@/lib/dimensions'

/**
 * Obrázok, ako merať: case (alebo repro) spredu zboku so šípkami Šírka, Hĺbka a Výška.
 * Guľové rohy a kolieska sa nakreslia, aby bolo jasné, že patria do rozmeru.
 */
export function DimensionsPicture({ kind = 'case', wheels = 'none', className }: { kind?: 'case' | 'speaker'; wheels?: WheelPlace; className?: string }) {
  // Kváder v jednoduchej perspektíve: predná stena a posunutá zadná hrana.
  const front = { x: 90, y: 50, w: 150, h: 120 }
  const shift = { x: 50, y: -32 }
  const gap = wheels === 'bottom' ? 16 : 0
  const y0 = front.y
  const y1 = front.y + front.h
  const corners = [
    [front.x, y0],
    [front.x + front.w, y0],
    [front.x, y1],
    [front.x + front.w, y1],
    [front.x + shift.x, y0 + shift.y],
    [front.x + front.w + shift.x, y0 + shift.y],
    [front.x + front.w + shift.x, y1 + shift.y],
  ]
  return (
    <svg viewBox="0 0 330 236" role="img" aria-label={tx('Ako merať: šírka zľava doprava, hĺbka spredu dozadu, výška od zeme hore')} className={className}>
      <defs>
        <marker id="dim-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
        </marker>
      </defs>
      {/* zem */}
      <line x1="20" y1={y1 + gap + 2} x2="320" y2={y1 + gap + 2} className="stroke-muted-foreground/40" strokeWidth="1.5" strokeDasharray="4 4" />
      {/* bok a vrch */}
      <path
        d={`M${front.x} ${y0} L${front.x + shift.x} ${y0 + shift.y} L${front.x + front.w + shift.x} ${y0 + shift.y} L${front.x + front.w} ${y0} Z`}
        className="fill-muted stroke-foreground/70"
        strokeWidth="1.5"
      />
      <path
        d={`M${front.x + front.w} ${y0} L${front.x + front.w + shift.x} ${y0 + shift.y} L${front.x + front.w + shift.x} ${y1 + shift.y} L${front.x + front.w} ${y1} Z`}
        className="fill-muted/60 stroke-foreground/70"
        strokeWidth="1.5"
      />
      {/* predná stena */}
      <rect x={front.x} y={y0} width={front.w} height={front.h} className="fill-surface stroke-foreground/70" strokeWidth="1.5" rx="2" />
      {kind === 'speaker' ? (
        <>
          <circle cx={front.x + front.w / 2} cy={y0 + 72} r="34" className="fill-none stroke-foreground/50" strokeWidth="1.5" />
          <circle cx={front.x + front.w / 2} cy={y0 + 72} r="10" className="fill-foreground/20" />
          <rect x={front.x + front.w / 2 - 18} y={y0 + 14} width="36" height="14" rx="3" className="fill-none stroke-foreground/50" strokeWidth="1.5" />
        </>
      ) : (
        <>
          {/* zámky a rukoväť */}
          <rect x={front.x + 20} y={y0 + 30} width="16" height="10" rx="2" className="fill-foreground/25" />
          <rect x={front.x + front.w - 36} y={y0 + 30} width="16" height="10" rx="2" className="fill-foreground/25" />
          <rect x={front.x + front.w / 2 - 22} y={y0 + 70} width="44" height="12" rx="6" className="fill-none stroke-foreground/50" strokeWidth="1.5" />
          {/* guľové rohy */}
          {corners.map(([cx, cy], index) => (
            <circle key={index} cx={cx} cy={cy} r="6" className="fill-amber-500 stroke-amber-700" strokeWidth="1" />
          ))}
        </>
      )}
      {wheels === 'bottom' && (
        <>
          <circle cx={front.x + 22} cy={y1 + 8} r="8" className="fill-foreground/70" />
          <circle cx={front.x + front.w - 22} cy={y1 + 8} r="8" className="fill-foreground/70" />
        </>
      )}
      {wheels === 'back' && (
        <>
          <circle cx={front.x + front.w + shift.x - 10} cy={y1 + shift.y - 4} r="9" className="fill-foreground/70" />
          <circle cx={front.x + shift.x + 12} cy={y1 + shift.y - 4} r="9" className="fill-foreground/40" />
        </>
      )}
      {wheels === 'side' && <circle cx={front.x + front.w + shift.x / 2} cy={y1 + shift.y / 2 - 6} r="9" className="fill-foreground/70" />}

      {/* Šírka – pod prednou stenou */}
      <g className="text-sky-600 dark:text-sky-400">
        <line x1={front.x - 6} y1={y1 + gap + 18} x2={front.x + front.w + 6} y2={y1 + gap + 18} stroke="currentColor" strokeWidth="2" markerStart="url(#dim-arrow)" markerEnd="url(#dim-arrow)" />
        <text x={front.x + front.w / 2} y={y1 + gap + 36} textAnchor="middle" fill="currentColor" fontSize="15" fontWeight="600">{tx('Šírka')}</text>
      </g>
      {/* Hĺbka – pozdĺž spodnej bočnej hrany */}
      <g className="text-emerald-600 dark:text-emerald-400">
        <line
          x1={front.x + front.w + 10}
          y1={y1 + 8}
          x2={front.x + front.w + shift.x + 10}
          y2={y1 + shift.y + 8}
          stroke="currentColor"
          strokeWidth="2"
          markerStart="url(#dim-arrow)"
          markerEnd="url(#dim-arrow)"
        />
        <text x={front.x + front.w + shift.x / 2 + 4} y={y1 + 30} fill="currentColor" fontSize="15" fontWeight="600">{tx('Hĺbka')}</text>
      </g>
      {/* Výška – vľavo, od zeme po vrch */}
      <g className="text-rose-600 dark:text-rose-400">
        <line x1={front.x - 20} y1={y0 - 6} x2={front.x - 20} y2={y1 + gap + 2} stroke="currentColor" strokeWidth="2" markerStart="url(#dim-arrow)" markerEnd="url(#dim-arrow)" />
        <text x={front.x - 26} y={(y0 + y1) / 2} textAnchor="end" fill="currentColor" fontSize="15" fontWeight="600">{tx('Výška')}</text>
      </g>
    </svg>
  )
}
