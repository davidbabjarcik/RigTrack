import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

/** Prepínač svetlého a tmavého režimu. Ukazuje ikonu režimu, do ktorého prepne. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const label = theme === 'dark' ? 'Prepnúť na svetlý režim' : 'Prepnúť na tmavý režim'
  const Icon = theme === 'dark' ? Sun : Moon
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground', className)}
    >
      <Icon className="size-5" aria-hidden />
    </button>
  )
}
