import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Download, Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { downloadCanvas, fileSlug } from '@/features/cases/canvas'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { drawTapeLabel, mmToPx } from './drawTape'
import { caseTapeLabel, LABEL_KIND_LABELS, LABEL_KINDS, TAPES, tapeLabels, type LabelKind, type TapeMm } from './tape'
import { useCases } from '@/features/cases/useCases'

const SETTINGS_KEY = 'rigtrack.tape'

function savedSettings(): { tape: TapeMm; kinds: LabelKind[] } {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as { tape?: TapeMm; kinds?: LabelKind[] }
    return { tape: saved.tape && TAPES.includes(saved.tape) ? saved.tape : 12, kinds: saved.kinds?.length ? saved.kinds : ['qr', 'address'] }
  } catch {
    return { tape: 12, kinds: ['qr', 'address'] }
  }
}

/**
 * Štítky na pásku pre Brother P-touch (napr. PT-D460BT): QR + názov kusu, moja DMX adresa, DMX módy, odber a váha.
 * Tlač cez ovládač tlačiarne (veľkosť strany = páska), alebo PNG do aplikácie Brother iPrint&Label / P-touch Editor.
 */
export function TapeLabelsPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const [params] = useSearchParams()
  const ids = (params.get('ids') ?? '').split(',').filter(Boolean)
  // ?cases=… – štítky cases a rackov (QR + názov s číslom).
  const caseIds = (params.get('cases') ?? '').split(',').filter(Boolean)
  const cases = useCases(companyId)
  const back = params.get('back') ?? (ids.length === 1 ? `/equipment/${ids[0]}` : params.get('cases') ? '/cases' : '/equipment')
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const [settings, setSettings] = useState(savedSettings)
  const [images, setImages] = useState<{ key: string; name: string; url: string; widthMm: number; canvas: HTMLCanvasElement }[]>([])
  const items = (equipment.data ?? []).filter((item) => ids.includes(item.id))
  const labels = [
    ...(cases.data ?? []).filter((item) => caseIds.includes(item.id)).map(caseTapeLabel),
    ...items.flatMap((item) => tapeLabels(item, settings.kinds)),
  ]
  const signature = JSON.stringify([settings, labels.map((label) => label.key + label.title + label.lines.join())])

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      // Bez úložiska sa nastavenie len nezapamätá.
    }
  }, [settings])

  useEffect(() => {
    let cancelled = false
    void Promise.all(
      labels.map(async (label) => {
        const canvas = await drawTapeLabel(label, settings.tape)
        return { key: label.key, name: `${label.title}-${LABEL_KIND_LABELS[label.kind]}`, url: canvas.toDataURL('image/png'), widthMm: (canvas.width / mmToPx(25.4)) * 25.4, canvas }
      }),
    ).then((result) => !cancelled && setImages(result))
    return () => {
      cancelled = true
    }
    // Prekreslí sa pri zmene nastavení alebo obsahu (podpis), nie pri každom renderi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  if (equipment.isPending) return <LoadingBlock />
  if (equipment.isError) return <ErrorBlock message="Techniku sa nepodarilo načítať." />

  const longest = Math.ceil(Math.max(20, ...images.map((image) => image.widthMm)))
  // Každý štítok na vlastnú „stranu“ s veľkosťou pásky – ovládač P-touch ho vytlačí a odstrihne.
  const printCss = `
@page { size: ${longest}mm ${settings.tape}mm; margin: 0; @top-left { content: ""; } @top-center { content: ""; } @bottom-center { content: ""; } }
@media print {
  html, body { background: #fff !important; margin: 0 !important; }
  .tape-sheet { display: block !important; }
  .tape-sheet img { display: block; height: ${settings.tape}mm; width: auto; break-after: page; }
}`
  const toggle = (kind: LabelKind) => setSettings((current) => ({ ...current, kinds: current.kinds.includes(kind) ? current.kinds.filter((value) => value !== kind) : [...current.kinds, kind] }))

  return (
    <div className="min-h-dvh bg-white p-6 text-black">
      <style>{printCss}</style>
      <div className="flex flex-col gap-4 print:hidden">
        <Link to={back} className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-black">
          <ArrowLeft className="size-4" aria-hidden />
          Späť
        </Link>
        <h1 className="text-xl font-bold">Štítky na pásku (Brother P-touch)</h1>
        <div className="flex flex-wrap items-end gap-6">
          <fieldset>
            <legend className="mb-1 text-sm font-medium">Páska</legend>
            <div className="flex gap-1">
              {TAPES.map((tape) => (
                <button
                  key={tape}
                  type="button"
                  aria-pressed={settings.tape === tape}
                  onClick={() => setSettings({ ...settings, tape })}
                  className={settings.tape === tape ? 'h-9 rounded-md bg-black px-3 text-sm font-medium text-white' : 'h-9 rounded-md border border-neutral-300 px-3 text-sm hover:bg-neutral-100'}
                >
                  {tape} mm
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-1 text-sm font-medium">Čo tlačiť</legend>
            <div className="flex flex-wrap gap-3">
              {LABEL_KINDS.map((kind) => (
                <label key={kind} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" className="size-4" checked={settings.kinds.includes(kind)} onChange={() => toggle(kind)} />
                  {LABEL_KIND_LABELS[kind]}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="border-neutral-300 bg-white text-black hover:bg-neutral-100"
              disabled={images.length === 0}
              onClick={async () => {
                for (const image of images) {
                  downloadCanvas(image.canvas, `stitok-${fileSlug(image.name)}.png`)
                  await new Promise((resolve) => setTimeout(resolve, 300))
                }
              }}
            >
              <Download className="size-4" aria-hidden />
              PNG ({images.length})
            </Button>
            <Button disabled={images.length === 0} onClick={() => window.print()}>
              <Printer className="size-4" aria-hidden />
              Tlačiť
            </Button>
          </div>
        </div>
        <p className="text-sm text-neutral-600">
          Tlač z PC: vyberte tlačiareň Brother PT-D460BT, páska {settings.tape} mm, okraje žiadne, mierka 100 %. Z mobilu: stiahnite PNG a vytlačte ich
          v aplikácii Brother iPrint&amp;Label. Prázdne druhy (napr. svetlo bez zapísanej DMX adresy alebo príkonu) sa vynechajú – adresy nastavíte cez
          „DMX všetkým“, príkon (W) a váhu v úprave techniky.
        </p>
        {labels.length === 0 && <p className="text-sm">Nie je čo tlačiť – vyberte druh štítku alebo doplňte údaje pri technike.</p>}
        <ul className="flex flex-col gap-3">
          {images.map((image) => (
            <li key={image.key} className="flex flex-wrap items-center gap-3">
              <img src={image.url} alt={image.name} className="rounded border border-neutral-300" style={{ height: `${settings.tape * 4}px` }} />
              <button type="button" className="inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-black" onClick={() => downloadCanvas(image.canvas, `stitok-${fileSlug(image.name)}.png`)}>
                <Download className="size-3.5" aria-hidden />
                PNG
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="tape-sheet hidden">
        {images.map((image) => (
          <img key={image.key} src={image.url} alt="" />
        ))}
      </div>
    </div>
  )
}
