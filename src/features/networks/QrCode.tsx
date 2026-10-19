import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

/** QR kód z textu (knižnica sa stiahne až pri prvom zobrazení). */
export function QrCode({ text, label, className }: { text: string; label: string; className?: string }) {
  const image = useQuery({
    queryKey: ['qr', text],
    queryFn: async () => {
      const { toDataURL } = await import('qrcode')
      return toDataURL(text, { margin: 2, width: 512, errorCorrectionLevel: 'M' })
    },
    staleTime: Infinity,
  })
  if (image.isError) return <p className="text-sm text-destructive">QR kód sa nepodarilo vytvoriť.</p>
  if (!image.data) return <div className={cn('aspect-square animate-pulse rounded-lg bg-muted', className)} />
  return <img src={image.data} alt={label} className={cn('aspect-square rounded-lg bg-white', className)} />
}
