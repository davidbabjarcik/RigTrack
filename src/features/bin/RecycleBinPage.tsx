import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAdminRole } from '@/lib/roles'
import { FileSpreadsheet, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { useCompany } from '@/features/companies/company-context'
import { downloadTable } from '@/lib/excelExport'
import { formatDateTime, todayIso } from '@/lib/format'
import { cn } from '@/lib/utils'
import { binKeys, fetchBin, purgeBin, restoreBinItem } from './api'
import { BIN_DAYS, BIN_EXPORT_COLUMNS, BIN_KIND_LABELS, BIN_KINDS, binExportRow, daysLeft, daysLeftLabel, type BinItem, type BinKind } from './model'

/** Kôš: zmazané záznamy, ktoré admin môže obnoviť alebo zmazať natrvalo. */
export function RecycleBinPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const isAdmin = isAdminRole(company.role)
  const queryClient = useQueryClient()
  const [kind, setKind] = useState<BinKind | ''>('')

  const bin = useQuery({ queryKey: binKeys.list(companyId), queryFn: () => fetchBin(companyId), enabled: isAdmin })
  // Obnova vráti záznam do zoznamov techniky, cases a dokumentov, preto celý strom firmy.
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['company', companyId] })
  const restore = useMutation({ mutationFn: (item: BinItem) => restoreBinItem(companyId, item), onSettled: refresh })
  const purgeOne = useMutation({ mutationFn: (item: BinItem) => purgeBin(companyId, 'one', item), onSettled: refresh })
  const empty = useMutation({ mutationFn: () => purgeBin(companyId, 'all'), onSettled: refresh })
  const busy = restore.isPending || purgeOne.isPending || empty.isPending
  // Exportuje to, čo je práve vidieť (aj s filtrom druhu).
  const download = useMutation({
    mutationFn: () => {
      const all = bin.data ?? []
      const shown = kind ? all.filter((item) => item.kind === kind) : all
      const now = new Date()
      return downloadTable(`kos-${todayIso()}.xlsx`, 'Kôš', BIN_EXPORT_COLUMNS, shown.map((item) => binExportRow(item, now, formatDateTime)))
    },
  })

  if (!isAdmin) return <ErrorBlock message="Kôš môže otvoriť iba admin firmy." />

  const items = bin.data ?? []
  const visible = kind ? items.filter((item) => item.kind === kind) : items
  const now = new Date()
  const restoreError = restore.error as { code?: string; message?: string } | null

  return (
    <>
      <PageHeader
        title="Kôš"
        description={`Zmazané záznamy sa dajú ${BIN_DAYS} dní obnoviť, potom sa zmažú natrvalo`}
        action={
          items.length > 0 && (
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                disabled={download.isPending}
                onClick={() => download.mutate()}
              >
                <FileSpreadsheet className="size-4" aria-hidden />
                Export do Excelu
              </Button>
              <Button
                variant="destructive"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`Natrvalo zmazať všetkých ${items.length} položiek v koši? Tento krok sa nedá vrátiť.`)) empty.mutate()
                }}
              >
                <Trash2 className="size-4" aria-hidden />
                {empty.isPending ? 'Mažem…' : 'Vyprázdniť kôš'}
              </Button>
            </div>
          )
        }
      />

      {items.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Druh položky">
          {(['', ...BIN_KINDS] as const)
            .filter((option) => option === '' || items.some((item) => item.kind === option))
            .map((option) => (
              <button
                key={option || 'all'}
                type="button"
                aria-pressed={kind === option}
                onClick={() => setKind(option)}
                className={cn(
                  'h-9 rounded-lg border px-3 text-sm font-medium',
                  kind === option ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted',
                )}
              >
                {option ? BIN_KIND_LABELS[option] : 'Všetko'} ({option ? items.filter((item) => item.kind === option).length : items.length})
              </button>
            ))}
        </div>
      )}

      {(restore.isError || purgeOne.isError || empty.isError) && (
        <p role="alert" className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {restoreError?.code === '23505'
            ? 'Obnova zlyhala: iný záznam už používa rovnaké označenie (inventárne číslo). Zmeňte ho tam a skúste to znova.'
            : restoreError?.code === '23514'
              ? restoreError.message
              : 'Zmena sa nepodarila. Skúste to znova.'}
        </p>
      )}

      {bin.isPending ? (
        <LoadingBlock />
      ) : bin.isError ? (
        <ErrorBlock message="Kôš sa nepodarilo načítať. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie." onRetry={() => void bin.refetch()} />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-surface px-6 py-16 text-center">
          <p className="font-medium">Kôš je prázdny</p>
          <p className="mt-1 text-sm text-muted-foreground">Zmazaná technika, cases, fotky a dokumenty sa objavia tu.</p>
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {visible.map((item) => (
            <li key={`${item.kind}-${item.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1 basis-56">
                <p className="truncate font-medium">{item.label || '(bez názvu)'}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {[BIN_KIND_LABELS[item.kind], item.detail].filter(Boolean).join(' · ')}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  zmazal {item.deletedByName || 'neznámy'} · {formatDateTime(item.deletedAt)} · {daysLeftLabel(daysLeft(item.deletedAt, now))}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="sm" disabled={busy} onClick={() => restore.mutate(item)}>
                  <RotateCcw className="size-4" aria-hidden />
                  Obnoviť
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Zmazať natrvalo: ${item.label}`}
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(`Natrvalo zmazať „${item.label}“? Tento krok sa nedá vrátiť.`)) purgeOne.mutate(item)
                  }}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
