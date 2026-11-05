import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import type { Equipment } from '@/features/equipment/model'
import { fetchStageConfig, saveStageConfig, stageKeys } from './api'
import { ACCESSORY_BASES, BASIS_LABELS, newDeckId, PROFILE_LABELS, PROFILES, stageConfigSchema, type Profile, type StageConfig } from './model'
import { PartIcon, type PartKind } from './PartIcon'
import { DevNotice } from '@/components/feedback/DevNotice'
import { tx, tf } from '@/lib/i18n'

/** Výber techniky, ku ktorej diel patrí; technika druhu Pódium je hore. */
function PartSelect({ label, value, equipment, onChange }: { label: string; value: string; equipment: Equipment[]; onChange: (id: string) => void }) {
  const stage = equipment.filter((item) => item.kind === 'stage')
  const rest = equipment.filter((item) => item.kind !== 'stage')
  const option = (item: Equipment) => (
    <option key={item.id} value={item.id}>
      {item.name} ({item.quantity}{' '}{tx('ks)')}</option>
  )
  return (
    <SelectField label={label} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{tx('— nepriradené —')}</option>
      {stage.length > 0 && <optgroup label={tx('Pódium')}>{stage.map(option)}</optgroup>}
      <optgroup label={tx('Ostatná technika')}>{rest.map(option)}</optgroup>
    </SelectField>
  )
}

function NumberField({ label, value, step = 1, onChange }: { label: string; value: number; step?: number; onChange: (value: number) => void }) {
  return (
    <Field
      label={label}
      type="number"
      inputMode="decimal"
      min={0}
      step={step}
      value={Number.isFinite(value) ? value : ''}
      onChange={(event) => onChange(event.target.value === '' ? Number.NaN : Number(event.target.value))}
    />
  )
}

function Block({ icon, title, hint, children }: { icon: PartKind; title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-xl border bg-surface p-4">
      <legend className="flex items-center gap-2 px-1 text-sm font-medium">
        <PartIcon kind={icon} className="size-6" />
        {title}
      </legend>
      {hint && <p className="mb-3 text-sm text-muted-foreground">{hint}</p>}
      <div className="flex flex-col gap-3">{children}</div>
    </fieldset>
  )
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="ghost" aria-label={label} onClick={onClick}>
      <Trash2 className="size-4" aria-hidden />
    </Button>
  )
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" className="self-start" onClick={onClick}>
      <Plus className="size-4" aria-hidden />
      {label}
    </Button>
  )
}

/** Zmení jeden prvok zoznamu v nastavení. */
const patchAt = <T,>(list: T[], index: number, patch: Partial<T>) => list.map((item, i) => (i === index ? { ...item, ...patch } : item))

