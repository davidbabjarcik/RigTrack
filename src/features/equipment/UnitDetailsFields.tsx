import { useController, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form'
import { Field } from '@/components/ui/field'
import { parseUnitIds, unitRange, type EquipmentFormValues } from './model'

/** Najviac kusov, pri ktorých formulár ukáže údaje po kusoch. */
const MAX_UNITS = 200

type Props = {
  control: Control<EquipmentFormValues>
  register: UseFormRegister<EquipmentFormValues>
  errors: FieldErrors<EquipmentFormValues>
  unitIdsText: string
  quantity: number
}

/**
 * Kusy pri evidencii po kusoch: pri každom sériové číslo, dátum nákupu a odkiaľ je kúpený (číslo kusu #1, #2… slúži ako označenie).
 * Vlastné čísla kusov (keď nejdú po sebe) sú schované – bežne stačí počet kusov.
 */
export function UnitDetailsFields({ control, register, errors, unitIdsText, quantity }: Props) {
  const custom = parseUnitIds(unitIdsText)
  const units = custom.length > 0 ? custom : unitRange(Number.isFinite(quantity) ? quantity : 0)
  const unitDates = useController({ control, name: 'unitPurchases' })
  const dates = unitDates.field.value ?? []
  const dateOf = (unit: number) => dates.find((item) => item.unit === unit)?.date ?? ''
  const setDate = (unit: number, date: string) => unitDates.field.onChange([...dates.filter((item) => item.unit !== unit), { unit, date }])
  const unitInfo = useController({ control, name: 'unitInfo' })
  const infos = unitInfo.field.value ?? []
  const infoOf = (unit: number) => infos.find((item) => item.unit === unit) ?? { unit, serial: '', inv: '', from: '' }
  const setInfo = (unit: number, patch: { serial?: string; inv?: string; from?: string }) =>
    unitInfo.field.onChange([...infos.filter((item) => item.unit !== unit), { ...infoOf(unit), ...patch }])

  return (
    <div className="rounded-xl border bg-background p-3 sm:col-span-2">
      <p className="text-sm font-medium">
        Kusy ({units.length})
        <span className="block text-xs font-normal text-muted-foreground">Nepovinné. Kus označuje jeho číslo (#1, #2…). Dátum nákupu vyplňte, keď ho poznáte.</span>
      </p>
      {units.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Zadajte počet kusov.</p>
      ) : (
        <>
          <div className="mt-2 hidden grid-cols-[3rem_1fr_11rem_1fr] gap-2 px-0.5 text-xs font-medium text-muted-foreground sm:grid" aria-hidden>
            <span>Kus</span>
            <span>Sériové číslo</span>
            <span>Dátum nákupu</span>
            <span>Odkiaľ kúpené</span>
          </div>
          <ul className="mt-1 flex flex-col gap-2">
            {units.slice(0, MAX_UNITS).map((unit) => (
              <li key={unit} className="grid grid-cols-[3rem_1fr] items-center gap-2 border-b pb-2 last:border-0 sm:grid-cols-[3rem_1fr_11rem_1fr] sm:border-0 sm:pb-0">
                <span className="text-sm font-medium">#{unit}</span>
                <Field
                  label={`Sériové číslo kusu #${unit}`}
                  hideLabel
                  placeholder="sériové číslo"
                  maxLength={80}
                  autoComplete="off"
                  value={infoOf(unit).serial}
                  onChange={(event) => setInfo(unit, { serial: event.target.value })}
                />
                <span className="sm:hidden" />
                <Field label={`Dátum nákupu kusu #${unit}`} hideLabel type="date" value={dateOf(unit)} onChange={(event) => setDate(unit, event.target.value)} />
                <span className="sm:hidden" />
                <Field
                  label={`Odkiaľ kúpený kus #${unit}`}
                  hideLabel
                  placeholder="obchod / od koho"
                  maxLength={120}
                  autoComplete="off"
                  value={infoOf(unit).from ?? ''}
                  onChange={(event) => setInfo(unit, { from: event.target.value })}
                />
              </li>
            ))}
          </ul>
        </>
      )}
      <details className="mt-3" open={custom.length > 0}>
        <summary className="cursor-pointer text-sm text-muted-foreground">Kusy majú iné čísla ako 1 až {Number.isFinite(quantity) && quantity > 0 ? quantity : 'počet'}?</summary>
        <Field
          label="Čísla kusov"
          className="mt-2"
          inputMode="numeric"
          autoComplete="off"
          placeholder="napr. 1, 4, 8"
          error={errors.unitIds?.message}
          {...register('unitIds')}
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          {custom.length > 0
            ? `Kusov podľa čísel: ${custom.length}. Počet kusov sa pri uložení nastaví podľa nich.`
            : 'Napríklad po vyradení kusu #2 ostanú 1, 3, 4. Ostatné kusy si svoje čísla a históriu nechajú.'}
        </p>
      </details>
    </div>
  )
}
