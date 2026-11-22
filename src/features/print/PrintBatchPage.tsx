import { PrintButton } from '@/components/print/PrintButton'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FileDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { AddToPrintButton } from './AddToPrintButton'
import { FORMAT_LABELS, formatOf, markPrinted, printKeys, type PrintFormat } from './api'
import { clampLabelScale, imposeA5, imposeLabels, readLabelScale, saveLabelScale } from './imposition'
import { LabelScaleField } from './LabelScaleField'
import { Button } from '@/components/ui/button'
import { caseContentHash, caseTitle } from '@/features/cases/model'
import { drawCaseLabelFor, renderContentSheets, sheetOptions } from '@/features/cases/renderSheets'
import { buildPdf, canvasJpeg, pageSizePt } from '@/features/cases/sheetPdf'
import { useCases } from '@/features/cases/useCases'
import { brandingKeys, fetchBranding, fetchLogoBlob, logoForLightBackground } from '@/features/companies/branding'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { cableColorKeys, fetchCableColors } from '@/features/equipment/cableColors'
import { fetchPhotoBlob } from '@/features/equipment/photo'
import { useUserPrefs } from '@/features/settings/userPrefs'
import { createZip } from '@/lib/zip'

type Group = 'labels' | 'a4' | 'a5'
type Page = { canvas: HTMLCanvasElement; landscape: boolean; title: string; group: Group }

/** Hárok s obsahom v adrese: „id“ alebo „id~A5-landscape“ (formát z tlačovej fronty). */
function parseContent(token: string): { id: string; format: PrintFormat } {
  const [id, format = ''] = token.split('~')
  return { id, format: format in FORMAT_LABELS ? (format as PrintFormat) : '' }
}

const GROUP_FILES: Record<Group, string> = { labels: 'stitky-cases.pdf', a4: 'obsahy-A4.pdf', a5: 'obsahy-A5-2-na-A4.pdf' }

/**
 * Hromadná tlač z tlačovej fronty: štítky cases (v mierke, koľko sa zmestí na A4) a hárky s obsahom cases naraz.
 * Všetko ide na A4 – hárky A5 po dvoch na jednu A4 – so značkami na rezanie. Stiahnuť sa dá ZIP s PDF zvlášť pre
 * štítky, obsahy A4 a obsahy A5.
 */
