import { useQuery } from '@tanstack/react-query'
import { Lock, Printer, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { equipmentKeys, fetchEquipmentList } from './api'
import { presetsForSpeaker, type Equipment } from './model'
import { tx } from '@/lib/i18n'

/** V detaile: presety digitálneho zosilňovača, alebo pri reproboxe v ktorých zosilňovačoch má preset. */
export function AmpPresetsInfo({ companyId, equipment }: { companyId: string; equipment: Equipment }) {
  const list = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const all = list.data ?? []
  const nameOf = (id?: string) => all.find((item) => item.id === id)?.name
  const own = equipment.attributes.ampPresets ?? []
  const forSpeaker = presetsForSpeaker(
    equipment.id,
    all.filter((item) => item.id !== equipment.id),
  )
  if (own.length === 0 && forSpeaker.length === 0) return null

  return (
    <section className="mb-6 rounded-xl border bg-surface p-4" aria-label={tx('Presety')}>
      <h2 className="mb-2 flex items-center gap-2 font-medium">
        <SlidersHorizontal className="size-5 text-accent" aria-hidden />
        {own.length > 0 ? `Presety (${own.length}${equipment.attributes.ampPresetSlots ? ` z ${equipment.attributes.ampPresetSlots}` : ''})` : tx('Presety v zosilňovačoch')}
        {own.length > 0 && (
          <Link to={`/equipment/${equipment.id}/presets`} className="ml-auto inline-flex items-center gap-1 text-sm font-normal text-accent hover:underline">
            <Printer className="size-4" aria-hidden />{tx('Tlačiť / stiahnuť')}</Link>
        )}
      </h2>
      <ul className="divide-y text-sm">
        {own.map((preset) => (
          <li key={preset.slot} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5">
            <span className="w-10 font-semibold tabular-nums">č. {preset.slot}</span>
            <span className="font-medium">{preset.name || '—'}</span>
            {preset.locked && <Lock className="size-3.5 text-muted-foreground" aria-label={tx('výrobný preset')} />}
            {preset.speakerId && (
              <Link to={`/equipment/${preset.speakerId}`} className="text-accent hover:underline">
                {nameOf(preset.speakerId) ?? 'reprobox'}
              </Link>
            )}
            {preset.note && <span className="text-muted-foreground">{preset.note}</span>}
          </li>
        ))}
        {forSpeaker.map((preset) => (
          <li key={`${preset.ampId}-${preset.slot}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5">
            <Link to={`/equipment/${preset.ampId}`} className="font-medium text-accent hover:underline">
              {preset.ampName}
            </Link>
            <span className="tabular-nums">{tx('preset č.')}{' '}{preset.slot}</span>
            {preset.name && <span>{preset.name}</span>}
            {preset.note && <span className="text-muted-foreground">{preset.note}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}
