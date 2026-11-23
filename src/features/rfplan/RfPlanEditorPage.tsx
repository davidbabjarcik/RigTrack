import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FileDown, Plus, Save, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import type { CompanyEvent } from '@/features/events/model'
import { useEvents } from '@/features/events/useEvents'
import { tf, tx } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { EMPTY_RF_PLAN, rfKeys, saveRfPlan, useRfPlan, type RfPlan } from './api'
import { analyze, RF_KIND_LABELS, rfCsv, suggest, toKhz, TV_FIRST, TV_LAST, tvChannelOf, type RfChannel, type RfKind } from './rf'
import { Spectrum } from './Spectrum'

type Draft = Pick<RfPlan, 'channels' | 'settings' | 'excludedTv' | 'place' | 'note'>
const uid = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
const inputClass = 'h-9 w-full rounded-lg border bg-background px-2 text-sm'

function Editor({ event, initial }: { event: CompanyEvent; initial: RfPlan }) {
  const queryClient = useQueryClient()
  const companyId = useCompany().active!.companyId
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const [draft, setDraft] = useState<Draft>({ channels: initial.channels, settings: initial.settings, excludedTv: initial.excludedTv, place: initial.place, note: initial.note })
  const [version, setVersion] = useState(initial.version)
  const [dirty, setDirty] = useState(false)
  const [notice, setNotice] = useState('')
  const change = (next: (value: Draft) => Draft) => {
    setDraft(next)
    setDirty(true)
  }
  const setChannel = (id: string, patch: Partial<RfChannel>) => change((value) => ({ ...value, channels: value.channels.map((channel) => (channel.id === id ? { ...channel, ...patch } : channel)) }))
  const addChannel = (fields: Partial<RfChannel> = {}) => {
    const last = draft.channels.at(-1)
    change((value) => ({
      ...value,
      channels: [...value.channels, { id: uid(), name: tf('Kanál {0}', value.channels.length + 1), kind: last?.kind ?? 'mic', equipment_id: null, min_mhz: last?.min_mhz ?? 470, max_mhz: last?.max_mhz ?? 694, freq_mhz: null, locked: false, ...fields }].slice(0, 128),
    }))
  }
  const audio = (equipment.data ?? []).filter((item) => item.kind === 'audio' && event.equipment.some((line) => line.equipmentId === item.id))
  const issues = analyze(draft.channels, draft.settings, draft.excludedTv)
  const problems = [...issues.values()].filter((list) => list.some((issue) => issue.kind !== 'missing')).length

  useEffect(() => {
    if (!dirty) return
    const warn = (unload: BeforeUnloadEvent) => unload.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const runSuggest = () => {
    const result = suggest(draft.channels, draft.settings, draft.excludedTv)
    change((value) => ({ ...value, channels: result.channels }))
    setNotice(result.failed.length > 0 ? tf('Pre {0} kanálov sa v ich pásme nenašla voľná frekvencia – rozšírte pásmo alebo zmenšite odstupy.', result.failed.length) : tx('Frekvencie navrhnuté – skontrolujte ich pred akciou skenom na mieste.'))
  }
  const clearUnlocked = () => change((value) => ({ ...value, channels: value.channels.map((channel) => (channel.locked ? channel : { ...channel, freq_mhz: null })) }))
  const save = useMutation({
    mutationFn: () => saveRfPlan(event.id, version, draft),
    onSuccess: async (next) => {
      setVersion(next)
      setDirty(false)
      await queryClient.invalidateQueries({ queryKey: rfKeys.ofEvent(companyId, event.id) })
    },
  })
  const csv = () => {
    const url = URL.createObjectURL(new Blob([rfCsv(draft.channels, (id) => equipment.data?.find((item) => item.id === id)?.name)], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `hf-plan-${event.name}.csv`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }
  const setting = (key: 'spacing_khz' | 'imd3_khz' | 'imd5_khz' | 'step_khz', raw: string) => change((value) => ({ ...value, settings: { ...value.settings, [key]: Math.max(key === 'step_khz' ? 5 : 0, Math.min(5000, Math.round(Number(raw) || 0))) } }))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link to={`/events/${event.id}?tab=gear`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden />{event.name}
        </Link>
        <h1 className="w-full text-xl font-semibold">{tx('HF frekvenčný plán')}</h1>
        <p className="text-sm text-muted-foreground">{tf('Verzia {0}', version)}{dirty ? ` · ${tx('neuložené zmeny')}` : ''}</p>
        <Button size="sm" variant="outline" className="ml-auto" disabled={draft.channels.length === 0} onClick={csv}>
          <FileDown className="size-4" aria-hidden />CSV
        </Button>
        <Button size="sm" disabled={save.isPending || !dirty} onClick={() => save.mutate()}>
          <Save className="size-4" aria-hidden />{tx('Uložiť')}
        </Button>
      </div>
      {save.isError && <p role="alert" className="text-sm text-destructive">{save.error.message || tx('HF plán sa nepodarilo uložiť.')}</p>}

      <div className="rounded-xl border bg-surface p-2 text-foreground">
        <Spectrum channels={draft.channels} settings={draft.settings} excludedTv={draft.excludedTv} className="h-auto w-full" />
      </div>

      <div className="grid gap-3 rounded-xl border bg-surface p-3 sm:grid-cols-3 lg:grid-cols-6">
        <Field label={tx('Miesto (na sken a TV kanály)')} className="sm:col-span-2" maxLength={120} value={draft.place} onChange={(e) => change((value) => ({ ...value, place: e.target.value }))} />
        <Field label={tx('Odstup nosných (kHz)')} type="number" inputMode="numeric" value={draft.settings.spacing_khz} onChange={(e) => setting('spacing_khz', e.target.value)} />
        <Field label={tx('Okno IM 3. rádu (kHz)')} type="number" inputMode="numeric" value={draft.settings.imd3_khz} onChange={(e) => setting('imd3_khz', e.target.value)} />
        <Field label={tx('Krok návrhu (kHz)')} type="number" inputMode="numeric" value={draft.settings.step_khz} onChange={(e) => setting('step_khz', e.target.value)} />
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="size-4" checked={draft.settings.fifth} onChange={(e) => change((value) => ({ ...value, settings: { ...value.settings, fifth: e.target.checked } }))} />
            {tx('Aj IM 5. rádu')}
          </label>
          {draft.settings.fifth && <Field label={tx('Okno IM 5. rádu (kHz)')} type="number" inputMode="numeric" value={draft.settings.imd5_khz} onChange={(e) => setting('imd5_khz', e.target.value)} />}
        </div>
      </div>

      <fieldset className="rounded-xl border bg-surface p-3">
        <legend className="px-1 text-sm font-medium">{tx('TV kanály vysielané v mieste akcie (vylúčené)')}</legend>
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: TV_LAST - TV_FIRST + 1 }, (_, index) => TV_FIRST + index).map((channel) => {
            const on = draft.excludedTv.includes(channel)
            return (
              <button
                key={channel}
                type="button"
                aria-pressed={on}
                title={`${302 + 8 * channel}–${310 + 8 * channel} MHz`}
                onClick={() => change((value) => ({ ...value, excludedTv: on ? value.excludedTv.filter((item) => item !== channel) : [...value.excludedTv, channel].sort((a, b) => a - b) }))}
                className={cn('h-8 w-9 rounded-md border text-xs font-medium', on ? 'border-foreground bg-foreground text-background' : 'hover:bg-muted')}
              >
                {channel}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{tx('UHF 21–48 (470–694 MHz), kanál = 8 MHz. Vysielané kanály zistíte zo skenu na mieste alebo z mapy pokrytia DVB-T2.')}</p>
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => addChannel()}>
          <Plus className="size-4" aria-hidden />{tx('Pridať kanál')}
        </Button>
        {audio.length > 0 && (
          <select aria-label={tx('Pridať z techniky akcie')} className="h-9 rounded-lg border bg-background px-2 text-sm" value="" onChange={(e) => { const item = audio.find((value) => value.id === e.target.value); if (item) addChannel({ name: item.name.slice(0, 60), equipment_id: item.id }) }}>
            <option value="">{tx('Pridať z techniky akcie…')}</option>
            {audio.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        )}
        <Button size="sm" disabled={draft.channels.length === 0} onClick={runSuggest}>
          <Sparkles className="size-4" aria-hidden />{tx('Navrhnúť chýbajúce frekvencie')}
        </Button>
        <Button size="sm" variant="ghost" disabled={draft.channels.every((channel) => channel.locked || channel.freq_mhz === null)} onClick={clearUnlocked}>{tx('Vymazať nezamknuté')}</Button>
      </div>
      {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
      {draft.channels.length > 0 && <p className={cn('text-sm font-medium', problems > 0 ? 'text-destructive' : 'text-emerald-700 dark:text-emerald-400')}>{problems > 0 ? tf('Kanály s problémom: {0}', problems) : tx('Bez kolízií v zadaných frekvenciách.')}</p>}

      <div className="overflow-x-auto rounded-xl border bg-surface">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="bg-muted text-xs text-muted-foreground">
            <tr>
              <th className="px-2 py-1.5">{tx('Názov')}</th>
              <th className="px-2 py-1.5">{tx('Druh')}</th>
              <th className="px-2 py-1.5">{tx('Pásmo od – do (MHz)')}</th>
              <th className="px-2 py-1.5">{tx('Frekvencia (MHz)')}</th>
              <th className="px-2 py-1.5">TV</th>
              <th className="px-2 py-1.5">{tx('Zamknúť')}</th>
              <th className="px-2 py-1.5">{tx('Stav')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {draft.channels.map((channel) => {
              const list = (issues.get(channel.id) ?? []).filter((issue) => issue.kind !== 'missing')
              const khz = channel.freq_mhz === null ? null : toKhz(channel.freq_mhz)
              return (
                <tr key={channel.id} className="border-t align-top">
                  <td className="px-2 py-1"><input aria-label={tx('Názov')} className={inputClass} maxLength={60} value={channel.name} onChange={(e) => setChannel(channel.id, { name: e.target.value })} /></td>
                  <td className="px-2 py-1">
                    <select aria-label={tx('Druh')} className={inputClass} value={channel.kind} onChange={(e) => setChannel(channel.id, { kind: e.target.value as RfKind })}>
                      {(Object.keys(RF_KIND_LABELS) as RfKind[]).map((kind) => (
                        <option key={kind} value={kind}>{tx(RF_KIND_LABELS[kind])}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <div className="flex gap-1">
                      <input aria-label={tx('Pásmo od')} className={cn(inputClass, 'w-20')} type="number" step="0.025" value={channel.min_mhz} onChange={(e) => setChannel(channel.id, { min_mhz: Number(e.target.value) || 0 })} />
                      <input aria-label={tx('Pásmo do')} className={cn(inputClass, 'w-20')} type="number" step="0.025" value={channel.max_mhz} onChange={(e) => setChannel(channel.id, { max_mhz: Number(e.target.value) || 0 })} />
                    </div>
                  </td>
                  <td className="px-2 py-1"><input aria-label={tx('Frekvencia (MHz)')} className={cn(inputClass, 'w-28 font-mono')} type="number" step="0.025" value={channel.freq_mhz ?? ''} onChange={(e) => setChannel(channel.id, { freq_mhz: e.target.value === '' ? null : Number(e.target.value) })} /></td>
                  <td className="px-2 py-1 font-mono">{khz === null ? '' : (tvChannelOf(khz) ?? '')}</td>
                  <td className="px-2 py-1"><input aria-label={tx('Zamknúť')} type="checkbox" className="mt-2 size-4" checked={channel.locked} onChange={(e) => setChannel(channel.id, { locked: e.target.checked })} /></td>
                  <td className={cn('px-2 py-1 text-xs', list.length > 0 ? 'text-destructive' : 'text-muted-foreground')}>
                    {list.length > 0 ? list.map((issue) => <div key={issue.text}>{issue.text}</div>) : khz === null ? tx('bez frekvencie') : 'OK'}
                  </td>
                  <td className="px-2 py-1">
                    <Button size="sm" variant="ghost" aria-label={tx('Odstrániť')} onClick={() => change((value) => ({ ...value, channels: value.channels.filter((item) => item.id !== channel.id) }))}>
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {draft.channels.length === 0 && <p className="p-4 text-sm text-muted-foreground">{tx('Pridajte bezdrôtové kanály (mikrofóny, IEM) s pásmom, ktoré podporuje vysielač.')}</p>}
      </div>
      <Field label={tx('Poznámka')} maxLength={500} value={draft.note} onChange={(e) => change((value) => ({ ...value, note: e.target.value }))} />
      <p className="text-xs text-muted-foreground">{tx('Výpočet je pomôcka: kontroluje odstupy, intermodulácie 3. rádu (2 a 3 vysielače) a voliteľne 5. rádu. Pred akciou vždy overte spektrum skenom na mieste a dodržte povolenia na používanie frekvencií.')}</p>
    </div>
  )
}

/** Editor HF plánu akcie (/events/:id/rf). */
export function RfPlanEditorPage() {
  const { id = '' } = useParams()
  const companyId = useCompany().active!.companyId
  const events = useEvents(companyId)
  const plan = useRfPlan(companyId, id)
  if (events.isPending || plan.isPending) return <LoadingBlock />
  const event = events.data?.find((item) => item.id === id)
  if (!event) return <ErrorBlock message={tx('Tento event neexistuje alebo k nemu nemáte prístup.')} />
  if (plan.isError) return <ErrorBlock message={tx('HF plán sa nepodarilo načítať (migrácia 0201).')} />
  const initial = plan.data ?? EMPTY_RF_PLAN
  return <Editor key={initial.version} event={event} initial={initial} />
}
