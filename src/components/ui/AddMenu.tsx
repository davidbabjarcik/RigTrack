import { ChevronDown, Plus, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from './button'

export type AddMenuItem = { to: string; label: string; icon: LucideIcon }

/** Tlačidlo „Pridať“ s ponukou viacerých možností (napr. technika, sada káblov, kapsule). */
export function AddMenu({ items, label = 'Pridať' }: { items: AddMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])
  return (
    <div ref={root} className="relative">
      <Button aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Plus className="size-4" aria-hidden />
        {label}
        <ChevronDown className="size-4" aria-hidden />
      </Button>
      {open && (
        <ul role="menu" className="absolute right-0 z-20 mt-1 min-w-48 overflow-hidden rounded-xl border bg-surface py-1 shadow-lg">
          {items.map((item) => (
            <li key={item.to} role="none">
              <Link role="menuitem" to={item.to} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted" onClick={() => setOpen(false)}>
                <item.icon className="size-4 text-muted-foreground" aria-hidden />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
