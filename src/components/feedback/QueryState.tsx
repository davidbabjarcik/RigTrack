import { LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function LoadingBlock() {
  return (
    <div role="status" className="flex justify-center py-16">
      <LoaderCircle className="size-7 animate-spin text-muted-foreground" aria-hidden />
      <span className="sr-only">Načítavam…</span>
    </div>
  )
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-surface px-6 py-12 text-center">
      <p>{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Skúsiť znova
        </Button>
      )}
    </div>
  )
}
