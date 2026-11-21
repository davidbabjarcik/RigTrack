import { useQuery } from '@tanstack/react-query'
import { Download, RotateCcw, ScanLine } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { SelectField } from '@/components/ui/field'
import { caseTitle } from '@/features/cases/model'
import { useCases } from '@/features/cases/useCases'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { useEvents } from '@/features/events/useEvents'
import { useLoans } from '@/features/loans/useLoans'
import { fetchWarehouse, warehouseKeys } from '@/features/warehouse/api'
import { isStructure } from '@/features/warehouse/model'
import { formatDate, todayIso } from '@/lib/format'
import { tf, tx } from '@/lib/i18n'
import { addScan, type Scanned } from './bulkMove'
import { expectedItems, inventoryReport, outNow, scannedKeys, type Expected } from './inventory'
import { LiveScanner } from './LiveScanner'
import { parseQr } from './qr'

type Saved = { spotId: string; scanned: Scanned[]; startedOn: string }

// Rozpracovaná inventúra sa pamätá v tomto prehliadači (dá sa prerušiť a pokračovať).
const storageKey = (companyId: string) => `rigtrack.inventory.${companyId}`
function load(companyId: string): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey(companyId)) ?? 'null') as Saved | null
    if (raw && Array.isArray(raw.scanned) && typeof raw.spotId === 'string') return raw
  } catch {
    // Pokazený záznam sa ignoruje.
  }
  return { spotId: '', scanned: [], startedOn: todayIso() }
}
function store(companyId: string, value: Saved) {
  try {
    localStorage.setItem(storageKey(companyId), JSON.stringify(value))
  } catch {
    // Bez úložiska inventúra funguje, len sa nepamätá.
  }
}

