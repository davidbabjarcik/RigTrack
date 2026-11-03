import { useQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { caseKeys, fetchCases } from '@/features/cases/api'
import { caseTitle } from '@/features/cases/model'
import type { Membership } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { eventKeys, fetchEvents } from '@/features/events/api'
import { fetchNotes, notesKey } from '@/features/notes/api'
import { fetchPartners, partnerKeys } from '@/features/partners/api'
import { ScanButton } from '@/features/scan/ScanButton'
import { fetchTasks, taskKeys } from '@/features/tasks/api'
import { fetchWarehouse, warehouseKeys } from '@/features/warehouse/api'
import { formatDate } from '@/lib/format'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { searchAll } from './searchAll'

/** Prehľad hore: Hľadať všade (technika, cases, eventy, firmy, kontakty, úlohy, poznámky, sklad) a Skenovať QR. */
export function GlobalSearch({ company }: { company: Membership }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const active = query.trim().length >= 2

  // Klik mimo zavrie výsledky.
  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  return (
    <div className="mb-4 flex items-start gap-2">
      <div ref={box} className="relative min-w-0 flex-1">
        <label className="sr-only" htmlFor="global-search">
          Hľadať všade
        </label>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          id="global-search"
          type="search"
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Hľadať všade – technika, case, event, kontakt, #7…"
          className="h-11 w-full rounded-xl border bg-surface pr-10 pl-9 text-base outline-none focus-visible:ring-2 focus-visible:ring-accent sm:text-sm"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setQuery('')
              setOpen(false)
            }
          }}
          aria-expanded={open && active}
          aria-controls="global-search-results"
        />
        {query && (
          <button
            type="button"
            aria-label="Vymazať hľadanie"
            className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            onClick={() => {
              setQuery('')
              setOpen(false)
            }}
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
        {open && active && <Results company={company} query={query} onPick={() => setOpen(false)} />}
      </div>
      <ScanButton label="Skenovať QR" />
    </div>
  )
}

/** Výsledky – dáta sa načítajú až pri hľadaní (väčšinou sú už v pamäti z iných stránok). */
function Results({ company, query, onPick }: { company: Membership; query: string; onPick: () => void }) {
  const companyId = company.companyId
  const navigate = useNavigate()
  const canEquipment = can(company, 'equipment.view')
  const canCases = can(company, 'cases.view')
  const canEvents = can(company, 'events.view')
  const canTasks = can(company, 'tasks.view')
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId), enabled: canEquipment })
  const cases = useQuery({ queryKey: caseKeys.list(companyId), queryFn: () => fetchCases(companyId), enabled: canCases })
  const events = useQuery({ queryKey: eventKeys.list(companyId), queryFn: () => fetchEvents(companyId), enabled: canEvents })
  const partners = useQuery({ queryKey: partnerKeys.list(companyId), queryFn: () => fetchPartners(companyId), enabled: canEvents, retry: false })
  const tasks = useQuery({ queryKey: taskKeys.list(companyId), queryFn: () => fetchTasks(companyId), enabled: canTasks, retry: false })
  const notes = useQuery({ queryKey: notesKey(companyId), queryFn: () => fetchNotes(companyId), retry: false })
  const plan = useQuery({ queryKey: warehouseKeys.plan(companyId), queryFn: () => fetchWarehouse(companyId), enabled: canCases, retry: false })

  const groups = useMemo(() => {
    const caseNames = new Map((cases.data ?? []).map((item) => [item.id, caseTitle(item)]))
    return searchAll(query, {
      equipment: equipment.data,
      cases: cases.data?.map((item) => ({ ...item, title: caseTitle(item) })),
      events: events.data,
      partners: partners.data,
      tasks: tasks.data,
      notes: notes.data,
      spots: plan.data?.spots,
      caseName: (id) => caseNames.get(id) ?? '',
      date: (iso) => formatDate(iso),
    })
  }, [query, equipment.data, cases.data, events.data, partners.data, tasks.data, notes.data, plan.data])
  const loading = [equipment, cases, events, partners, tasks, notes, plan].some((item) => item.isLoading)
  const first = groups[0]?.hits[0]

  // Enter otvorí prvý výsledok.
  useEffect(() => {
    const input = document.getElementById('global-search')
    if (!input || !first) return
    const onEnter = (event: KeyboardEvent) => {
      if (event.key !== 'Enter') return
      event.preventDefault()
      onPick()
      navigate(first.to)
    }
    input.addEventListener('keydown', onEnter)
    return () => input.removeEventListener('keydown', onEnter)
  }, [first, navigate, onPick])

  return (
    <div id="global-search-results" className="absolute inset-x-0 top-full z-30 mt-1 max-h-[70dvh] overflow-y-auto rounded-xl border bg-surface p-2 shadow-lg">
      {groups.length === 0 ? (
        <p className="px-2 py-3 text-sm text-muted-foreground">{loading ? 'Hľadám…' : 'Nič sa nenašlo.'}</p>
      ) : (
        groups.map((group) => (
          <section key={group.kind} className="mb-1 last:mb-0">
            <h3 className="px-2 pt-1.5 pb-1 text-xs font-medium text-muted-foreground uppercase">{group.label}</h3>
            <ul>
              {group.hits.map((hit) => (
                <li key={hit.id}>
                  <Link to={hit.to} onClick={onPick} className={cn('flex flex-col rounded-lg px-2 py-1.5 hover:bg-muted', hit === first && 'bg-muted/60')}>
                    <span className="truncate text-sm font-medium">{hit.title}</span>
                    {hit.detail && <span className="truncate text-xs text-muted-foreground">{hit.detail}</span>}
                  </Link>
                </li>
              ))}
              {group.more > 0 && <li className="px-2 py-1 text-xs text-muted-foreground">a ďalšie ({group.more}) – spresnite hľadanie</li>}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
