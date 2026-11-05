import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { RectEditor } from '@/components/plan/RectEditor'
import { Button } from '@/components/ui/button'
import { obstacleFill, obstacleLetter } from '@/features/loading/fills'
import type { CargoObstacle } from './model'
import { tx, tf } from '@/lib/i18n'

// Nová prekážka dostane túto výšku; pohľad zhora ju nakresliť nedovolí, upraví sa v poli.
const NEW_HEIGHT = 30
const finite = (value: number) => (Number.isFinite(value) ? value : 0)

type Props = {
  /** Vnútorná dĺžka a šírka nákladného priestoru v cm. */
  length: number
  width: number
  obstacles: CargoObstacle[]
  onChange: (index: number, obstacle: CargoObstacle) => void
  onAdd: (obstacle: CargoObstacle) => void
  onRemove: (index: number) => void
}

/**
 * Grafický editor prekážok v nákladnom priestore, pohľad zhora: dvere vľavo, kabína vpravo,
 * ľavá stena hore (rovnako ako nákres nakladania).
 */
export function CargoEditor({ length, width, obstacles, onChange, onAdd, onRemove }: Props) {
  const [selected, setSelected] = useState<number | null>(null)
  const chosen = selected !== null ? obstacles[selected] : undefined

  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
        <span>{tx('← dvere')}</span>
        <span>
          {length} × {width}{' '}{tx('cm, pohľad zhora, ľavá stena hore')}</span>
        <span>{tx('kabína →')}</span>
      </div>
      <RectEditor
        length={length}
        width={width}
        rects={obstacles}
        mirrored
        selected={selected}
        onSelect={setSelected}
        onChange={(index, rect) => onChange(index, { ...obstacles[index], ...rect })}
        onAdd={(rect) => onAdd({ label: '', height: NEW_HEIGHT, ...rect })}
        fillOf={obstacleFill}
        labelOf={obstacleLetter}
        describe={(rect) => tf('{0} × {1} cm · {2} cm od kabíny, {3} cm od ľavej steny', rect.length, rect.width, rect.x, rect.y)}
        ariaLabel={tx('Nákres nákladného priestoru; prekážky sa dajú zadať aj číslami v poliach formulára')}
        // Na celej obrazovke sa nákres zmestí na výšku a ostane miesto na ovládanie pod ním.
        className="max-h-[calc(100dvh-13rem)]"
        footer={
          chosen && selected !== null ? (
            <>
              <span>{tx('Vybraná prekážka')}{' '}{obstacleLetter(selected)}
                {chosen.label && `: ${chosen.label}`} · {finite(chosen.length)} × {finite(chosen.width)}{' '}{tx('cm')}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onRemove(selected)
                  setSelected(null)
                }}
              >
                <Trash2 className="size-4" aria-hidden />{tx('Odstrániť')}</Button>
            </>
          ) : (
            <span className="text-muted-foreground">{tx('Ťahaním po prázdnom mieste nakreslíte prekážku. Kliknutím ju vyberiete, ťahaním posuniete, za roh zmeníte veľkosť.')}</span>
          )
        }
      />
    </div>
  )
}
