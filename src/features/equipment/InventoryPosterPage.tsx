import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Download, FileDown, Printer } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { downloadCanvas, fileSlug } from '@/features/cases/canvas'
import { buildPdf, canvasJpeg, pageSizePt } from '@/features/cases/sheetPdf'
import { brandingKeys, fetchBranding, fetchLogoBlob, logoForLightBackground } from '@/features/companies/branding'
import { useCompany } from '@/features/companies/company-context'
import { AddToPrintButton } from '@/features/print/AddToPrintButton'
import { equipmentKeys, fetchEquipmentList } from './api'
import { KIND_LABELS, type EquipmentKind } from './model'
import { fetchPhotoBlob, PHOTO_URL_STALE_MS } from './photo'
import { POSTER_KINDS, POSTER_TITLES, posterSections } from './poster'
import { renderPoster } from './posterCanvas'
import { useEquipmentLookups } from './useEquipmentLookups'

type Settings = { title: string; subtitle: string; notes: string; hidden: string[]; portrait: boolean }

const storageKey = (companyId: string, kind: string) => `rigtrack:poster:${companyId}:${kind}`

function loadSettings(companyId: string, kind: EquipmentKind): Settings {
  const fallback: Settings = { title: POSTER_TITLES[kind] ?? `${KIND_LABELS[kind]} – inventár`, subtitle: '', notes: '', hidden: [], portrait: true }
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(storageKey(companyId, kind)) ?? '{}') }
  } catch {
    return fallback
  }
}

type Bitmap = ImageBitmap

/** Fotky dlaždíc ako obrázky na kreslenie (čo sa nenačíta, ostane bez fotky). */
async function loadPhotos(paths: string[]) {
  const entries = await Promise.all(
    paths.map(async (path) => {
      try {
        return [path, await createImageBitmap(await fetchPhotoBlob(path))] as const
      } catch {
        return null
      }
    }),
  )
  return new Map(entries.filter((entry): entry is readonly [string, Bitmap] => entry !== null))
}

/**
 * Plagát inventára (A4 na výšku alebo na šírku, biely papier): technika jedného druhu po častiach – veľký počet kusov,
 * rozmer, názov a fotka. Nakreslí sa do obrázka – náhľad, tlač, PDF aj PNG sú rovnaké. /equipment/poster?kind=truss
 */
