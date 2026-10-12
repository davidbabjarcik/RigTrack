import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { NAV_ITEMS, PINNED_COUNT } from '@/lib/navigation'
import { usePinnedNav } from '@/lib/usePinnedNav'

export function CustomizeMenuPage() {
  const { pinned, setPinned, reset } = usePinnedNav()

  // Lišta má vždy presne PINNED_COUNT položiek: nová položka nahradí najstaršiu vybranú.
  function toggle(id: string) {
    if (pinned.includes(id)) return
    setPinned([...pinned.slice(1), id])
  }

  return (
    <>
      <PageHeader
        title="Prispôsobiť lištu"
        description={`Vyberte ${PINNED_COUNT} moduly pre spodnú lištu. Nastavenie platí len na tomto zariadení.`}
        action={
          <Button variant="outline" size="sm" onClick={reset}>
            Obnoviť
          </Button>
        }
      />
      <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
        {NAV_ITEMS.map((item) => {
          const checked = pinned.includes(item.id)
          return (
            <li key={item.id}>
              <label className="flex min-h-14 cursor-pointer items-center gap-3 px-4 hover:bg-muted">
                <item.icon className="size-5 text-muted-foreground" aria-hidden />
                <span className="flex-1 font-medium">{item.label}</span>
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
