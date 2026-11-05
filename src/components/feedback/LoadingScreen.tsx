import { LoaderCircle } from 'lucide-react'
import { tx } from '@/lib/i18n'

export function LoadingScreen() {
  return (
    <div role="status" className="flex min-h-dvh items-center justify-center">
      <LoaderCircle className="size-8 animate-spin text-muted-foreground" aria-hidden />
      <span className="sr-only">{tx('Načítavam…')}</span>
    </div>
  )
}