export function InventoryPosterPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const [params, setParams] = useSearchParams()
  const kind = (POSTER_KINDS.includes(params.get('kind') as EquipmentKind) ? params.get('kind') : 'stage') as EquipmentKind
  // Nastavenie sa pamätá pre každý druh zvlášť; pri zmene druhu sa načíta jeho.
  const [state, setState] = useState(() => ({ key: `${companyId}:${kind}`, settings: loadSettings(companyId, kind) }))
  if (state.key !== `${companyId}:${kind}`) setState({ key: `${companyId}:${kind}`, settings: loadSettings(companyId, kind) })
  const settings = state.settings
  const update = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch }
    setState({ key: `${companyId}:${kind}`, settings: next })
    try {
      localStorage.setItem(storageKey(companyId, kind), JSON.stringify(next))
    } catch {
      // bez úložiska platí nastavenie len do zatvorenia
    }
  }
  const [printUrls, setPrintUrls] = useState<string[]>([])

  const list = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const { categories } = useEquipmentLookups(companyId)
  const branding = useQuery({ queryKey: brandingKeys.branding(companyId), queryFn: () => fetchBranding(companyId) })
  // Logo pre biely papier (svetlé sa prefarbí na čierno).
  const logo = useQuery({
    queryKey: ['company', companyId, 'logo-light', branding.data?.logoPath],
    queryFn: async () => createImageBitmap(await logoForLightBackground(await fetchLogoBlob(branding.data!.logoPath))),
    enabled: Boolean(branding.data?.logoPath),
    staleTime: Infinity,
    retry: false,
  })

  const sections = useMemo(
    () => (list.data ? posterSections(list.data, kind, (id) => categories.find((category) => category.id === id)?.name ?? '') : []),
    [list.data, kind, categories],
  )
  const shown = sections.filter((section) => !settings.hidden.includes(section.key))
  const paths = [...new Set(shown.flatMap((section) => section.tiles.map((tile) => tile.photoPath)).filter(Boolean))].sort()
  const photos = useQuery({ queryKey: ['company', companyId, 'poster-photos', paths], queryFn: () => loadPhotos(paths), staleTime: PHOTO_URL_STALE_MS, placeholderData: (previous) => previous })
  const logoReady = !branding.data?.logoPath || !logo.isPending
  const notes = settings.notes
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4)

  const pages = useMemo(() => {
    if (shown.length === 0 || !photos.data || !logoReady) return []
    return renderPoster({
      title: settings.title,
      subtitle: settings.subtitle,
      notes,
      portrait: settings.portrait,
      sections: shown,
      photos: photos.data,
      logo: logo.data ?? null,
      companyName: company.companyName,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- notes a shown sú odvodené z nastavení a zoznamu
  }, [settings, sections, photos.data, logo.data, logoReady, company.companyName])
  const previews = useMemo(() => pages.map((canvas) => canvas.toDataURL('image/png')), [pages])

  if (list.isPending) return <LoadingBlock />
  if (list.isError) return <ErrorBlock message="Techniku sa nepodarilo načítať." onRetry={() => void list.refetch()} />

  const baseName = `inventar-${fileSlug(settings.title || KIND_LABELS[kind])}`
  const downloadPdf = async () => {
    const images = await Promise.all(pages.map((canvas) => canvasJpeg(canvas, 0.92)))
    const url = URL.createObjectURL(buildPdf(images, pageSizePt('A4', !settings.portrait)))
    const link = document.createElement('a')
    link.href = url
    link.download = `${baseName}.pdf`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }
  const downloadPng = async () => {
    for (const [index, canvas] of pages.entries()) {
      downloadCanvas(canvas, pages.length > 1 ? `${baseName}-${index + 1}.png` : `${baseName}.png`)
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
  }
  const print = () => {
    setPrintUrls(pages.map((canvas) => canvas.toDataURL('image/jpeg', 0.92)))
    window.setTimeout(() => {
      window.print()
      setPrintUrls([])
    }, 200)
  }
  const ready = pages.length > 0

  return (
    <>
      {printUrls.length > 0 && (
        <>
          <style>{`@page { size: A4 ${settings.portrait ? 'portrait' : 'landscape'}; margin: 0 } @media print { body * { visibility: hidden !important } .sheet-print, .sheet-print * { visibility: visible !important } .sheet-print { position: absolute; inset: 0 } .sheet-print img { display: block; width: 100%; height: auto; break-after: page } }`}</style>
          <div className="sheet-print hidden print:block">
            {printUrls.map((url, index) => (
              <img key={index} src={url} alt="" />
            ))}
          </div>
        </>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <Link to="/equipment" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden />
          Technika
        </Link>
        <span className="flex-1" />
        <AddToPrintButton companyId={companyId} kind="poster" targetIds={[companyId]} label={`poster:${kind}`} />
        <Button disabled={!ready} onClick={print}>
          <Printer className="size-4" aria-hidden />
          Tlačiť
        </Button>
        <Button variant="outline" disabled={!ready} onClick={() => void downloadPdf()}>
          <FileDown className="size-4" aria-hidden />
          PDF
        </Button>
        <Button variant="outline" disabled={!ready} onClick={() => void downloadPng()}>
          <Download className="size-4" aria-hidden />
          {pages.length > 1 ? `PNG (${pages.length})` : 'PNG'}
        </Button>
      </div>

      <div className="mb-4 grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        <SelectField label="Druh techniky" value={kind} onChange={(e) => setParams({ kind: e.target.value }, { replace: true })}>
          {POSTER_KINDS.map((value) => (
            <option key={value} value={value}>
              {KIND_LABELS[value]}
            </option>
          ))}
        </SelectField>
        <SelectField label="Papier" value={settings.portrait ? 'portrait' : 'landscape'} onChange={(e) => update({ portrait: e.target.value === 'portrait' })}>
          <option value="portrait">A4 na výšku</option>
          <option value="landscape">A4 na šírku</option>
        </SelectField>
        <Field label="Nadpis" maxLength={60} value={settings.title} onChange={(e) => update({ title: e.target.value })} />
        <Field label="Podnadpis" maxLength={80} placeholder="napr. Modulárny pódiový systém" value={settings.subtitle} onChange={(e) => update({ subtitle: e.target.value })} />
        <TextareaField
          label="Poznámky dole (každá na riadok, najviac 4)"
          className="sm:col-span-2"
          rows={3}
          placeholder={'Nosnosť 750 kg/m²\nRýchla montáž a demontáž'}
          value={settings.notes}
          onChange={(e) => update({ notes: e.target.value })}
        />
        {sections.length > 0 && (
          <fieldset className="sm:col-span-2">
            <legend className="mb-1 text-sm font-medium">Časti na plagáte</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {sections.map((section) => (
                <label key={section.key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!settings.hidden.includes(section.key)}
                    onChange={(e) => update({ hidden: e.target.checked ? settings.hidden.filter((key) => key !== section.key) : [...settings.hidden, section.key] })}
                  />
                  {section.title} ({section.total})
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </div>

      {sections.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-surface p-6 text-center text-sm text-muted-foreground">
          V technike zatiaľ nie je nič druhu „{KIND_LABELS[kind]}“. {kind === 'truss' && 'Pri hliníku vyplňte typ (1–4-point), tvar a dĺžku – podľa nich sa rozdelí na rovné diely, rohy a základne.'}
          {kind === 'stage' && 'Pri pódiu vyplňte Dosky / Príslušenstvo a rozmer platne.'}
        </p>
      ) : !ready ? (
        <p className="text-sm text-muted-foreground">{shown.length === 0 ? 'Vyberte aspoň jednu časť.' : 'Kreslím plagát…'}</p>
      ) : (
        <div className="flex flex-col items-center gap-4 print:hidden">
          {previews.map((url, index) => (
            <img
              key={index}
              src={url}
              alt={`Plagát, strana ${index + 1}`}
              className="w-full rounded-lg border bg-white shadow-lg"
              style={{ maxWidth: settings.portrait ? 720 : 1100 }}
            />
          ))}
        </div>
      )}
    </>
  )
}
