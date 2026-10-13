import { cn } from '@/lib/utils'

type Props = { supplier: string; className?: string }

/**
 * Značka dodávateľa do zoznamov: Thomann má svoje tyrkysové „t“, ostatní začiatočné písmeno.
 * Je to kreslená značka, nie oficiálny súbor loga.
 */
export function SupplierBadge({ supplier, className }: Props) {
  const thomann = /thomann/i.test(supplier)
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-12 shrink-0 items-center justify-center rounded-lg border text-xl font-bold',
        thomann ? 'border-transparent bg-[#00a3a6] font-serif text-3xl leading-none text-white lowercase' : 'bg-muted text-muted-foreground uppercase',
        className,
      )}
    >
      {thomann ? 't' : supplier.trim().charAt(0) || '?'}
    </span>
  )
}
