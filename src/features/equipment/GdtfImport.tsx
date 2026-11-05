import { FileUp } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { tf, tx } from '@/lib/i18n'
import { readGdtf, type GdtfFixture } from './gdtf'

/** „Nahrať GDTF súbor“ pri svetle – vyplní výrobcu, model, DMX módy, príkon, váhu a zdroj svetla. */
export function GdtfImport({ onFixture }: { onFixture: (fixture: GdtfFixture) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null)

  async function load(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setMessage(null)
    try {
      const fixture = await readGdtf(file)
      onFixture(fixture)
      setMessage({ error: false, text: tf('Načítané z GDTF: {0} {1}, DMX módov: {2}. Skontrolujte a uložte.', fixture.manufacturer, fixture.model, fixture.modes.length) })
    } catch {
      setMessage({ error: true, text: tx('Súbor sa nepodarilo prečítať. Je to .gdtf súbor svetla?') })
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-1 sm:col-span-2">
      <div className="flex flex-wrap items-center gap-2">
        <input ref={input} type="file" accept=".gdtf" className="hidden" aria-label={tx('GDTF súbor')} onChange={(event) => void load(event.target.files?.[0])} />
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
          <FileUp className="size-4" aria-hidden />
          {busy ? tx('Čítam…') : tx('Nahrať GDTF súbor')}
        </Button>
        <span className="text-xs text-muted-foreground">
          {tx('Súbor svetla z gdtf-share.com – vyplní výrobcu, model a DMX módy. Číta sa len vo vašom prehliadači.')}
        </span>
      </div>
      {message && (
        <p role={message.error ? 'alert' : 'status'} className={message.error ? 'text-sm text-destructive' : 'text-sm text-emerald-700 dark:text-emerald-400'}>
          {message.text}
        </p>
      )}
    </div>
  )
}
