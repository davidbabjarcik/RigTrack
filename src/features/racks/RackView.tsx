import { cn } from '@/lib/utils'
import type { RackSlot } from './model'

const ROW = 28

/** Pohľad na rack (predok alebo zadok): mriežka U číslovaná zdola a osadené zariadenia v nej. */
export function RackView({ units, slots, side, labelOf, title }: { units: number; slots: RackSlot[]; side: 'front' | 'rear'; labelOf: (slot: RackSlot) => string; title: string }) {
  const shown = slots.filter((slot) => slot.side === side)
  const widthPart = (slot: RackSlot) => (slot.width === 'half' ? 1 / 2 : slot.width === 'third' ? 1 / 3 : 1)
  return (
    <figure className="flex flex-col gap-1">
      <figcaption className="text-sm font-medium">{title}</figcaption>
      <div className="flex rounded-lg border-4 border-neutral-700 bg-neutral-900 p-1 dark:border-neutral-600">
        {/* Čísla U (zdola). */}
        <ol className="flex w-7 shrink-0 flex-col-reverse text-right text-[10px] text-neutral-400" aria-hidden>
          {Array.from({ length: units }, (_, index) => (
            <li key={index} className="pr-1" style={{ height: ROW, lineHeight: `${ROW}px` }}>
              {index + 1}
            </li>
          ))}
        </ol>
        <div className="relative flex-1" style={{ height: units * ROW }}>
          {Array.from({ length: units }, (_, index) => (
            <div key={index} className="absolute inset-x-0 border-t border-neutral-800" style={{ bottom: index * ROW, height: ROW }} aria-hidden />
          ))}
          {shown.map((slot) => {
            const part = widthPart(slot)
            return (
              <div
                key={slot.id}
                title={labelOf(slot)}
                className={cn(
                  'absolute flex items-center overflow-hidden rounded-sm border px-2 text-xs font-medium',
                  slot.accessory ? 'border-neutral-600 bg-neutral-700 text-neutral-200' : 'border-neutral-400 bg-neutral-200 text-neutral-900',
                )}
                style={{
                  bottom: (slot.bottomU - 1) * ROW + 1,
                  height: slot.heightU * ROW - 2,
                  left: `calc(${slot.col * part * 100}% + 1px)`,
                  width: `calc(${part * 100}% - 2px)`,
                }}
              >
                <span className="truncate">{labelOf(slot)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </figure>
  )
}
