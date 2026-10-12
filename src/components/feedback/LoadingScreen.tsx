import { LoaderCircle } from 'lucide-react'

export function LoadingScreen() {
  return (
    <div role="status" className="flex min-h-dvh items-center justify-center">
      <LoaderCircle className="size-8 animate-spin text-muted-foreground" aria-hidden />
      <span className="sr-only">Načítavam…</span>
    </div>
  )
}
