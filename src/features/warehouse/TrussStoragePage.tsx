import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowLeft, ArrowUp, Move, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { SelectField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import type { Equipment } from '@/features/equipment/model'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { fetchTrussLayout, saveTrussLayout, trussKeys } from './api'
import { MAX_TRUSS_GRID, moveStack, pieceColor, pieceHeightCm, placedCounts, stackAt, stackHeightCm, withStack, type TrussLayout } from './truss'

type Cell = { col: number; row: number }

/** Krátky popis dielu: „F34 3 m“, pri rohu tvar. */
const pieceLabel = (piece: Equipment | undefined) => piece?.name ?? 'zmazaný diel'

/**
 * Sklad → Hliník: mriežka zhora (kde stojí ktorý stoh trussov) a pohľad spredu (diely nastojato na sebe,
 * farba podľa dĺžky). Klik na políčko ukáže stoh; diely sa pridávajú navrch, dajú sa preusporiadať a stoh presunúť.
 */
export function TrussStoragePage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const canEdit = can(company, 'warehouse.manage')
  const queryClient = useQueryClient()
  const layoutQuery = useQuery({ queryKey: trussKeys.layout(companyId), queryFn: () => fetchTrussLayout(companyId) })
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const [selected, setSelected] = useState<Cell | null>(null)
  const [moving, setMoving] = useState(false)
  const [adding, setAdding] = useState('')
  const [addCount, setAddCount] = useState(1)

  const save = useMutation({
    mutationFn: (layout: TrussLayout) => saveTrussLayout(companyId, layout),
    onMutate: (layout) => {
      const previous = queryClient.getQueryData(trussKeys.layout(companyId))
      queryClient.setQueryData(trussKeys.layout(companyId), { layout, ready: true })
      return { previous }
    },
    onError: (_error, _layout, context) => queryClient.setQueryData(trussKeys.layout(companyId), context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: trussKeys.layout(companyId) }),
  })

  if (layoutQuery.isPending || equipment.isPending) return <LoadingBlock />
  if (layoutQuery.isError || equipment.isError) return <ErrorBlock message="Hliník sa nepodarilo načítať." onRetry={() => void Promise.all([layoutQuery.refetch(), equipment.refetch()])} />

  const { layout, ready } = layoutQuery.data
  const trusses = equipment.data.filter((item) => item.kind === 'truss' && item.status !== 'retired')
  const byId = new Map(equipment.data.map((item) => [item.id, item]))
  const placed = placedCounts(layout)
  const stack = selected ? stackAt(layout, selected.col, selected.row) : undefined
  const change = (next: TrussLayout) => save.mutate(next)

  const clickCell = (cell: Cell) => {
    if (moving && selected && canEdit) {
      change(moveStack(layout, selected, cell))
      setMoving(false)
      setSelected(cell)
      return
    }
    setMoving(false)
    setSelected(selected && selected.col === cell.col && selected.row === cell.row ? null : cell)
  }

  const setPieces = (pieces: string[]) => selected && change(withStack(layout, selected.col, selected.row, pieces))
  const free = (item: Equipment) => item.quantity - (placed.get(item.id) ?? 0)
  const totals = { all: trusses.reduce((sum, item) => sum + item.quantity, 0), placed: trusses.reduce((sum, item) => sum + Math.min(item.quantity, placed.get(item.id) ?? 0), 0) }

  return (
    <>
      <PageHeader
        title="Hliník v sklade"
        description={`${layout.stacks.length} stohov · uložených ${totals.placed} z ${totals.all} kusov trussu`}
        action={
          <Link to={layout.spotId ? `/warehouse?spot=${layout.spotId}` : '/warehouse'} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden />
            Sklad
          </Link>
        }
      />
      {!ready && (
        <p className="mb-4 rounded-xl border border-dashed bg-surface p-4 text-sm text-muted-foreground">
          Najprv zadajte rozmery skladu (Sklad alebo Nastavenia → Sklad). Ak už sú zadané, treba v Supabase spustiť migráciu 0130.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <div>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">Zhora – klik na políčko ukáže stoh{moving && ' · kliknite, kam stoh presunúť'}</h2>
            <TopView layout={layout} byId={byId} selected={selected} moving={moving} onClick={clickCell} />
          </div>
          <div>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">Spredu – diely nastojato, zadné rady bledšie</h2>
            <FrontView layout={layout} byId={byId} selected={selected} onSelect={(cell) => setSelected(cell)} />
            <Legend trusses={trusses} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {selected && (
            <section className="rounded-xl border bg-surface p-4" aria-labelledby="stack-heading">
              <div className="mb-2 flex items-center gap-2">
                <h2 id="stack-heading" className="flex-1 font-semibold">
                  Stĺpec {selected.col + 1}, rad {selected.row + 1}
                  {stack && <span className="ml-2 text-sm font-normal text-muted-foreground">{(stackHeightCm(stack, byId, layout.cellCm) / 100).toFixed(2).replace('.', ',')} m vysoký</span>}
                </h2>
                {canEdit && stack && (
                  <Button size="sm" variant={moving ? 'default' : 'outline'} onClick={() => setMoving(!moving)}>
                    <Move className="size-4" aria-hidden />
                    {moving ? 'Kliknite na cieľ…' : 'Presunúť stoh'}
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="size-8 p-0" aria-label="Zavrieť" onClick={() => setSelected(null)}>
                  <X className="size-4" aria-hidden />
                </Button>
              </div>
              {!stack ? (
                <p className="text-sm text-muted-foreground">Prázdne políčko.</p>
              ) : (
                <ol className="divide-y rounded-lg border text-sm">
                  {[...stack.pieces.entries()].reverse().map(([index, id]) => (
                    <li key={`${index}-${id}`} className="flex items-center gap-2 px-3 py-1.5">
                      <span className="size-3 shrink-0 rounded-sm" style={{ background: pieceColor(byId.get(id)) }} aria-hidden />
                      <span className="min-w-0 flex-1 truncate">
                        {pieceLabel(byId.get(id))}
                        {index === stack.pieces.length - 1 && <span className="ml-1 text-xs text-muted-foreground">(navrchu)</span>}
                        {index === 0 && <span className="ml-1 text-xs text-muted-foreground">(dole)</span>}
                      </span>
                      {canEdit && (
                        <>
                          <Button size="sm" variant="ghost" className="size-7 p-0" aria-label="Vyššie" disabled={index === stack.pieces.length - 1} onClick={() => setPieces(swap(stack.pieces, index, index + 1))}>
                            <ArrowUp className="size-4" aria-hidden />
                          </Button>
                          <Button size="sm" variant="ghost" className="size-7 p-0" aria-label="Nižšie" disabled={index === 0} onClick={() => setPieces(swap(stack.pieces, index, index - 1))}>
                            <ArrowDown className="size-4" aria-hidden />
                          </Button>
                          <Button size="sm" variant="ghost" className="size-7 p-0" aria-label={`Vybrať ${pieceLabel(byId.get(id))}`} onClick={() => setPieces(stack.pieces.filter((_, i) => i !== index))}>
                            <X className="size-4" aria-hidden />
                          </Button>
                        </>
                      )}
                    </li>
                  ))}
                </ol>
              )}
              {canEdit && (
                <form
                  className="mt-3 flex flex-wrap items-end gap-2 border-t pt-3"
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (!adding) return
                    setPieces([...(stack?.pieces ?? []), ...Array.from({ length: Math.max(1, Math.min(20, addCount)) }, () => adding)])
                  }}
                >
                  <SelectField label="Pridať navrch" className="min-w-52 flex-1" value={adding} onChange={(e) => setAdding(e.target.value)}>
                    <option value="">— vyberte diel —</option>
                    {trusses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} (voľných {Math.max(0, free(item))} z {item.quantity})
                      </option>
                    ))}
                  </SelectField>
                  <label className="flex flex-col gap-1 text-sm">
                    Kusov
                    <input type="number" min={1} max={20} className="h-10 w-16 rounded-lg border bg-surface px-2 tabular-nums" value={addCount} onChange={(e) => setAddCount(Number(e.target.value))} />
                  </label>
                  <Button type="submit" disabled={!adding || save.isPending}>
                    <Plus className="size-4" aria-hidden />
                    Pridať
                  </Button>
                </form>
              )}
            </section>
          )}

          <section className="rounded-xl border bg-surface p-4" aria-labelledby="truss-list-heading">
            <h2 id="truss-list-heading" className="mb-2 font-semibold">
              Trussy v technike
            </h2>
            {trusses.length === 0 ? (
              <p className="text-sm text-muted-foreground">V technike zatiaľ nie je žiadny truss (druh Stage – hliník / truss).</p>
            ) : (
              <ul className="divide-y text-sm">
                {trusses.map((item) => {
                  const count = placed.get(item.id) ?? 0
                  return (
                    <li key={item.id} className="flex items-center gap-2 py-1.5">
                      <span className="size-3 shrink-0 rounded-sm" style={{ background: pieceColor(item) }} aria-hidden />
                      <Link to={`/equipment/${item.id}`} className="min-w-0 flex-1 truncate hover:underline">
                        {item.name}
                      </Link>
                      <span className={cn('tabular-nums', count > item.quantity ? 'text-destructive' : count < item.quantity ? 'text-muted-foreground' : 'text-emerald-600')}>
                        {count} / {item.quantity}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
            <p className="mt-2 text-xs text-muted-foreground">uložené v stohoch / spolu · červené = v stohoch je viac kusov, ako je v technike</p>
          </section>

          {canEdit && <GridSettings layout={layout} busy={save.isPending} onSave={change} />}
          {save.isError && (
            <p role="alert" className="text-sm text-destructive">
              {save.error.message || 'Zmenu sa nepodarilo uložiť.'}
            </p>
          )}
        </div>
      </div>
    </>
  )
}

function swap(list: string[], a: number, b: number) {
  const next = [...list]
  ;[next[a], next[b]] = [next[b], next[a]]
  return next
}

function GridSettings({ layout, busy, onSave }: { layout: TrussLayout; busy: boolean; onSave: (layout: TrussLayout) => void }) {
  const [form, setForm] = useState({ cols: layout.cols, rows: layout.rows, cellCm: layout.cellCm })
  const outside = layout.stacks.filter((stack) => stack.col >= form.cols || stack.row >= form.rows).length
  return (
    <form
      className="flex flex-wrap items-end gap-2 rounded-xl border bg-surface p-4 text-sm"
      onSubmit={(event) => {
        event.preventDefault()
        if (outside > 0 && !window.confirm(`${outside} stohov je mimo novej mriežky – zmiznú. Pokračovať?`)) return
        onSave({ ...layout, ...form, stacks: layout.stacks.filter((stack) => stack.col < form.cols && stack.row < form.rows) })
      }}
    >
      <p className="w-full font-semibold">Miesto na hliník</p>
      {(
        [
          ['cols', 'Stĺpcov', 1, MAX_TRUSS_GRID],
          ['rows', 'Radov', 1, MAX_TRUSS_GRID],
          ['cellCm', 'Políčko (cm)', 20, 100],
        ] as const
      ).map(([key, label, min, max]) => (
        <label key={key} className="flex flex-col gap-1">
          {label}
          <input type="number" min={min} max={max} className="h-9 w-20 rounded-lg border bg-surface px-2 tabular-nums" value={form[key]} onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })} />
        </label>
      ))}
      <Button type="submit" size="sm" disabled={busy}>
        Uložiť
      </Button>
      <p className="w-full text-xs text-muted-foreground">Políčko = profil trussu s medzerou (napr. 29 cm profil → 35 cm). Spolu {((form.cols * form.cellCm) / 100).toFixed(1).replace('.', ',')} × {((form.rows * form.cellCm) / 100).toFixed(1).replace('.', ',')} m.</p>
    </form>
  )
}

type ViewProps = { layout: TrussLayout; byId: Map<string, Equipment>; selected: Cell | null }

/** Zhora: mriežka políčok, stoh ako štvorec vo farbe vrchného dielu s počtom kusov. */
function TopView({ layout, byId, selected, moving, onClick }: ViewProps & { moving: boolean; onClick: (cell: Cell) => void }) {
  const size = 40
  const width = layout.cols * size
  const height = layout.rows * size
  return (
    <svg viewBox={`-4 -4 ${width + 8} ${height + 8}`} className="block max-h-[420px] w-full rounded-xl border bg-[#0b0f17]" role="group" aria-label="Hliník zhora">
      {Array.from({ length: layout.rows }, (_, row) =>
        Array.from({ length: layout.cols }, (_, col) => {
          const stack = stackAt(layout, col, row)
          const active = selected?.col === col && selected.row === row
          const top = stack ? byId.get(stack.pieces.at(-1)!) : undefined
          const color = stack ? pieceColor(top) : undefined
          return (
            <g key={`${col}-${row}`} role="button" tabIndex={0} aria-label={`Stĺpec ${col + 1}, rad ${row + 1}${stack ? `: ${stack.pieces.length} ks` : ', prázdne'}`} className="cursor-pointer outline-none" onClick={() => onClick({ col, row })} onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && onClick({ col, row })}>
              <rect x={col * size} y={row * size} width={size} height={size} fill={active ? 'rgba(245,158,11,0.18)' : moving ? 'rgba(255,255,255,0.03)' : 'transparent'} stroke="#1f3b1f" strokeWidth={0.6} />
              {stack && (
                <>
                  <rect x={col * size + 5} y={row * size + 5} width={size - 10} height={size - 10} rx={2} fill="none" stroke={color} strokeWidth={3} />
                  {[0, 1].map((dx) => [0, 1].map((dy) => <circle key={`${dx}${dy}`} cx={col * size + 5 + dx * (size - 10)} cy={row * size + 5 + dy * (size - 10)} r={2.4} fill={color} />))}
                  <text x={col * size + size / 2} y={row * size + size / 2} fill="#f8fafc" fontSize={11} fontWeight={700} textAnchor="middle" dominantBaseline="central">
                    {stack.pieces.length}
                  </text>
                </>
              )}
              {active && <rect x={col * size + 1} y={row * size + 1} width={size - 2} height={size - 2} fill="none" stroke="#f59e0b" strokeWidth={2} />}
            </g>
          )
        }),
      )}
    </svg>
  )
}

