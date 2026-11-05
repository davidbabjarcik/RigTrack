import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { FIXED_PINNED, NAV_ITEMS, PINNED_COUNT } from '@/lib/navigation'
import { usePinnedNav } from '@/lib/usePinnedNav'
import { tx, tf } from '@/lib/i18n'

export function CustomizeMenuPage() {
  const { pinned, setPinned, reset } = usePinnedNav()

  // Lišta má vždy presne PINNED_COUNT vybraných položiek: nová nahradí najstaršiu vybranú.
  function toggle(id: string) {
    if (pinned.includes(id)) return
    setPinned([...pinned.slice(1), id])
  }
  const fixed = NAV_ITEMS.find((item) => item.id === FIXED_PINNED)!

  return (
    <>
      <PageHeader
        title={tx('Prispôsobiť lištu')}
        description={tf('Prvý je vždy {0}, k nemu vyberte {1} moduly. Nastavenie platí len na tomto zariadení.', fixed.label, PINNED_COUNT)}
        action={
          <Button variant="outline" size="sm" onClick={reset}>{tx('Obnoviť')}</Button>
        }
      />
      <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
        {NAV_ITEMS.filter((item) => item.id !== FIXED_PINNED).map((item) => {
          const checked = pinned.includes(item.id)
          return (
            <li key={item.id}>
              <label className="flex min-h-14 cursor-pointer items-center gap-3 px-4 hover:bg-muted">
                <item.icon className="size-5 text-muted-foreground" aria-hidden />
                <span className="flex-1 font-medium">{tx(item.label)}</span>
                <input
                  type="checkbox"
                  className="size-5 accent-(--accent)"
                  checked={checked}
                  disabled={checked}
                  onChange={() => toggle(item.id)}
                />
              </label>
            </li>
          )
        })}
      </ul>
    </>
  )
}
