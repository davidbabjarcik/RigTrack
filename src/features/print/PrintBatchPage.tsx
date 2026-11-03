import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, FileDown, Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { caseTitle } from '@/features/cases/model'
import { drawCaseLabelFor, renderContentSheets, scaledCanvas, sheetOptions } from '@/features/cases/renderSheets'
import { buildPdf, canvasJpeg, pageSizePt } from '@/features/cases/sheetPdf'
import { useCases } from '@/features/cases/useCases'
import { brandingKeys, fetchBranding, fetchLogoBlob, logoForLightBackground } from '@/features/companies/branding'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { cableColorKeys, fetchCableColors } from '@/features/equipment/cableColors'
import { fetchPhotoBlob } from '@/features/equipment/photo'
import { useUserPrefs } from '@/features/settings/userPrefs'

/** A4 na výšku pri 300 dpi – na jednu stranu idú dva štítky case pod seba. */
const A4_W = 2480
const A4_H = 3508

type Page = { canvas: HTMLCanvasElement; kind: 'label' | 'sheet'; paper: 'A4' | 'A5'; landscape: boolean; title: string }

/** Dva štítky (1838 × 1500 px = 155 × 127 mm) na stranu A4 pod seba, s miestom na strihanie. */
function labelPages(labels: { canvas: HTMLCanvasElement; title: string }[]): Page[] {
  const pages: Page[] = []
  for (let index = 0; index < labels.length; index += 2) {
    const canvas = document.createElement('canvas')
    canvas.width = A4_W
    canvas.height = A4_H
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, A4_W, A4_H)
    labels.slice(index, index + 2).forEach((label, slot) => {
      const x = (A4_W - label.canvas.width) / 2
      const y = slot === 0 ? 180 : A4_H / 2 + 80
      ctx.drawImage(label.canvas, x, y)
      // Tenká čiara na strihanie.
      ctx.strokeStyle = '#bbbbbb'
      ctx.lineWidth = 2
      ctx.setLineDash([18, 14])
      ctx.strokeRect(x - 8, y - 8, label.canvas.width + 16, label.canvas.height + 16)
    })
    pages.push({ canvas, kind: 'label', paper: 'A4', landscape: false, title: labels.slice(index, index + 2).map((label) => label.title).join(' + ') })
  }
  return pages
}

/**
 * Hromadná tlač z tlačovej fronty: štítky cases (2 na A4) a hárky s obsahom cases (podľa volieb hárku na účte)
 * naraz – vytlačiť alebo stiahnuť ako jedno PDF.
 */
export function PrintBatchPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const [params] = useSearchParams()
  const labelIds = (params.get('labels') ?? '').split(',').filter(Boolean)
  const contentIds = (params.get('contents') ?? '').split(',').filter(Boolean)
  const { prefs } = useUserPrefs()
  const sheet = prefs.sheet ?? {}
  // Z tlačovej fronty: formát hárkov (?paper=A5&landscape=1), inak podľa volieb hárku.
  const queuePaper = params.get('paper')
  const options = sheetOptions(queuePaper === 'A4' || queuePaper === 'A5' ? { ...sheet, paper: queuePaper, landscape: params.get('landscape') === '1' } : sheet)
  const cases = useCases(companyId)
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
  const [withQr] = useState(() => {
    try {
      return localStorage.getItem('rigtrack.label.qr') !== 'off'
    } catch {
      return true
    }
  })

  const ready = Boolean(cases.data && equipment.data && colors.data && branding.data && (!logoPath || logo.isSuccess || logo.isError))
  const key = `${labelIds.join(',')}|${contentIds.join(',')}|${JSON.stringify(sheet)}`

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
      const sheets: Page[] = []
      for (const id of contentIds) {
        const current = list.find((item) => item.id === id)
        if (!current) continue
        const rendered = await renderContentSheets(current, { ...common, colors: colors.data ?? [], sheet })
        for (const canvas of rendered) {
          sheets.push({
            kind: 'sheet',
            canvas: options.paper === 'A5' ? scaledCanvas(canvas, options.a5Width, options.a5Height) : canvas,
            paper: options.paper,
            landscape: options.landscape,
            title: `Obsah ${caseTitle(current)}`,
          })
        }
      }
      if (cancelled) return
      const all = [...labelPages(labels), ...sheets]
      setPages(all)
      setPreviews(all.map((page) => page.canvas.toDataURL('image/jpeg', 0.5)))
    })()
    return () => {
      cancelled = true
    }
    // Kľúč pokrýva zoznam a voľby hárku; ostatné sa počas stránky nemenia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key])

  if (cases.isError || equipment.isError || colors.isError || branding.isError) return <ErrorBlock message="Údaje na tlač sa nepodarilo načítať." />

  const downloadPdf = async () => {
    if (!pages) return
    const images = await Promise.all(pages.map(async (page) => ({ ...(await canvasJpeg(page.canvas)), page: pageSizePt(page.paper, page.landscape) })))
    const url = URL.createObjectURL(buildPdf(images, pageSizePt('A4', false)))
    const link = document.createElement('a')
    link.href = url
    link.download = 'rigtrack-tlac.pdf'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }
  const print = () => {
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
          {/* Pomenované strany: štítky na A4 na výšku, hárky podľa volieb (A4 / A5, na výšku / na šírku). */}
          <style>{`@page { margin: 0 } @page batch-a4 { size: A4 portrait; margin: 0 } @page batch-sheet { size: ${options.paper} ${options.landscape ? 'landscape' : 'portrait'}; margin: 0 } @media print { body * { visibility: hidden !important } .batch-print, .batch-print * { visibility: visible !important } .batch-print { position: absolute; inset: 0 } .batch-print img { display: block; width: 100%; height: auto; break-after: page } }`}</style>
          <div className="batch-print hidden print:block">
            {pages.map((page, index) => (
              <img key={index} src={page.canvas.toDataURL('image/jpeg', 0.92)} alt="" style={{ page: page.kind === 'label' ? 'batch-a4' : 'batch-sheet' }} />
            ))}
          </div>
        </>
      )}
      <Link to="/print" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Tlačová fronta
      </Link>
      <PageHeader
        title="Tlačiť všetko naraz"
        description={`${labelIds.length} štítkov cases (2 na A4) · ${contentIds.length} hárkov s obsahom (${options.paper}${options.landscape ? ', na šírku' : ''} – podľa volieb hárku)`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button disabled={!pages || pages.length === 0} onClick={print}>
              <Printer className="size-4" aria-hidden />
              Tlačiť
            </Button>
            <Button variant="outline" disabled={!pages || pages.length === 0} onClick={() => void downloadPdf()}>
              <FileDown className="size-4" aria-hidden />
              PDF
            </Button>
          </div>
        }
      />
      {!pages ? (
        <LoadingBlock />
      ) : pages.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-surface p-8 text-center text-sm text-muted-foreground">Nie je čo tlačiť – cases sa nenašli.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">{pages.length} strán. Po vytlačení vyprázdnite frontu v Tlačovej fronte.</p>
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
