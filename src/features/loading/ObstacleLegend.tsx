import { obstacleFill, obstacleLetter } from './fills'
import { tx } from '@/lib/i18n'

type Props = { obstacles: { label: string; length: number; width: number; height: number }[] }

/** Legenda prekážok k nákresu: farba, písmeno, názov a rozmery. */
export function ObstacleLegend({ obstacles }: Props) {
  if (obstacles.length === 0) return null
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label={tx('Legenda prekážok')}>
      {obstacles.map((obstacle, index) => (
        <li key={index} className="flex items-center gap-1.5">
          <span
            className="inline-flex size-5 shrink-0 items-center justify-center rounded text-[11px] font-bold text-white"
            style={{ backgroundColor: obstacleFill(index) }}
          >
            {obstacleLetter(index)}
          </span>
          <span>
            {obstacle.label || tx('Prekážka')}
            <span className="text-muted-foreground">
              {' '}
              · {obstacle.length} × {obstacle.width} × {obstacle.height}{' '}{tx('cm')}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