function Editor({ companyId, initial, equipment }: { companyId: string; initial: StageConfig; equipment: Equipment[] }) {
  const queryClient = useQueryClient()
  const [config, setConfig] = useState(initial)
  const set = (patch: Partial<StageConfig>) => setConfig((current) => ({ ...current, ...patch }))
  const parsed = stageConfigSchema.safeParse(config)
  const save = useMutation({
    mutationFn: () => saveStageConfig(companyId, stageConfigSchema.parse(config)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: stageKeys.config(companyId) }),
  })
  const select = (label: string, value: string, onChange: (id: string) => void) => <PartSelect label={label} value={value} equipment={equipment} onChange={onChange} />

  return (
    <div className="flex flex-col gap-4">
      <DevNotice />
      <Field label={tx('Názov systému')} value={config.name} maxLength={60} onChange={(event) => set({ name: event.target.value })} />

      <Block
        icon="deck"
        title={tx('Dosky')}
        hint={tx('Prvá obdĺžniková doska je hlavná, menšie dopĺňajú zvyšok (rozmery po 0,5 m). Trojuholníky sa do obdĺžnika neskladajú, v kalkulačke sa pridávajú ručne. Nohy = koľko nôh potrebuje doska, keď stojí samostatne.')}
      >
        {config.decks.map((deck, index) => (
          <div key={deck.id} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_4.5rem_4.5rem_4rem_auto_1fr_auto]">
            <Field label={tx('Názov')} value={deck.label} maxLength={60} onChange={(event) => set({ decks: patchAt(config.decks, index, { label: event.target.value }) })} />
            <NumberField label={tx('Dĺžka (m)')} step={0.5} value={deck.widthM} onChange={(widthM) => set({ decks: patchAt(config.decks, index, { widthM }) })} />
            <NumberField label={tx('Šírka (m)')} step={0.5} value={deck.depthM} onChange={(depthM) => set({ decks: patchAt(config.decks, index, { depthM }) })} />
            <NumberField label={tx('Nohy')} value={deck.legs} onChange={(legs) => set({ decks: patchAt(config.decks, index, { legs }) })} />
            <label className="flex h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={deck.triangle}
                onChange={(event) => set({ decks: patchAt(config.decks, index, { triangle: event.target.checked, legs: event.target.checked ? 3 : 4 }) })}
              />{tx('trojuholník')}</label>
            {select('Technika', deck.equipmentId, (equipmentId) => set({ decks: patchAt(config.decks, index, { equipmentId }) }))}
            <RemoveButton label={tf('Odobrať {0}', deck.label)} onClick={() => set({ decks: config.decks.filter((_, i) => i !== index) })} />
          </div>
        ))}
        <AddButton
          label={tx('Pridať dosku')}
          onClick={() => set({ decks: [...config.decks, { id: newDeckId(config.decks), label: '', widthM: 1, depthM: 1, triangle: false, legs: 4, equipmentId: '' }] })}
        />
      </Block>

      <Block
        icon="lath"
        title={tx('Lišty')}
        hint={tx('Pero je vzadu a vpravo, drážka vpredu a vľavo. Lišta ide vždy na jednu dosku: na hranu 2 m lišta 2 m alebo dve 1 m, ale 2 m lišta nejde cez dve 1 m dosky.')}
      >
        {config.laths.map((lath, index) => (
          <div key={index} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[8rem_5rem_1fr_1fr_auto]">
            <SelectField label={tx('Profil')} value={lath.profile} onChange={(event) => set({ laths: patchAt(config.laths, index, { profile: event.target.value as Profile }) })}>
              {PROFILES.map((profile) => (
                <option key={profile} value={profile}>
                  {tx(PROFILE_LABELS[profile])}
                </option>
              ))}
            </SelectField>
            <NumberField label={tx('Dĺžka (m)')} step={0.5} value={lath.lengthM} onChange={(lengthM) => set({ laths: patchAt(config.laths, index, { lengthM }) })} />
            <Field label={tx('Názov')} value={lath.label} maxLength={60} onChange={(event) => set({ laths: patchAt(config.laths, index, { label: event.target.value }) })} />
            {select('Technika', lath.equipmentId, (equipmentId) => set({ laths: patchAt(config.laths, index, { equipmentId }) }))}
            <RemoveButton label={tf('Odobrať {0}', lath.label)} onClick={() => set({ laths: config.laths.filter((_, i) => i !== index) })} />
          </div>
        ))}
        <AddButton label={tx('Pridať lištu')} onClick={() => set({ laths: [...config.laths, { profile: 'groove', lengthM: 1, label: '', equipmentId: '' }] })} />
      </Block>

      <Block icon="leg" title={tx('Nohy')} hint={tx('Výška = výsledná výška pódia (alebo stupňa schodov) s touto nohou. Schody potrebujú nohy 20, 40, 60… cm.')}>
        {config.legs.map((leg, index) => (
          <div key={index} className="grid grid-cols-[6rem_1fr_auto] items-end gap-2">
            <NumberField label={tx('Výška (cm)')} value={leg.heightCm} onChange={(heightCm) => set({ legs: patchAt(config.legs, index, { heightCm }) })} />
            {select('Technika', leg.equipmentId, (equipmentId) => set({ legs: patchAt(config.legs, index, { equipmentId }) }))}
            <RemoveButton label={tf('Odobrať nohu {0} cm', leg.heightCm)} onClick={() => set({ legs: config.legs.filter((_, i) => i !== index) })} />
          </div>
        ))}
        <AddButton label={tx('Pridať nohu')} onClick={() => set({ legs: [...config.legs, { heightCm: Number.NaN, equipmentId: '' }] })} />
      </Block>

      <Block icon="skirt" title={tx('Plachty')} hint={tx('Kryje = dĺžka hrany, na ktorú plachta je (2 m alebo 1 m). Výška 0 = hodí sa na každú výšku.')}>
        {config.skirts.map((skirt, index) => (
          <div key={index} className="grid grid-cols-[5rem_5rem_1fr_auto] items-end gap-2">
            <NumberField label={tx('Kryje (m)')} step={0.5} value={skirt.coversM} onChange={(coversM) => set({ skirts: patchAt(config.skirts, index, { coversM }) })} />
            <NumberField label={tx('Výška (cm)')} value={skirt.heightCm} onChange={(heightCm) => set({ skirts: patchAt(config.skirts, index, { heightCm }) })} />
            {select('Technika', skirt.equipmentId, (equipmentId) => set({ skirts: patchAt(config.skirts, index, { equipmentId }) }))}
            <RemoveButton label={tf('Odobrať plachtu {0} m', skirt.coversM)} onClick={() => set({ skirts: config.skirts.filter((_, i) => i !== index) })} />
          </div>
        ))}
        <AddButton label={tx('Pridať plachtu')} onClick={() => set({ skirts: [...config.skirts, { coversM: Number.NaN, heightCm: 0, equipmentId: '' }] })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField label={tx('Štipcov (lístkov) na meter plachty')} step={0.5} value={config.skirtClip.perMeter} onChange={(perMeter) => set({ skirtClip: { ...config.skirtClip, perMeter } })} />
          {select('Štipec na plachtu', config.skirtClip.equipmentId, (equipmentId) => set({ skirtClip: { ...config.skirtClip, equipmentId } }))}
        </div>
      </Block>

      <Block icon="railing" title={tx('Zábradlie')} hint={tx('Napr. 185 × 100 kryje hranu 2 m, 85 × 100 kryje 1 m. Spojky a podložky sú nižšie v príslušenstve.')}>
        {config.railings.map((railing, index) => (
          <div key={index} className="grid grid-cols-[5rem_7rem_1fr_auto] items-end gap-2">
            <NumberField label={tx('Kryje (m)')} step={0.5} value={railing.coversM} onChange={(coversM) => set({ railings: patchAt(config.railings, index, { coversM }) })} />
            <Field label={tx('Rozmer')} value={railing.label} maxLength={40} onChange={(event) => set({ railings: patchAt(config.railings, index, { label: event.target.value }) })} />
            {select('Technika', railing.equipmentId, (equipmentId) => set({ railings: patchAt(config.railings, index, { equipmentId }) }))}
            <RemoveButton label={tf('Odobrať zábradlie {0}', railing.label)} onClick={() => set({ railings: config.railings.filter((_, i) => i !== index) })} />
          </div>
        ))}
        <AddButton label={tx('Pridať zábradlie')} onClick={() => set({ railings: [...config.railings, { coversM: Number.NaN, label: '', equipmentId: '' }] })} />
      </Block>

      <Block icon="diagonal" title={tx('Výstuhy (vrtule)')} hint={tx('Diagonály podľa dĺžky poľa (2 m alebo 1 m) a rozsahu výšky pódia. Dávajú sa do polí po obvode pódia.')}>
        {config.diagonals.map((diagonal, index) => (
          <div key={index} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[5rem_5rem_5rem_1fr_1fr_auto]">
            <NumberField label={tx('Pole (m)')} step={0.5} value={diagonal.fieldM} onChange={(fieldM) => set({ diagonals: patchAt(config.diagonals, index, { fieldM }) })} />
            <NumberField label={tx('Od (cm)')} value={diagonal.minHeightCm} onChange={(minHeightCm) => set({ diagonals: patchAt(config.diagonals, index, { minHeightCm }) })} />
            <NumberField label={tx('Do (cm)')} value={diagonal.maxHeightCm} onChange={(maxHeightCm) => set({ diagonals: patchAt(config.diagonals, index, { maxHeightCm }) })} />
            <Field label={tx('Názov')} value={diagonal.label} maxLength={60} onChange={(event) => set({ diagonals: patchAt(config.diagonals, index, { label: event.target.value }) })} />
            {select('Technika', diagonal.equipmentId, (equipmentId) => set({ diagonals: patchAt(config.diagonals, index, { equipmentId }) }))}
            <RemoveButton label={tf('Odobrať výstuhu {0}', diagonal.label)} onClick={() => set({ diagonals: config.diagonals.filter((_, i) => i !== index) })} />
          </div>
        ))}
        <AddButton
          label={tx('Pridať výstuhu')}
          onClick={() => set({ diagonals: [...config.diagonals, { fieldM: 2, minHeightCm: 80, maxHeightCm: 100, label: '', equipmentId: '' }] })}
        />
        <NumberField label={tx('Výstuha do každého N-tého poľa po obvode')} value={config.diagonalEvery} onChange={(diagonalEvery) => set({ diagonalEvery })} />
      </Block>

      <Block icon="stairs" title={tx('Schody')} hint={tx('Každý stupeň je jedna doska (napr. 1 × 0,5 m), o 20 cm vyšší ako predošlý. Prvý stojí na 4 nohách 20 cm, ďalšie na 2 nohách svojej výšky a 2 schodiskových nohách.')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label={tx('Stupeň z dosky')} value={config.stairs.stepDeckId} onChange={(event) => set({ stairs: { ...config.stairs, stepDeckId: event.target.value } })}>
            {config.decks
              .filter((deck) => !deck.triangle)
              .map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.label || `${deck.widthM} × ${deck.depthM} m`}
                </option>
              ))}
          </SelectField>
          {select('Schodisková noha', config.stairs.stairLeg.equipmentId, (equipmentId) => set({ stairs: { ...config.stairs, stairLeg: { equipmentId } } }))}
          {select('Zábradlie schodov', config.stairs.railing.equipmentId, (equipmentId) => set({ stairs: { ...config.stairs, railing: { equipmentId } } }))}
          {select('Spojka schodov k pódiu (110 mm)', config.stairs.connector.equipmentId, (equipmentId) =>
            set({ stairs: { ...config.stairs, connector: { ...config.stairs.connector, equipmentId } } }),
          )}
          {select(config.riserWheel.label || tx('Noha s kolieskom (pojazdný rizer)'), config.riserWheel.equipmentId, (equipmentId) =>
            set({ riserWheel: { ...config.riserWheel, equipmentId } }),
          )}
          <NumberField
            label={tx('Spojok na jedny schody')}
            value={config.stairs.connector.perStairs}
            onChange={(perStairs) => set({ stairs: { ...config.stairs, connector: { ...config.stairs.connector, perStairs } } })}
          />
        </div>
      </Block>

      <Block icon="accessory" title={tx('Príslušenstvo')} hint={tx('Drobnosti, ktoré sa rátajú podľa niečoho iného: napr. 2 čapové spojky na každý diel zábradlia.')}>
        {config.accessories.map((accessory, index) => (
          <div key={index} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_5rem_10rem_1fr_auto]">
            <Field label={tx('Názov')} value={accessory.label} maxLength={80} onChange={(event) => set({ accessories: patchAt(config.accessories, index, { label: event.target.value }) })} />
            <NumberField label={tx('Počet')} step={0.5} value={accessory.quantity} onChange={(quantity) => set({ accessories: patchAt(config.accessories, index, { quantity }) })} />
            <SelectField
              label={tx('Ráta sa')}
              value={accessory.basis}
              onChange={(event) => set({ accessories: patchAt(config.accessories, index, { basis: event.target.value as (typeof ACCESSORY_BASES)[number] }) })}
            >
              {ACCESSORY_BASES.map((basis) => (
                <option key={basis} value={basis}>
                  {tx(BASIS_LABELS[basis])}
                </option>
              ))}
            </SelectField>
            {select('Technika', accessory.equipmentId, (equipmentId) => set({ accessories: patchAt(config.accessories, index, { equipmentId }) }))}
            <RemoveButton label={tf('Odobrať {0}', accessory.label)} onClick={() => set({ accessories: config.accessories.filter((_, i) => i !== index) })} />
          </div>
        ))}
        <AddButton label={tx('Pridať príslušenstvo')} onClick={() => set({ accessories: [...config.accessories, { label: '', basis: 'railing', quantity: 1, equipmentId: '' }] })} />
      </Block>

      {!parsed.success && <p className="text-sm text-destructive">{tx('Skontrolujte políčka: všetky čísla musia byť vyplnené a príslušenstvo musí mať názov.')}</p>}
      {save.isError && (
        <p role="alert" className="text-sm text-destructive">{tx('Uloženie zlyhalo. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie.')}</p>
      )}
      {save.isSuccess && <p role="status" className="text-sm text-muted-foreground">{tx('Uložené.')}</p>}
      <Button className="self-start" disabled={!parsed.success || save.isPending} onClick={() => save.mutate()}>
        {save.isPending ? tx('Ukladám…') : tx('Uložiť nastavenie Nivtec')}
      </Button>
    </div>
  )
}

/** Nastavenie pódiového systému Nivtec: diely, nohy, plachty, zábradlia, výstuhy, schody a príslušenstvo. */
export function StageSettings({ companyId }: { companyId: string }) {
  const config = useQuery({ queryKey: stageKeys.config(companyId), queryFn: () => fetchStageConfig(companyId) })
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  if (config.isError) return <p className="text-sm text-destructive">{tx('Nastavenie sa nepodarilo načítať. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie.')}</p>
  if (!config.data || !equipment.data) return <p className="text-sm text-muted-foreground">{tx('Načítavam…')}</p>
  const sorted = [...equipment.data].filter((item) => item.status !== 'retired').sort((a, b) => a.name.localeCompare(b.name, 'sk'))
  return <Editor companyId={companyId} initial={config.data} equipment={sorted} />
}
