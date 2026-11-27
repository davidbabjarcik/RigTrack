import { faceShapes, type FaceInput } from './faces'
import { ROW_PX } from './gridUtils'

/** Kresba predného / zadného panela prístroja v slote mriežky (SVG pod popisom). */
export function DeviceFace(props: FaceInput) {
  const U = Math.max(1, props.heightU)
  const perU = (U * ROW_PX - 2) / U
  const pct = (value: number) => `${value * 100}%`
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      {faceShapes(props).map((shape, index) =>
        shape.t === 'rect' ? (
          <rect key={index} x={pct(shape.x)} y={shape.y * perU} width={pct(shape.w)} height={shape.h * perU} rx={shape.rx} fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.stroke ? 1 : 0} />
        ) : shape.t === 'circle' ? (
          <circle key={index} cx={pct(shape.x)} cy={shape.y * perU} r={shape.r * perU} fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.stroke ? 1 : 0} />
        ) : (
          <line key={index} x1={pct(shape.x1)} y1={shape.y1 * perU} x2={pct(shape.x2)} y2={shape.y2 * perU} stroke={shape.stroke} strokeWidth={shape.width ?? 1} />
        ),
      )}
    </svg>
  )
}
