import { FileDown, Loader2, Printer } from 'lucide-react'
import { useState, type RefObject } from 'react'
import { Button } from '@/components/ui/button'
import { printsViaPdf, sharePdf, sheetToPdf } from '@/lib/printSheet'
import { tx } from '@/lib/i18n'

type Props = {
  /** Hárok na tlač (PaperSheet); alebo `makePdf`, keď strana už vie PDF vyrobiť sama (obrázkové hárky). */
  sheet?: RefObject<HTMLElement | null>
  makePdf?: () => Promise<Blob>
  /** Tlač na počítači; predvolene dialóg tlače prehliadača. */
  onPrint?: () => void
  /** Zavolá sa pri každej tlači alebo PDF (napr. zapamätať, že štítky sú vytlačené). */
  onPrinted?: () => void
  /** Názov PDF bez prípony. */
  fileName: string
  marginMm?: number
  landscape?: boolean
  variant?: 'default' | 'outline'
  disabled?: boolean
  label?: string
}

/**
 * Tlačidlo Tlačiť: na počítači dialóg tlače, na mobile a tablete PDF cez zdieľanie
 * (odtiaľ AirPrint / tlačiareň, uloženie alebo poslanie).
 */
export function PrintButton({ sheet, makePdf, onPrint, onPrinted, fileName, marginMm = 14, landscape = false, variant = 'default', disabled, label }: Props) {
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState<Blob | null>(null)
  const [failed, setFailed] = useState(false)
  const name = `${fileName.replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '') || 'rigtrack'}.pdf`

  const share = async (pdf: Blob) => {
    const result = await sharePdf(pdf, name)
    setReady(result === 'blocked' ? pdf : null)
  }
  const print = async () => {
    onPrinted?.()
    if (!printsViaPdf()) {
      if (onPrint) onPrint()
      else window.print()
      return
    }
    const node = sheet?.current
    if (!makePdf && !node) return
    setBusy(true)
    setFailed(false)
    try {
      await share(makePdf ? await makePdf() : await sheetToPdf(node!, { marginMm, landscape }))
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {ready ? (
        // Príprava PDF trvala dlhšie, než prehliadač dovolí zdieľať – stačí ťuknúť ešte raz.
        <Button variant={variant} onClick={() => void share(ready)}>
          <FileDown className="size-4" aria-hidden />
          {tx('PDF je pripravené – tlačiť / uložiť')}
        </Button>
      ) : (
        <Button variant={variant} disabled={disabled || busy} onClick={() => void print()}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Printer className="size-4" aria-hidden />}
          {busy ? tx('Pripravujem PDF…') : (label ?? tx('Tlačiť / PDF'))}
        </Button>
      )}
      {failed && (
        <span role="alert" className="text-sm text-destructive">
          {tx('PDF sa nepodarilo pripraviť. Skúste to znova.')}
        </span>
      )}
    </span>
  )
}
