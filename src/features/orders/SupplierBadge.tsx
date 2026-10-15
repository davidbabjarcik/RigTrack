import { cn } from '@/lib/utils'
import type { OrderSource } from './model'

type Props = { supplier: string; source?: OrderSource; className?: string }

/**
 * Značka dodávateľa do zoznamov: Thomann má svoje tyrkysové „t“, ostatní začiatočné písmeno.
 * Nákup z bazáru má jantárové pozadie, aby bol v zozname hneď vidieť.
 * Je to kreslená značka, nie oficiálny súbor loga.
 */
export function SupplierBadge({ supplier, source = 'shop', className }: Props) {
  const thomann = source === 'shop' && /thomann/i.test(supplier)
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-12 shrink-0 items-center justify-center rounded-lg border text-xl font-bold',
        thomann
          ? 'border-transparent bg-[#00a3a6] font-serif text-3xl leading-none text-white lowercase'
          : source === 'marketplace'
            ? 'border-amber-300 bg-amber-100 text-amber-800 uppercase dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200'
            : 'bg-muted text-muted-foreground uppercase',
        className,
      )}
    >
      {thomann ? 't' : supplier.trim().charAt(0) || '?'}
    </span>
  )
}
