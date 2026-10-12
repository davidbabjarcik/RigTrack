import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  /** Adresa náhľadu; bez nej sa zobrazí značka „bez fotky“. */
  url: string | undefined
  className?: string
}

/** Malý štvorcový náhľad fotky techniky do zoznamov. */
export function PhotoThumb({ url, className }: Props) {
  return (
    <span
      className={cn(
        'flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-white',
        !url && 'bg-muted',
        className,
      )}
    >
      {url ? (
        // Dekoratívny obrázok: názov techniky stojí hneď vedľa.
        <img src={url} alt="" loading="lazy" decoding="async" className="size-full object-contain" />
      ) : (
        <ImageOff className="size-5 text-muted-foreground/60" aria-label="Bez fotky" />
      )}
    </span>
  )
}