export function PrintBatchPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const [params] = useSearchParams()
  const labelIds = (params.get('labels') ?? '').split(',').filter(Boolean)
  const contentTokens = (params.get('contents') ?? '').split(',').filter(Boolean).map(parseContent)
  const contentIds = contentTokens.map((token) => token.id)
  const { prefs } = useUserPrefs()
  const savedSheet = prefs.sheet ?? {}
  // Papier a orientácia hárkov bez vlastného formátu: z tlačovej fronty (?paper=A5&landscape=1), inak z volieb hárku.
  const queuePaper = params.get('paper')
  const [format, setFormat] = useState<{ paper: 'A4' | 'A5'; landscape: boolean } | null>(() =>
    queuePaper === 'A4' || queuePaper === 'A5' ? { paper: queuePaper, landscape: params.get('landscape') === '1' } : null,
  )
  const sheet = format ? { ...savedSheet, ...format } : savedSheet
  const options = sheetOptions(sheet)
  const back = params.get('back') ?? '/print'
  const cases = useCases(companyId)
  const queryClient = useQueryClient()
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const colors = useQuery({ queryKey: cableColorKeys.list(companyId), queryFn: () => fetchCableColors(companyId) })
  const branding = useQuery({ queryKey: brandingKeys.branding(companyId), queryFn: () => fetchBranding(companyId) })
  const logoPath = branding.data?.logoPath ?? ''
  const logo = useQuery({
    queryKey: brandingKeys.logo(companyId, logoPath),
    queryFn: async () => logoForLightBackground(await fetchLogoBlob(logoPath)),
    enabled: Boolean(logoPath),
    staleTime: Infinity,
  })
  const [pages, setPages] = useState<Page[] | null>(null)
  const [previews, setPreviews] = useState<string[]>([])
  const [printing, setPrinting] = useState(false)
  const [zipping, setZipping] = useState(false)
  const [scale, setScaleState] = useState(readLabelScale)
  const setScale = (value: number) => {
    setPages(null)
    setScaleState(clampLabelScale(value))
    saveLabelScale(value)
  }
  const [withQr] = useState(() => {
    try {
      return localStorage.getItem('rigtrack.label.qr') !== 'off'
    } catch {
      return true
    }
  })

  const ready = Boolean(cases.data && equipment.data && colors.data && branding.data && (!logoPath || logo.isSuccess || logo.isError))
  const key = `${labelIds.join(',')}|${params.get('contents') ?? ''}|${JSON.stringify(sheet)}|${scale}`

  useEffect(() => {
    if (!ready) return
    let cancelled = false
    void (async () => {
      const list = cases.data ?? []
      const gear = equipment.data ?? []
      const common = { equipment: gear, footer: branding.data?.labelFooter ?? '', logo: logo.data ?? null, companyName: company.companyName, origin: window.location.origin }
      const labels: { canvas: HTMLCanvasElement; title: string }[] = []
      for (const id of labelIds) {
        const current = list.find((item) => item.id === id)
        if (!current) continue
        const main = gear.find((item) => item.caseId === id && item.labelRole === 'main')
        const photoPath = main ? main.photoPath : current.labelPhotoPath
        const photo = photoPath ? await fetchPhotoBlob(photoPath).catch(() => null) : null
        const canvas = document.createElement('canvas')
        await drawCaseLabelFor(canvas, current, { ...common, withQr }, photo)
        labels.push({ canvas, title: `Štítok ${caseTitle(current)}` })
      }
      const a4: Page[] = []
      const a5: { canvas: HTMLCanvasElement; landscape: boolean; title: string }[] = []
      for (const token of contentTokens) {
        const current = list.find((item) => item.id === token.id)
        if (!current) continue
        // Formát uložený vo fronte má prednosť; inak voľba na tejto stránke (alebo z nastavení hárku).
        const [paper, orientation] = token.format ? token.format.split('-') : [options.paper, options.landscape ? 'landscape' : 'portrait']
        const own = { ...sheet, paper: paper as 'A4' | 'A5', landscape: orientation === 'landscape' }
        const rendered = await renderContentSheets(current, { ...common, colors: colors.data ?? [], sheet: own })
        for (const canvas of rendered) {
          const page = { canvas, landscape: own.landscape, title: `Obsah ${caseTitle(current)}` }
          if (own.paper === 'A5') a5.push(page)
          else a4.push({ ...page, group: 'a4' })
        }
      }
      if (cancelled) return
      const all: Page[] = [
        ...imposeLabels(labels, scale).map((page) => ({ ...page, group: 'labels' as const })),
        ...a4,
        ...imposeA5(a5).map((page) => ({ ...page, group: 'a5' as const })),
      ]
      setPages(all)
      setPreviews(all.map((page) => page.canvas.toDataURL('image/jpeg', 0.5)))
    })()
    return () => {
      cancelled = true
    }
    // Kľúč pokrýva zoznam, voľby hárku a mierku; ostatné sa počas stránky nemenia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key])

  if (cases.isError || equipment.isError || colors.isError || branding.isError) return <ErrorBlock message="Údaje na tlač sa nepodarilo načítať." />

  const pdfOf = async (list: Page[]) => {
    const images = await Promise.all(list.map(async (page) => ({ ...(await canvasJpeg(page.canvas)), page: pageSizePt('A4', page.landscape) })))
    return buildPdf(images, pageSizePt('A4', false))
  }
  const pdfBlob = async () => {
    remember()
    return pdfOf(pages ?? [])
  }
  // ZIP: zvlášť PDF so štítkami, s obsahmi A4 a s obsahmi A5 (po dvoch na A4).
  const downloadZip = async () => {
    if (!pages) return
    remember()
    const entries: { name: string; data: Uint8Array }[] = []
    for (const group of ['labels', 'a4', 'a5'] as Group[]) {
      const list = pages.filter((page) => page.group === group)
      if (list.length > 0) entries.push({ name: GROUP_FILES[group], data: new Uint8Array(await (await pdfOf(list)).arrayBuffer()) })
    }
    const url = URL.createObjectURL(new Blob([createZip(entries) as BlobPart], { type: 'application/zip' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'rigtrack-tlac.zip'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }
  // Zapamätať vytlačené (pri hárku aj obsah – pri zmene appka upozorní na novú tlač); z tlačovej fronty to zmizne.
  const remember = () => {
    if (!equipment.data) return
    const printed = [
      ...labelIds.map((caseId) => ({ kind: 'case' as const, targetId: caseId, label: 'case_label' as const })),
      ...contentIds.map((caseId) => ({ kind: 'case' as const, targetId: caseId, label: 'content' as const, contentHash: caseContentHash(caseId, equipment.data!) })),
    ]
    void markPrinted(companyId, printed)
      .then(() => queryClient.invalidateQueries({ queryKey: printKeys.queue(companyId) }))
      .catch(() => undefined)
  }
  const print = () => {
    remember()
    setPrinting(true)
    window.setTimeout(() => {
      window.print()
      setPrinting(false)
    }, 300)
  }

  return (
    <>
      {printing && pages && (
        <>
          {/* Všetko je na A4 (A5 po dvoch), len na výšku alebo na šírku. */}
          <style>{`@page { margin: 0 } @page batch-p { size: A4 portrait; margin: 0 } @page batch-l { size: A4 landscape; margin: 0 } @media print { body * { visibility: hidden !important } .batch-print, .batch-print * { visibility: visible !important } .batch-print { position: absolute; inset: 0 } .batch-print img { display: block; width: 100%; height: auto; break-after: page } }`}</style>
          <div className="batch-print hidden print:block">
            {pages.map((page, index) => (
              <img key={index} src={page.canvas.toDataURL('image/jpeg', 0.92)} alt="" style={{ page: page.landscape ? 'batch-l' : 'batch-p' }} />
            ))}
          </div>
        </>
      )}
      <Link to={back} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {back === '/print' ? 'Tlačová fronta' : 'Späť'}
      </Link>
      <PageHeader
        title="Tlačiť všetko naraz"
        description={`${labelIds.length} štítkov cases · ${contentIds.length} hárkov s obsahom – všetko na A4 (A5 po dvoch na jednu A4), so značkami na rezanie`}
        action={
          <div className="flex flex-wrap gap-2">
            {contentIds.length > 0 && <AddToPrintButton companyId={companyId} kind="case" targetIds={contentIds} label="content" format={formatOf(options.paper, options.landscape)} />}
            {labelIds.length > 0 && <AddToPrintButton companyId={companyId} kind="case" targetIds={labelIds} label="case_label" />}
            <PrintButton makePdf={pdfBlob} onPrint={print} fileName="rigtrack-tlac" disabled={!pages || pages.length === 0} label="Tlačiť" />
            <Button
              variant="outline"
              disabled={!pages || pages.length === 0 || zipping}
              onClick={() => {
                setZipping(true)
                void downloadZip().finally(() => setZipping(false))
              }}
            >
              <FileDown className="size-4" aria-hidden />
              Stiahnuť ZIP
            </Button>
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border bg-surface p-3 print:hidden">
        {labelIds.length > 0 && <LabelScaleField scale={scale} onChange={setScale} />}
        {contentIds.length > 0 && (
          <>
            <label className="flex flex-col gap-1 text-sm">
              Obsahy – papier
              <select className="h-10 rounded-lg border bg-background px-2" value={options.paper} onChange={(e) => { setPages(null); setFormat({ paper: e.target.value as 'A4' | 'A5', landscape: options.landscape }) }}>
                <option value="A4">A4</option>
                <option value="A5">A5 (2 na A4)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Orientácia
              <select className="h-10 rounded-lg border bg-background px-2" value={options.landscape ? 'landscape' : 'portrait'} onChange={(e) => { setPages(null); setFormat({ paper: options.paper, landscape: e.target.value === 'landscape' }) }}>
                <option value="portrait">na výšku</option>
                <option value="landscape">na šírku</option>
              </select>
            </label>
          </>
        )}
        <p className="basis-full text-xs text-muted-foreground">
          ZIP obsahuje zvlášť PDF so štítkami, s obsahmi A4 a s obsahmi A5. Čiarky v rohoch ukazujú, kde rezať.
          {contentTokens.some((token) => token.format) && ' Hárky s formátom z tlačovej fronty si ho nechajú.'}
        </p>
      </div>
      {!pages ? (
        <LoadingBlock />
      ) : pages.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-surface p-8 text-center text-sm text-muted-foreground">Nie je čo tlačiť – cases sa nenašli.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">{pages.length} strán A4. Po vytlačení alebo stiahnutí ZIP sa to z tlačovej fronty zmaže samo.</p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {previews.map((url, index) => (
              <li key={index} className="flex flex-col gap-1">
                <img src={url} alt={`Strana ${index + 1}: ${pages[index].title}`} className="w-full rounded-lg border bg-white" />
                <span className="truncate text-xs text-muted-foreground">
                  {index + 1}. {pages[index].title}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
