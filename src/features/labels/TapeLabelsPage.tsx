import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Download, Printer, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { downloadCanvas, fileSlug } from '@/features/cases/canvas'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { drawTapeLabel, mmToPx } from './drawTape'
import { caseTapeLabel, fieldOn, LABEL_KIND_LABELS, LABEL_KINDS, TAPE_FIELDS, TAPES, tapeLabels, type LabelKind, type TapeField, type TapeFieldGroup, type TapeMm } from './tape'
import { useUserPrefs } from '@/features/settings/userPrefs'
import { useEquipmentLookups } from '@/features/equipment/useEquipmentLookups'
import { useCases } from '@/features/cases/useCases'
import { cn } from '@/lib/utils'

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
  // Obsah štítkov a farba pásky sa ukladajú k účtu (rovnaké na PC aj v mobile).
  const { prefs, update } = useUserPrefs()
  const fields = prefs.tapeFields ?? {}
  const black = prefs.tapeColor === 'black'
  const [editingFields, setEditingFields] = useState(false)
  const { categories } = useEquipmentLookups(companyId)
  const options = { fields, company: company.companyName, category: (id: string | null) => categories.find((item) => item.id === id)?.name ?? '' }
  const toggleField = (key: TapeField) => update({ tapeFields: { ...fields, [key]: !fieldOn(fields, key) } })
  const [images, setImages] = useState<{ key: string; caption: string; name: string; url: string; widthMm: number; canvas: HTMLCanvasElement }[]>([])
  const items = (equipment.data ?? []).filter((item) => ids.includes(item.id))
  const labels = [
    ...(cases.data ?? [])
      .filter((item) => caseIds.includes(item.id))
      .map((item) => caseTapeLabel(item, options))
      .sort((a, b) => a.title.localeCompare(b.title, 'sk', { numeric: true })),
    ...(ids.length > 0 ? items.flatMap((item) => tapeLabels(item, settings.kinds, options)) : []),
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
        return { key: label.key, caption: label.caption ?? label.title, name: `${label.caption ?? label.title}-${LABEL_KIND_LABELS[label.kind]}`, url: canvas.toDataURL('image/png'), widthMm: (canvas.width / mmToPx(25.4)) * 25.4, canvas }
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

  const longest = Math.ceil(Math.max(5, ...images.map((image) => image.widthMm)))
  // Každý štítok na vlastnú „stranu“ presne svojej dĺžky (pomenované strany @page) – ovládač P-touch ho vytlačí
  // a odstrihne, bez prázdneho konca pásky. Prehliadač bez pomenovaných strán použije dĺžku najdlhšieho.
  const lengthOf = (image: { widthMm: number }) => Math.max(5, Math.ceil(image.widthMm))
  const lengths = [...new Set(images.map(lengthOf))]
  const noMargins = '@top-left { content: ""; } @top-center { content: ""; } @bottom-center { content: ""; }'
  const printCss = `
@page { size: ${longest}mm ${settings.tape}mm; margin: 0; ${noMargins} }
${lengths.map((length) => `@page tape${length} { size: ${length}mm ${settings.tape}mm; margin: 0; ${noMargins} }`).join(' ')}
@media print {
  html, body { background: #fff !important; margin: 0 !important; }
  .tape-sheet { display: block !important; }
  .tape-sheet img { display: block; height: ${settings.tape}mm; width: auto; break-after: page; }
${lengths.map((length) => `  .tape-sheet img.tape${length} { page: tape${length}; }`).join(' ')}
}`
  const toggle = (kind: LabelKind) => setSettings((current) => ({ ...current, kinds: current.kinds.includes(kind) ? current.kinds.filter((value) => value !== kind) : [...current.kinds, kind] }))

  // Len cases: druhy štítkov techniky (DMX, odber…) nemajú zmysel.
  const onlyCases = ids.length === 0
  const chip = (on: boolean) => cn('h-9 rounded-lg border px-3 text-sm font-medium', on ? 'border-primary bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted')
  const downloadAll = async () => {
    for (const image of images) {
      downloadCanvas(image.canvas, `stitok-${fileSlug(image.name)}.png`)
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <style>{printCss}</style>
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 md:px-8 print:hidden">
        <Link to={back} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden />
          Späť
        </Link>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Štítky na pásku</h1>
            <p className="text-sm text-muted-foreground">Brother P-touch · {images.length} štítkov</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={images.length === 0} onClick={() => void downloadAll()}>
              <Download className="size-4" aria-hidden />
              PNG ({images.length})
            </Button>
            <Button disabled={images.length === 0} onClick={() => window.print()}>
              <Printer className="size-4" aria-hidden />
              Tlačiť
            </Button>
          </div>
        </header>

        <section className="flex flex-col gap-4 rounded-xl border bg-surface p-4">
          <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium">Páska</legend>
              <div className="flex gap-1">
                {TAPES.map((tape) => (
                  <button key={tape} type="button" aria-pressed={settings.tape === tape} onClick={() => setSettings({ ...settings, tape })} className={chip(settings.tape === tape)}>
                    {tape} mm
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium">Farba pásky</legend>
              <div className="flex gap-1">
                {(
                  [
                    ['white', 'Biela'],
                    ['black', 'Čierna'],
                  ] as const
                ).map(([value, label]) => (
                  <button key={value} type="button" aria-pressed={(prefs.tapeColor ?? 'white') === value} onClick={() => update({ tapeColor: value })} className={chip((prefs.tapeColor ?? 'white') === value)}>
                    <span className={cn('mr-1.5 inline-block size-3 rounded-sm border align-middle', value === 'black' ? 'bg-black' : 'bg-white')} aria-hidden />
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            {!onlyCases && (
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium">Čo tlačiť</legend>
                <div className="flex flex-wrap gap-1">
                  {LABEL_KINDS.map((kind) => (
                    <button key={kind} type="button" aria-pressed={settings.kinds.includes(kind)} onClick={() => toggle(kind)} className={chip(settings.kinds.includes(kind))}>
                      {LABEL_KIND_LABELS[kind]}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
          </div>
          <button type="button" aria-expanded={editingFields} className="inline-flex items-center gap-1 self-start text-sm font-medium text-accent hover:underline" onClick={() => setEditingFields(!editingFields)}>
            <SlidersHorizontal className="size-4" aria-hidden />
            {editingFields ? 'Skryť obsah štítkov' : 'Upraviť obsah štítkov'}
          </button>
          {editingFields && (
            <div className="grid gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.keys(TAPE_FIELDS) as TapeFieldGroup[])
                .filter((group) => (group === 'case' ? caseIds.length > 0 : ids.length > 0 && settings.kinds.includes(group as LabelKind)))
                .map((group) => (
                  <fieldset key={group} className="flex flex-col gap-1">
                    <legend className="mb-1 text-sm font-semibold">{group === 'case' ? 'Štítok case / racku' : LABEL_KIND_LABELS[group as LabelKind]}</legend>
                    {(Object.entries(TAPE_FIELDS[group]) as [TapeField, string][]).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="size-4 accent-(--accent)" checked={fieldOn(fields, key)} onChange={() => toggleField(key)} />
                        {label}
                      </label>
                    ))}
                  </fieldset>
                ))}
              <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-3">Uloží sa k vášmu účtu a platí pre všetky štítky – kedykoľvek ho zmeníte späť.</p>
            </div>
          )}
        </section>

        <details className="rounded-xl border bg-surface px-4 py-3 text-sm text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">Ako tlačiť</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Z PC: Tlačiť → tlačiareň Brother PT-D460BT, páska {settings.tape} mm, okraje žiadne, mierka 100 %. Každý štítok dostane svoju dĺžku.</li>
            <li>Z mobilu: stiahnite PNG a vytlačte ich v aplikácii Brother iPrint&amp;Label (dĺžku nastavte podľa čísla pri štítku).</li>
            {black && <li>Čierna páska: tlačiareň tlačí bielou farbou kazety – súbor aj tlač sú rovnaké, náhľad ukazuje výsledok.</li>}
            {!onlyCases && <li>Prázdne druhy (svetlo bez DMX adresy alebo príkonu) sa vynechajú – adresy nastavíte cez „DMX všetkým“, príkon a váhu v úprave techniky.</li>}
          </ul>
        </details>

        {labels.length === 0 && <p className="rounded-xl border border-dashed bg-surface p-8 text-center text-sm text-muted-foreground">Nie je čo tlačiť – vyberte druh štítku alebo doplňte údaje pri technike.</p>}
        <ul className="flex flex-col gap-2">
          {images.map((image) => (
            <li key={image.key} className="flex flex-wrap items-center gap-3 rounded-xl border bg-surface p-3">
              {/* Náhľad ako skutočná páska (biela / čierna). */}
              <img src={image.url} alt={image.name} className={cn('max-w-full rounded-sm shadow-sm', black && 'invert')} style={{ height: `${settings.tape * 4}px` }} />
              <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{image.caption}</span>
              <span className="text-sm font-medium tabular-nums">{Math.ceil(image.widthMm)} mm</span>
              <Button variant="ghost" size="sm" onClick={() => downloadCanvas(image.canvas, `stitok-${fileSlug(image.name)}.png`)}>
                <Download className="size-4" aria-hidden />
                PNG
              </Button>
            </li>
          ))}
        </ul>
      </div>
      <div className="tape-sheet hidden">
        {images.map((image) => (
          <img key={image.key} src={image.url} alt="" className={`tape${lengthOf(image)}`} />
        ))}
      </div>
    </div>
  )
}
