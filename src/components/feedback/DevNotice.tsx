import { FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Upozornenie na časť aplikácie, ktorá je ešte vo vývoji a nemusí počítať úplne správne. */
export function DevNotice({ className }: { className?: string }) {
  return (
    <p className={cn('flex items-start gap-2 rounded-xl border border-violet-400/50 bg-violet-100/60 p-3 text-sm dark:bg-violet-950/40', className)}>
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-violet-600 dark:text-violet-300" aria-hidden />
      <span>
        <strong>Vo fáze vývoja.</strong> Nemusí to fungovať na 100 %, výsledok si pred použitím skontrolujte.
      </span>
    </p>
  )
}
