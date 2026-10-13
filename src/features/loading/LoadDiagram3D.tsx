import { LOAD_FILLS, obstacleFill, obstacleLetter } from './fills'
import { paintOrder, project, toView, VIEW_NAMES, type ViewBox3 } from './isometric'
import type { CargoSpace, Placement } from './model'

type Props = { space: CargoSpace; placements: Placement[]; turns: number }

const points = (corners: { x: number; y: number }[]) => corners.map((corner) => `${corner.x},${corner.y}`).join(' ')

/** Tri viditeľné steny kvádra: vrch a dve bočné steny otočené k pozorovateľovi. */
function faces(box: ViewBox3) {
  const { a, b, z, la, lb, h } = box
  const p = (da: number, db: number, dz: number) => project(a + da, b + db, z + dz)
  return {
    top: [p(0, 0, h), p(la, 0, h), p(la, lb, h), p(0, lb, h)],
    sideA: [p(la, 0, 0), p(la, lb, 0), p(la, lb, h), p(la, 0, h)],
    sideB: [p(0, lb, 0), p(la, lb, 0), p(la, lb, h), p(0, lb, h)],
    center: p(la / 2, lb / 2, h),
  }
}

/**
 * Priestorový (izometrický) pohľad na naložené vozidlo. Čísla a farby sú rovnaké
 * ako v pohľade zhora a v zozname. Prekážky sú tmavšie kvádre s písmenom; ich názvy sú v legende.
 * Oranžový rám je čelo pri kabíne, modrý sú zadné dvere.
 */
export function LoadDiagram3D({ space, placements, turns }: Props) {
  const sizeA = turns % 2 === 0 ? space.length : space.width
  const sizeB = turns % 2 === 0 ? space.width : space.length
  const corner = (a: number, b: number, z: number) => project(a * sizeA, b * sizeB, z * space.height)

  const outline = [0, 1].flatMap((a) => [0, 1].flatMap((b) => [0, 1].map((z) => corner(a, b, z))))
  const minX = Math.min(...outline.map((point) => point.x))
  const maxX = Math.max(...outline.map((point) => point.x))
  const minY = Math.min(...outline.map((point) => point.y))
  const maxY = Math.max(...outline.map((point) => point.y))
  const pad = (maxX - minX) * 0.03
  const line = (maxX - minX) / 320
  const font = (maxX - minX) / 26

  const solids = [
    ...space.obstacles.map((obstacle, index) => ({ kind: 'obstacle' as const, label: obstacle.label || 'Prekážka', number: index, view: toView(obstacle, space.length, space.width, turns) })),
    ...placements.map((placement, index) => ({ kind: 'load' as const, label: placement.name, number: index + 1, view: toView(placement, space.length, space.width, turns) })),
  ]
  const order = paintOrder(solids.map((solid) => solid.view))

  // Čelá priestoru: kabína je na x = 0, zadné dvere na x = dĺžka. Kde sú na obrazovke, závisí od otočenia.
  const at = (x: number, y: number, z: number) => {
    const view = toView({ x, y, z, length: 0, width: 0, height: 0 }, space.length, space.width, turns)
    return project(view.a, view.b, view.z)
  }
  const endOf = (x: number) => [at(x, 0, 0), at(x, space.width, 0), at(x, space.width, space.height), at(x, 0, space.height)]
  const ends = [
    { label: 'KABÍNA', color: '#b45309', frame: endOf(0), far: turns % 4 === 0 || turns % 4 === 3 },
    { label: 'DVERE', color: '#1d4ed8', frame: endOf(space.length), far: turns % 4 === 1 || turns % 4 === 2 },
  ]

  return (
    <svg
      // Hore je miesto navyše na popisy „KABÍNA“ a „DVERE“ nad hranami stropu.
      viewBox={`${minX - pad} ${minY - pad - font * 1.6} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2 + font * 1.6}`}
      className="max-h-[70dvh] w-full rounded-lg border bg-white"
      role="img"
      aria-label={`Priestorový nákres nakladania: ${space.name}, pohľad ${VIEW_NAMES[turns % 4]}`}
    >
      {/* Podlaha a dve zadné steny; predné ostávajú otvorené, aby bolo vidno dnu. */}
      <polygon points={points([corner(0, 0, 0), corner(1, 0, 0), corner(1, 1, 0), corner(0, 1, 0)])} fill="#f5f5f5" stroke="#171717" strokeWidth={line * 1.5} />
      <polygon points={points([corner(0, 0, 0), corner(1, 0, 0), corner(1, 0, 1), corner(0, 0, 1)])} fill="#fafafa" stroke="#a3a3a3" strokeWidth={line} />
      <polygon points={points([corner(0, 0, 0), corner(0, 1, 0), corner(0, 1, 1), corner(0, 0, 1)])} fill="#fafafa" stroke="#a3a3a3" strokeWidth={line} />

      {/* Čelo v pozadí je podfarbené, aby bolo hneď vidno, či sa pozeráme ku kabíne alebo k dverám. */}
      {ends
        .filter((end) => end.far)
        .map((end) => (
          <polygon key={end.label} points={points(end.frame)} fill={end.color} fillOpacity={0.12} stroke="none" />
        ))}

      {order.map((index) => {
        const solid = solids[index]
        const shape = faces(solid.view)
        const fill = solid.kind === 'obstacle' ? obstacleFill(solid.number) : LOAD_FILLS[(solid.number - 1) % LOAD_FILLS.length]
        const size = Math.min(font, solid.view.la * 0.45, solid.view.lb * 0.45)
        return (
          <g key={`${solid.kind}-${index}`} stroke="#171717" strokeWidth={line} strokeLinejoin="round">
            <title>{solid.label}</title>
            <polygon points={points(shape.sideA)} fill={fill} />
            <polygon points={points(shape.sideA)} fill="#000000" fillOpacity={0.18} stroke="none" />
            <polygon points={points(shape.sideB)} fill={fill} />
            <polygon points={points(shape.sideB)} fill="#000000" fillOpacity={0.32} stroke="none" />
            <polygon points={points(shape.top)} fill={fill} />
            <text
                x={shape.center.x}
                y={shape.center.y}
                fontSize={size}
                fontWeight="700"
                fill={solid.kind === 'obstacle' ? '#ffffff' : '#171717'}
                stroke="none"
                textAnchor="middle"
                dominantBaseline="central"
              >
                {solid.kind === 'obstacle' ? obstacleLetter(solid.number) : solid.number}
              </text>
          </g>
        )
      })}

      {/* Obrys stropu naznačí, koľko miesta ostáva do výšky. */}
      <polygon
        points={points([corner(0, 0, 1), corner(1, 0, 1), corner(1, 1, 1), corner(0, 1, 1)])}
        fill="none"
        stroke="#a3a3a3"
        strokeWidth={line}
        strokeDasharray={`${line * 5} ${line * 4}`}
      />

      {/* Rámy čiel a ich popisy idú navrch, aby ich náklad nezakryl. */}
      {ends.map((end) => {
        const [, , topB, topA] = end.frame
        return (
          <g key={end.label}>
            <polygon points={points(end.frame)} fill="none" stroke={end.color} strokeWidth={line * 2.5} strokeLinejoin="round" />
            <text
              x={(topA.x + topB.x) / 2}
              y={Math.min(topA.y, topB.y) - font * 0.25}
              fontSize={font}
              fontWeight="700"
              letterSpacing={font * 0.06}
              fill={end.color}
              stroke="#ffffff"
              strokeWidth={line * 3}
              paintOrder="stroke"
              textAnchor="middle"
            >
              {end.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
