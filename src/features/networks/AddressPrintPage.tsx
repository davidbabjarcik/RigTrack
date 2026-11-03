import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Download, FileDown, Printer } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { SelectField } from '@/components/ui/field'
import { downloadCanvas, fileSlug } from '@/features/cases/canvas'
import { buildPdf, canvasJpeg, pageSizePt } from '@/features/cases/sheetPdf'
import { useCompany } from '@/features/companies/company-context'
import { useDevices } from '@/features/devices/api'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { AddToPrintButton } from '@/features/print/AddToPrintButton'
import { formatOf } from '@/features/print/api'
import { useStaff } from '@/features/staff/useStaff'
import { can } from '@/lib/permissions'
import { fetchGuestDevices, networkKeys, useNetworks } from './api'
import { renderAddressPages } from './addressCanvas'
import { addressRows } from './model'

const ipKey = (ip: string) => (ip ? ip.split('.').map((part) => part.padStart(3, '0')).join('.') : '~')

/** IP tabuľka / MAC adresy na tlač: A4 alebo A5, na výšku alebo na šírku; tlač, PDF, PNG aj do tlačovej fronty. /networks/print?tab=ip */
export function AddressPrintPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const [params] = useSearchParams()
  const mode: 'ip' | 'mac' = params.get('tab') === 'mac' ? 'mac' : 'ip'
  const networkFilter = params.get('network') ?? ''
  const [paper, setPaper] = useState<'A4' | 'A5'>(params.get('paper') === 'A5' ? 'A5' : 'A4')
  const [landscape, setLandscape] = useState(params.get('landscape') === '1')
  const [printUrls, setPrintUrls] = useState<string[]>([])

  const networks = useNetworks(companyId)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId), enabled: can(company, 'equipment.view') })
  const devices = useDevices(companyId)
  const guests = useQuery({ queryKey: networkKeys.guests(companyId), queryFn: () => fetchGuestDevices(companyId), retry: false })
  const staff = useStaff(companyId)

  const allNetworks = useMemo(() => networks.data ?? [], [networks.data])
  const rows = useMemo(() => {
    const owner = (userId: string) => {
      const person = staff.people.find((candidate) => candidate.memberId === userId)
      return { name: person?.name ?? 'Bývalý člen', to: null }
    }
    const all = addressRows(equipment.data ?? [], devices.data ?? [], allNetworks, owner, guests.data ?? [])
    const filtered = all.filter((row) => !networkFilter || (networkFilter === 'none' ? !row.networkId : row.networkId === networkFilter))
    return mode === 'mac'
      ? filtered.filter((row) => row.mac).sort((a, b) => a.mac.localeCompare(b.mac))
      : filtered.filter((row) => row.ip || row.dhcp).sort((a, b) => ipKey(a.ip).localeCompare(ipKey(b.ip)))
  }, [equipment.data, devices.data, allNetworks, guests.data, staff.people, networkFilter, mode])
  const networkName = networkFilter === 'none' ? 'bez siete' : (allNetworks.find((network) => network.id === networkFilter)?.ssid ?? '')

  const pages = useMemo(
    () =>
      renderAddressPages({
        mode,
        paper,
        landscape,
        companyName: company.companyName,
        network: networkName,
        rows: rows.map((row) => ({
          ip: row.ip ? `${row.ip}${row.prefix ? `/${row.prefix}` : ''}` : row.dhcp ? 'DHCP' : '',
          mac: row.mac,
          name: row.name,
          detail: row.detail,
          network: allNetworks.find((network) => network.id === row.networkId)?.ssid ?? '',
          duplicate: row.duplicateIp,
          kind: row.source,
        })),
      }),
    [mode, paper, landscape, company.companyName, networkName, rows, allNetworks],
  )
  const previews = useMemo(() => pages.map((canvas) => canvas.toDataURL('image/png')), [pages])

  if (networks.isPending || equipment.isPending || devices.isPending) return <LoadingBlock />
  if (networks.isError) return <ErrorBlock message="Siete sa nepodarilo načítať." />

  const baseName = `${mode === 'ip' ? 'ip-tabulka' : 'mac-adresy'}-${fileSlug(networkName || 'vsetky')}`
  const downloadPdf = async () => {
    const images = await Promise.all(pages.map((canvas) => canvasJpeg(canvas, 0.92)))
    const url = URL.createObjectURL(buildPdf(images, pageSizePt(paper, landscape)))
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

  return (
    <>
      {printUrls.length > 0 && (
        <>
          <style>{`@page { size: ${paper} ${landscape ? 'landscape' : 'portrait'}; margin: 0 } @media print { body * { visibility: hidden !important } .sheet-print, .sheet-print * { visibility: visible !important } .sheet-print { position: absolute; inset: 0 } .sheet-print img { display: block; width: 100%; height: auto; break-after: page } }`}</style>
          <div className="sheet-print hidden print:block">
            {printUrls.map((url, index) => (
              <img key={index} src={url} alt="" />
            ))}
          </div>
        </>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <Link to={params.get('back') ?? `/networks?tab=${mode}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden />
          {params.get('back') === '/print' ? 'Späť do tlače' : 'Siete'}
        </Link>
        <span className="flex-1" />
        <AddToPrintButton companyId={companyId} kind="network" targetIds={[networkFilter && networkFilter !== 'none' ? networkFilter : companyId]} label={mode} format={formatOf(paper, landscape)} />
        <Button variant="outline" onClick={print}>
          <Printer className="size-4" aria-hidden />
          Tlačiť
        </Button>
        <Button variant="outline" onClick={() => void downloadPdf()}>
          <FileDown className="size-4" aria-hidden />
          PDF
        </Button>
        <Button variant="outline" onClick={() => void downloadPng()}>
          <Download className="size-4" aria-hidden />
          {pages.length > 1 ? `PNG (${pages.length})` : 'PNG'}
        </Button>
      </div>
      <div className="mb-4 flex flex-wrap gap-3 rounded-xl border bg-surface p-4 print:hidden">
        <SelectField label="Papier" className="w-32" value={paper} onChange={(e) => setPaper(e.target.value as 'A4' | 'A5')}>
          <option value="A4">A4</option>
          <option value="A5">A5</option>
        </SelectField>
        <SelectField label="Orientácia" className="w-40" value={landscape ? 'landscape' : 'portrait'} onChange={(e) => setLandscape(e.target.value === 'landscape')}>
          <option value="portrait">na výšku</option>
          <option value="landscape">na šírku</option>
        </SelectField>
        <p className="self-end pb-2 text-sm text-muted-foreground">
          {rows.length} {mode === 'ip' ? 'IP adries' : 'MAC adries'}
          {networkName ? ` · sieť ${networkName}` : ''} – filter sa berie zo Sietí.
        </p>
      </div>
      <div className="flex flex-col items-center gap-4 print:hidden">
        {previews.map((url, index) => (
          <img key={index} src={url} alt={`Strana ${index + 1}`} className="w-full rounded-lg border bg-white shadow-lg" style={{ maxWidth: landscape ? 1000 : 720 }} />
        ))}
      </div>
    </>
  )
}