/** Inventúra: prejdete sklad s mobilom, naskenujete štítky a appka ukáže, čo chýba, čo je vonku a čo je navyše. */
export function InventoryPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const today = todayIso()
  const [state, setState] = useState<Saved>(() => load(companyId))
  const [scanning, setScanning] = useState(false)
  const update = (next: Saved) => {
    setState(next)
    store(companyId, next)
  }

  const cases = useCases(companyId)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const plan = useQuery({ queryKey: warehouseKeys.plan(companyId), queryFn: () => fetchWarehouse(companyId), retry: false })
  const events = useEvents(companyId)
  const loans = useLoans(companyId)
  const spots = (plan.data?.spots ?? []).filter((spot) => !isStructure(spot.kind))
  const all = equipment.data ?? []
  const boxes = cases.data ?? []

  const expected = expectedItems(boxes, all, state.spotId)
  const report = inventoryReport(expected, scannedKeys(state.scanned, all), outNow(events.data ?? [], loans.data ?? [], today))
  const nameOf = (item: Pick<Expected, 'kind' | 'id' | 'unit'>) => {
    if (item.kind === 'case') {
      const box = boxes.find((candidate) => candidate.id === item.id)
      return box ? caseTitle(box) : tx('Case')
    }
    const name = all.find((candidate) => candidate.id === item.id)?.name ?? tx('Technika')
    return item.unit !== null ? `${name} #${item.unit}` : name
  }
  const fromKey = (key: string): Expected => {
    const [kind, rest] = key.split(':') as ['case' | 'eq', string]
    const [id, unit] = rest.split('#')
    return { key, kind: kind === 'case' ? 'case' : 'equipment', id, unit: unit ? Number(unit) : null }
  }
  const linkOf = (item: Expected) => (item.kind === 'case' ? `/cases/${item.id}` : `/equipment/${item.id}${item.unit !== null ? `?unit=${item.unit}` : ''}`)

  const onScan = (text: string): string | void => {
    const qr = parseQr(text)
    if (!qr) return tx('Tento QR kód nie je z RigTracku.')
    if (qr.kind === 'spot') {
      const place = spots.find((candidate) => candidate.id === qr.id)
      if (!place) return tx('Toto miesto v pláne skladu nie je.')
      update({ ...state, spotId: place.id })
      return tf('Inventúra miesta: {0}', place.name)
    }
    const known = qr.kind === 'case' ? boxes.some((box) => box.id === qr.id) : all.some((piece) => piece.id === qr.id)
    if (!known) return tx('✗ Toto v evidencii nie je.')
    const result = addScan(state.scanned, qr)
    update({ ...state, scanned: result.list })
    const name = nameOf({ kind: qr.kind, id: qr.id, unit: qr.unit ?? null })
    return result.added ? tf('✓ {0}', name) : tf('{0} už je naskenované.', name)
  }

  const download = () => {
    const cell = (value: string) => `"${value.replace(/"/g, '""')}"`
    const lines = [['Stav', 'Čo', 'Druh'].map(cell).join(';')]
    const add = (state: string, items: Expected[]) => {
      for (const item of items) lines.push([state, nameOf(item), item.kind === 'case' ? 'case' : 'technika'].map(cell).join(';'))
    }
    add('Chýba', report.missing)
    add('Vonku (event / výpožička)', report.out)
    add('Navyše', report.extra.map(fromKey))
    add('Nájdené', report.found)
    const url = URL.createObjectURL(new Blob([String.fromCharCode(0xfeff) + lines.join(String.fromCharCode(13, 10))], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `inventura-${today}.csv`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  const section = (title: string, items: Expected[], tone: string) =>
    items.length > 0 && (
      <section className="mb-5">
        <h2 className={`mb-2 text-sm font-medium ${tone}`}>{tf('{0} ({1})', title, items.length)}</h2>
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {items.slice(0, 300).map((item) => (
            <li key={item.key}>
              <Link to={linkOf(item)} className="block px-4 py-2 text-sm hover:bg-muted">{nameOf(item)}</Link>
            </li>
          ))}
        </ul>
      </section>
    )

  return (
    <>
      <PageHeader
        title={tx('Inventúra')}
        description={tx('Prejdite sklad, naskenujte štítky cases a techniky a appka ukáže, čo chýba. Rozpracovanú inventúru si prehliadač pamätá.')}
        action={
          <Button onClick={() => setScanning(true)}>
            <ScanLine className="size-4" aria-hidden />{tx('Skenovať')}
          </Button>
        }
      />
      {scanning && <LiveScanner title={tx('Skenujte štítky za sebou')} onClose={() => setScanning(false)} onResult={onScan} />}

      <div className="mb-5 flex flex-wrap items-end gap-2">
        <SelectField label={tx('Čo sa kontroluje')} className="min-w-56" value={state.spotId} onChange={(changed) => update({ ...state, spotId: changed.target.value })}>
          <option value="">{tx('Celý sklad (cases a technika mimo cases)')}</option>
          {spots.map((spot) => (
            <option key={spot.id} value={spot.id}>{tf('Miesto: {0}', spot.name)}</option>
          ))}
        </SelectField>
        <Button variant="outline" disabled={expected.length === 0} onClick={download}>
          <Download className="size-4" aria-hidden />{tx('Stiahnuť (Excel)')}</Button>
        <Button
          variant="ghost"
          disabled={state.scanned.length === 0}
          onClick={() => window.confirm(tx('Začať novú inventúru? Naskenované sa zabudne.')) && update({ spotId: state.spotId, scanned: [], startedOn: today })}
        >
          <RotateCcw className="size-4" aria-hidden />{tx('Začať odznova')}</Button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [tx('Nájdené'), `${report.found.length} / ${expected.length}`],
          [tx('Chýba'), String(report.missing.length)],
          [tx('Vonku'), String(report.out.length)],
          [tx('Navyše'), String(report.extra.length)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-surface p-3">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>
      <p className="mb-5 text-sm text-muted-foreground">{tf('Začatá {0}. Vonku = je na prebiehajúcom evente alebo vydanej výpožičke.', formatDate(state.startedOn))}</p>

      {section(tx('Chýba'), report.missing, 'text-destructive')}
      {section(tx('Navyše – nemá tu byť'), report.extra.map(fromKey), 'text-accent')}
      {section(tx('Vonku'), report.out, 'text-muted-foreground')}
      {section(tx('Nájdené'), report.found, 'text-emerald-700 dark:text-emerald-400')}
    </>
  )
}