/** Spredu: v každom stĺpci stohy od zadného radu po predný; diel ako mriežkový obdĺžnik vo farbe dĺžky. */
function FrontView({ layout, byId, selected, onSelect }: ViewProps & { onSelect: (cell: Cell) => void }) {
  const cell = layout.cellCm
  const tallest = Math.max(200, ...layout.stacks.map((stack) => stackHeightCm(stack, byId, cell)))
  const width = layout.cols * cell
  const pad = 20
  const ordered = [...layout.stacks].sort((a, b) => a.row - b.row)
  return (
    <svg viewBox={`${-pad} ${-pad} ${width + pad * 2} ${tallest + pad * 2}`} className="block max-h-[460px] w-full rounded-xl border bg-[#0b0f17]" role="group" aria-label="Hliník spredu">
      {/* Metre na výšku. */}
      {Array.from({ length: Math.floor(tallest / 100) + 1 }, (_, m) => (
        <g key={m}>
          <line x1={-pad} x2={width + pad} y1={tallest - m * 100} y2={tallest - m * 100} stroke="#1f3b1f" strokeWidth={m === 0 ? 2 : 0.8} />
          {m > 0 && (
            <text x={-pad + 2} y={tallest - m * 100 - 3} fill="#4d7c0f" fontSize={10}>
              {m} m
            </text>
          )}
        </g>
      ))}
      {ordered.map((stack) => {
        const back = layout.rows - 1 - stack.row
        const opacity = Math.max(0.35, 1 - back * 0.22)
        const inset = cell * 0.08
        let y = tallest
        const active = selected?.col === stack.col && selected.row === stack.row
        return (
          <g key={`${stack.col}-${stack.row}`} opacity={opacity} className="cursor-pointer" onClick={() => onSelect({ col: stack.col, row: stack.row })}>
            {stack.pieces.map((id, index) => {
              const piece = byId.get(id)
              const h = pieceHeightCm(piece, cell)
              y -= h
              const x = stack.col * cell + inset
              const w = cell - inset * 2
              const color = pieceColor(piece)
              const bays = Math.max(1, Math.round(h / w))
              return (
                <g key={index}>
                  <rect x={x} y={y + 1} width={w} height={h - 2} fill="#0b0f17" stroke={color} strokeWidth={2.4} />
                  {h > 20 &&
                    Array.from({ length: bays }, (_, bay) => {
                      const top = y + 1 + ((h - 2) / bays) * bay
                      const bottom = top + (h - 2) / bays
                      return <polyline key={bay} points={`${x},${bottom} ${x + w},${top} ${x},${top}`} fill="none" stroke={color} strokeWidth={1.2} />
                    })}
                </g>
              )
            })}
            {active && <rect x={stack.col * cell + 1} y={y - 3} width={cell - 2} height={tallest - y + 3} fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="6 4" />}
          </g>
        )
      })}
    </svg>
  )
}

/** Legenda farieb: dĺžky rovných dielov, rohy, príslušenstvo. */
function Legend({ trusses }: { trusses: Equipment[] }) {
  const entries = new Map<string, string>()
  for (const item of trusses) {
    const a = item.attributes
    const label = a.trussType === 'accessory' ? 'príslušenstvo' : a.trussShape && a.trussShape !== 'straight' ? 'rohy, T, kríže' : a.lengthM !== undefined ? `${String(a.lengthM).replace('.', ',')} m` : 'iné'
    if (!entries.has(label)) entries.set(label, pieceColor(item))
  }
  if (entries.size === 0) return null
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Legenda">
      {[...entries].map(([label, color]) => (
        <li key={label} className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm" style={{ background: color }} aria-hidden />
          {label}
        </li>
      ))}
    </ul>
  )
}
