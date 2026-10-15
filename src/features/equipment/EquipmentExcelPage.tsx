import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, Download, FileUp } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { useCases } from '@/features/cases/useCases'
import { useCompany } from '@/features/companies/company-context'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { equipmentKeys, fetchEquipmentList } from './api'
import { parseWorkbook, type WorkbookResult } from './excel'
import { exportEquipment, readWorkbookFile, writeImport } from './excelIO'
import { KIND_LABELS } from './model'
import { useEquipmentLookups } from './useEquipmentLookups'

/** Export techniky do Excelu a import z neho, s náhľadom pred zápisom. */
export function EquipmentExcelPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const canEdit = can(company, 'equipment.edit')
  const queryClient = useQueryClient()
  const list = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const cases = useCases(companyId)
  const { categories, locations } = useEquipmentLookups(companyId)
  const fileInput = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [result, setResult] = useState<WorkbookResult | null>(null)

  const all = list.data ?? []
  const caseList = cases.data ?? []
  const download = useMutation({ mutationFn: () => exportEquipment(all, categories, locations, caseList) })
  const read = useMutation({
    mutationFn: readWorkbookFile,
    onSuccess: (sheets) =>
      setResult(
        parseWorkbook(
          sheets,
          new Set(all.map((item) => item.id)),
          new Set(caseList.map((item) => item.id)),
        ),
      ),
  })
  const save = useMutation({
    mutationFn: () => writeImport(companyId, result!, { equipment: all, categories, locations, cases: caseList }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['company', companyId] })
    },
  })

  if (list.isPending) return <LoadingBlock />
  if (list.isError) return <ErrorBlock message="Techniku sa nepodarilo načítať." onRetry={() => void list.refetch()} />

  const pick = (file: File | undefined) => {
    if (!file) return
    save.reset()
    read.mutate(file)
  }
  const creates = result?.items.filter((item) => !item.id) ?? []
  const updates = result?.items.filter((item) => item.id) ?? []
  const newCases = result?.cases.filter((item) => !item.id) ?? []
  const changedCases = result?.cases.filter((item) => item.id) ?? []
  // Case sa hľadá v existujúcich aj v tých, čo pribudnú z hárku Cases.
  const caseNames = new Set([...caseList, ...(result?.cases ?? [])].map((item) => item.name.toLowerCase()))
  const unknownCases = [...new Set((result?.items ?? []).map((item) => item.caseName).filter((name) => name && !caseNames.has(name.toLowerCase())))]

  return (
    <>
      <Link to="/equipment" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Technika
      </Link>
      <PageHeader title="Excel" description="Export a import techniky" />

      <section className="mb-6 rounded-xl border bg-surface p-4">
        <h2 className="font-medium">Export</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Stiahne techniku ({all.length}) a cases ({caseList.length}) ako jeden Excel: každá kategória techniky má vlastný hárok, cases
          sú na hárku „Cases“. Keď ešte nič nemáte, stiahnu sa prázdne hárky s hlavičkou a vysvetlivkami – stačí ich vyplniť a nahrať späť.
        </p>
        <Button className="mt-3" disabled={download.isPending} onClick={() => download.mutate()}>
          <Download className="size-4" aria-hidden />
          {download.isPending ? 'Pripravujem…' : all.length === 0 ? 'Stiahnuť prázdnu tabuľku' : 'Stiahnuť Excel'}
        </Button>
        {download.isError && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            Export sa nepodaril.
          </p>
        )}
      </section>

      {canEdit && (
        <section className="rounded-xl border bg-surface p-4">
          <h2 className="font-medium">Import</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Riadky bez ID sa pridajú ako nové, riadky s ID (z exportu) upravia existujúce. Názov hárku je kategória techniky, ak ju riadok
            nemá vyplnenú. Nič sa nezapíše, kým nepotvrdíte.
          </p>
          <div
            onDragOver={(event: DragEvent) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event: DragEvent) => {
              event.preventDefault()
              setDragging(false)
              pick(event.dataTransfer.files[0])
            }}
            className={cn('mt-3 rounded-xl border-2 border-dashed p-6 text-center', dragging && 'border-accent bg-accent/10')}
          >
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              tabIndex={-1}
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                pick(file)
              }}
            />
            <FileUp className="mx-auto size-7 text-muted-foreground" aria-hidden />
            <p className="mt-2 font-medium">Pretiahnite sem vyplnený Excel (.xlsx)</p>
            <Button variant="outline" size="sm" className="mt-3" disabled={read.isPending} onClick={() => fileInput.current?.click()}>
              {read.isPending ? 'Čítam…' : 'alebo vybrať súbor'}
            </Button>
            {read.isError && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                Súbor sa nepodarilo prečítať. Je to Excel .xlsx?
              </p>
            )}
          </div>

          {result && !save.isSuccess && (
            <div className="mt-4 flex flex-col gap-3">
              <p className="text-sm">
                Technika: pridá sa <strong>{creates.length}</strong>, upraví <strong>{updates.length}</strong>. Cases: pridá sa{' '}
                <strong>{newCases.length}</strong>, upraví <strong>{changedCases.length}</strong>.
              </p>
              {result.errors.length > 0 && (
                <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
                  <p className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="size-4 text-destructive" aria-hidden />
                    Tieto riadky treba opraviť ({result.errors.length}); kým tu sú chyby, nič sa nezapíše:
                  </p>
                  <ul className="mt-1 list-disc pl-5">
                    {result.errors.slice(0, 30).map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                  {result.errors.length > 30 && <p className="mt-1">…a ďalších {result.errors.length - 30}.</p>}
                </div>
              )}
              {unknownCases.length > 0 && (
                <p className="rounded-xl border border-amber-400/50 bg-amber-100/60 p-3 text-sm dark:bg-amber-950/40">
                  Tieto cases nepoznám, technika z nich bude bez case: {unknownCases.join(', ')}. Najprv ich založte v Cases.
                </p>
              )}
              {result.items.length > 0 && (
                <ul className="max-h-80 divide-y overflow-y-auto rounded-xl border text-sm">
                  {result.items.map((item) => (
                    <li key={item.row} className="flex gap-3 px-3 py-2">
                      <span className="w-28 shrink-0 truncate text-muted-foreground">
                        {item.sheet}, r. {item.row}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        <strong>{item.name}</strong> · {KIND_LABELS[item.kind]} · {item.quantity} ks{item.category && ` · ${item.category}`}
                      </span>
                      <span className={cn('shrink-0', item.id ? 'text-sky-700 dark:text-sky-300' : 'text-emerald-700 dark:text-emerald-400')}>
                        {item.id ? 'úprava' : 'nová'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {save.isError && (
                <p role="alert" className="text-sm text-destructive">
                  Zápis sa nepodaril (napr. inventárne číslo už existuje). Nové položky sa zapisujú naraz, takže sa nepridala žiadna; úpravy sa robia po jednej a časť z nich už mohla prebehnúť. Opravte súbor a skúste znova – opakovaná úprava nevadí.
                </p>
              )}
              <Button
                className="self-start"
                disabled={result.errors.length > 0 || result.items.length + result.cases.length === 0 || save.isPending}
                onClick={() => save.mutate()}
              >
                {save.isPending ? 'Zapisujem…' : 'Skontrolované – zapísať'}
              </Button>
            </div>
          )}
          {save.isSuccess && (
            <p role="status" className="mt-4 text-sm">
              Hotovo: technika pridaná {creates.length}, upravená {updates.length}; cases pridané {newCases.length}, upravené{' '}
              {changedCases.length}.{' '}
              <Link to="/equipment" className="font-medium text-accent hover:underline">
                Späť na techniku
              </Link>
            </p>
          )}
        </section>
      )}
    </>
  )
}
