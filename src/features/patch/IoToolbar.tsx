import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, FileDown, FileText, FileUp, History, PackagePlus } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { Equipment } from '@/features/equipment/model'
import { addEventEquipment, setEventEquipmentQuantity } from '@/features/events/api'
import type { CompanyEvent } from '@/features/events/model'
import { tf, tx } from '@/lib/i18n'
import { applySoundTemplate } from './dmxApi'
import { inputsCsv, ioWarnings, outputsCsv, parseInputsCsv, parseRider, standCounts, usedEquipment } from './ioTools'
import { PATCH_SOURCE_LABELS, type PatchFields, type PatchLine } from './model'
import { fetchIoVersionCount, OUTPUT_KIND_LABELS, saveIoVersion, type OutputLine } from './outputs'

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/**
 * Nástroje input / output listu: varovania pred odoslaním, export a import CSV, návrh z PDF ridera (vždy na kontrolu),
 * technika do pack listu akcie a uloženie verzie.
 */
export function IoTools({ companyId, event, lines, outputs, equipment, canEdit, onChanged }: {
  companyId: string
  event: CompanyEvent
  lines: PatchLine[]
  outputs: OutputLine[]
  equipment: Equipment[]
  canEdit: boolean
  onChanged: () => void
}) {
  const queryClient = useQueryClient()
  const csvInput = useRef<HTMLInputElement>(null)
  const riderInput = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<{ source: string; rows: PatchFields[] } | null>(null)
  const [importError, setImportError] = useState('')
  const [notice, setNotice] = useState('')
  const versions = useQuery({ queryKey: ['company', companyId, 'events', event.id, 'io-versions'], queryFn: () => fetchIoVersionCount(companyId, event.id) })
  const equipmentName = (id: string) => equipment.find((item) => item.id === id)?.name
  const mixerChannels = Math.max(0, ...event.equipment.map((line) => equipment.find((item) => item.id === line.equipmentId)?.attributes.mixerChannels ?? 0)) || null
  const warnings = ioWarnings(lines, outputs, equipment, mixerChannels)
  const stands = standCounts(lines)

  const apply = useMutation({
    mutationFn: async (mode: 'replace' | 'append') => {
      const rows = preview?.rows ?? []
      if (mode === 'replace') return applySoundTemplate(companyId, event.id, rows)
      const start = Math.max(0, ...lines.map((line) => line.channel))
      const keep = lines.map(({ id: _id, ...fields }) => (void _id, fields))
      return applySoundTemplate(companyId, event.id, [...keep, ...rows.map((row, index) => ({ ...row, channel: Math.min(512, start + index + 1) }))])
    },
    onSuccess: () => {
      setPreview(null)
      onChanged()
    },
  })
  // Technika z input / output listu do techniky akcie (pack list): doplní chýbajúce kusy, nič neuberie.
  const toEvent = useMutation({
    mutationFn: async () => {
      let changed = 0
      for (const [id, count] of usedEquipment(lines, outputs)) {
        const item = equipment.find((piece) => piece.id === id)
        const want = Math.min(count, item ? Math.max(1, item.quantity) : count)
        const existing = event.equipment.find((line) => line.equipmentId === id)
        if (!existing) {
          await addEventEquipment(companyId, event.id, id)
          if (want > 1) await setEventEquipmentQuantity(event.id, id, want)
          changed++
        } else if (existing.quantity < want) {
          await setEventEquipmentQuantity(event.id, id, want)
          changed++
        }
      }
      return changed
    },
    onSuccess: async (changed) => {
      setNotice(changed > 0 ? tf('Do techniky akcie pridané alebo doplnené: {0} položiek.', changed) : tx('Všetka technika z listu už na akcii je.'))
      await queryClient.invalidateQueries({ queryKey: ['company', companyId, 'events'] })
    },
  })
  const version = useMutation({
    mutationFn: () => saveIoVersion(event.id),
    onSuccess: (next) => {
      setNotice(tf('Uložená verzia {0} input / output listu.', next))
      void versions.refetch()
    },
  })

  const readCsv = async (file: File) => {
    const rows = parseInputsCsv(await file.text(), equipment)
    if (rows.length === 0) return setImportError(tx('V súbore sa nenašli kanály.'))
    setImportError('')
    setPreview({ source: file.name, rows })
  }
  const readRider = async (file: File) => {
    try {
      const { extractPdfLines } = await import('@/features/orders/import/pdf')
      const rows = parseRider(await extractPdfLines(file), equipment)
      if (rows.length === 0) return setImportError(tx('V rideri sa nenašiel input list (riadky „1 Kick In  Beta 91A“).'))
      setImportError('')
      setPreview({ source: file.name, rows })
    } catch {
      setImportError(tx('PDF sa nepodarilo prečítať.'))
    }
  }

  return (
    <div className="mb-3 flex flex-col gap-2">
      {warnings.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm" aria-label={tx('Varovania')}>
          {warnings.map((warning, index) => (
            <li key={index} className="flex items-start gap-2 rounded-lg border border-amber-400 bg-amber-50 p-2 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {warning.text}
            </li>
          ))}
        </ul>
      )}
      {stands.length > 0 && <p className="text-sm text-muted-foreground">{tf('Stojany: {0}', stands.join(', '))}</p>}
      <div className="flex flex-wrap gap-2">
        {lines.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => download(`input-list-${event.name}.csv`, inputsCsv(lines, equipmentName))}>
            <FileDown className="size-4" aria-hidden />
            {tx('CSV vstupy')}
          </Button>
        )}
        {outputs.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => download(`output-list-${event.name}.csv`, outputsCsv(outputs, equipmentName, (kind) => OUTPUT_KIND_LABELS[kind]))}>
            <FileDown className="size-4" aria-hidden />
            {tx('CSV výstupy')}
          </Button>
        )}
        {canEdit && (
          <>
            <Button size="sm" variant="outline" onClick={() => csvInput.current?.click()}>
              <FileUp className="size-4" aria-hidden />
              {tx('Import CSV')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => riderInput.current?.click()}>
              <FileText className="size-4" aria-hidden />
              {tx('Z PDF ridera')}
            </Button>
            {(lines.some((line) => line.equipmentId) || outputs.some((output) => output.equipmentId)) && (
              <Button size="sm" variant="outline" disabled={toEvent.isPending} onClick={() => toEvent.mutate()}>
                <PackagePlus className="size-4" aria-hidden />
                {tx('Do techniky akcie')}
              </Button>
            )}
            {lines.length + outputs.length > 0 && (
              <Button size="sm" variant="ghost" disabled={version.isPending} onClick={() => version.mutate()}>
                <History className="size-4" aria-hidden />
                {tf('Uložiť verziu ({0})', versions.data ?? 0)}
              </Button>
            )}
          </>
        )}
        <input ref={csvInput} type="file" accept=".csv,text/csv,.txt" className="sr-only" tabIndex={-1} onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void readCsv(file) }} />
        <input ref={riderInput} type="file" accept="application/pdf,.pdf" className="sr-only" tabIndex={-1} onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void readRider(file) }} />
      </div>
      {importError && <p role="alert" className="text-sm text-destructive">{importError}</p>}
      {notice && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">{notice}</p>}
      {(toEvent.isError || version.isError) && <p role="alert" className="text-sm text-destructive">{tx('Nepodarilo sa – skontrolujte oprávnenia.')}</p>}

      {preview && (
        <div className="rounded-xl border border-accent/40 bg-accent/5 p-3 text-sm" role="dialog" aria-label={tx('Návrh input listu')}>
          <p className="mb-2 font-medium">{tf('Návrh z „{0}“ – {1} kanálov. Skontrolujte, nič sa neuloží bez potvrdenia.', preview.source, preview.rows.length)}</p>
          <div className="max-h-80 overflow-auto rounded-lg border bg-surface">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="px-2 py-1">{tx('Kanál')}</th>
                  <th className="px-2 py-1">{tx('Názov')}</th>
                  <th className="px-2 py-1">{tx('Zdroj')}</th>
                  <th className="px-2 py-1">48 V</th>
                  <th className="px-2 py-1">{tx('Poznámka')}</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-2 py-1 font-mono">{row.channel}</td>
                    <td className="px-2 py-1">{row.name}</td>
                    <td className="px-2 py-1">{row.equipmentId ? equipmentName(row.equipmentId) : tx(PATCH_SOURCE_LABELS[row.source])}</td>
                    <td className="px-2 py-1">{row.phantom ? '✓' : ''}</td>
                    <td className="px-2 py-1 text-muted-foreground">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" disabled={apply.isPending} onClick={() => (lines.length === 0 || window.confirm(tx('Nahradiť doterajší input list týmto návrhom?'))) && apply.mutate('replace')}>
              {lines.length > 0 ? tx('Nahradiť input list') : tx('Uložiť input list')}
            </Button>
            {lines.length > 0 && (
              <Button size="sm" variant="outline" disabled={apply.isPending} onClick={() => apply.mutate('append')}>
                {tx('Pridať za koniec')}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>{tx('Zrušiť')}</Button>
          </div>
          {apply.isError && <p role="alert" className="mt-2 text-destructive">{tx('Input list sa nepodarilo uložiť.')}</p>}
        </div>
      )}
    </div>
  )
}
