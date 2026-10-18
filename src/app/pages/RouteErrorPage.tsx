import { Button } from '@/components/ui/button'

/** Záchranná obrazovka, keď niektorá stránka spadne alebo sa nepodarí stiahnuť jej kód. */
export function RouteErrorPage() {
  return (
    <div role="alert" className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-xl font-semibold">Niečo sa pokazilo</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Stránku sa nepodarilo zobraziť. Obnovenie zvyčajne pomôže; ak nie, skúste to o chvíľu znova.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => window.location.reload()}>Obnoviť stránku</Button>
        <Button variant="outline" onClick={() => window.location.assign(import.meta.env.BASE_URL)}>
          Na prehľad
        </Button>
      </div>
    </div>
  )
}
