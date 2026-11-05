import { useQuery } from '@tanstack/react-query'
import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { tx } from '@/lib/i18n'

/** QR kód z textu (knižnica sa stiahne až pri prvom zobrazení). */
export function QrCode({ text, label, className, style }: { text: string; label: string; className?: string; style?: CSSProperties }) {
  const image = useQuery({
    queryKey: ['qr', text],
    queryFn: async () => {
      const { toDataURL } = await import('qrcode')
      return toDataURL(text, { margin: 2, width: 512, errorCorrectionLevel: 'M' })
    },
    staleTime: Infinity,
  })
  if (image.isError) return <p className="text-sm text-destructive">{tx('QR kód sa nepodarilo vytvoriť.')}</p>
  if (!image.data) return <div className={cn('aspect-square animate-pulse rounded-lg bg-muted', className)} style={style} />
  return <img src={image.data} alt={label} className={cn('aspect-square rounded-lg bg-white', className)} style={style} />
}
