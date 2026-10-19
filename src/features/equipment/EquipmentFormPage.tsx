import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useId, useState, type ReactNode } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, LinkButton } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { useCases } from '@/features/cases/useCases'
import { useCompany } from '@/features/companies/company-context'
import { OwnerSelect } from '@/features/staff/OwnerSelect'
import { can } from '@/lib/permissions'
import { errorDetail } from '@/lib/supabase/errors'
import { equipmentKeys, fetchEquipment, saveEquipment } from './api'
import { cableColorKeys, fetchCableColors, saveCableColor, type CableColor } from './cableColors'
import { LengthColorField, type ColorEdit } from './LengthColorField'
import {
  asOptionalNumber,
  AUDIO_TYPE_LABELS,
  AUDIO_TYPES,
  CAPTURE_MATCH_LABELS,
  CAPTURE_MATCHES,
  COMMON_CONNECTORS,
  DISPLAY_TYPE_LABELS,
  DISPLAY_TYPES,
  DJ_TYPE_LABELS,
  DJ_TYPES,
  PROCESSOR_CONTROL_LABELS,
  PROCESSOR_CONTROLS,
  EQUIPMENT_KINDS,
  EQUIPMENT_STATUSES,
  equipmentSchema,
  hasBox,
  isAudio,
  isLighting,
  isSimpleKind,
  KIND_LABELS,
  LIGHT_SOURCE_LABELS,
  LIGHT_SOURCES,
  parseUnitIds,
  STATUS_LABELS,
  type Equipment,
  type EquipmentFormValues,
  type Lookup,
} from './model'
import { PurchaseLinksFields } from './PurchaseLinksFields'
import { useEquipmentLookups } from './useEquipmentLookups'

const EMPTY: EquipmentFormValues = {
  name: '',
  kind: 'general',
  category: '',
  location: '',
  caseId: '',
  manufacturer: '',
  model: '',
  serialNumber: '',
  inventoryNumber: '',
  quantity: 1,
  minQuantity: undefined,
  trackUnits: false,
  unitIds: '',
  rentalPrice: undefined,
  status: 'available',
  connector: '',
  lengthM: undefined,
  powerW: undefined,
  lightSource: '',
  audioType: '',
  djType: '',
  ipPrefix: undefined,
  ipDhcp: false,
  boxWidthCm: undefined,
  boxDepthCm: undefined,
  boxHeightCm: undefined,
  subDelayMs: undefined,
  dmxModes: [],
  macAddress: '',
  ipAddress: '',
  serviceIntervalMonths: undefined,
  lastServiceOn: '',
  hoursIntervalMonths: undefined,
  note: '',
  owner: '',
  purchasedOn: '',
  unitPurchases: [],
  links: [],
  cloneOf: '',
  captureMatch: '',
  captureNote: '',
  isLedPanel: false,
  isLedProcessor: false,
  isDisplay: false,
  displayType: 'tv',
}

function toFormValues(equipment: Equipment, categories: Lookup[], locations: Lookup[]): EquipmentFormValues {
  return {
    name: equipment.name,
    kind: equipment.kind,
    category: categories.find((c) => c.id === equipment.categoryId)?.name ?? '',
    location: locations.find((l) => l.id === equipment.locationId)?.name ?? '',
    caseId: equipment.caseId ?? '',
    manufacturer: equipment.manufacturer,
    model: equipment.model,
    serialNumber: equipment.serialNumber,
    inventoryNumber: equipment.inventoryNumber,
    quantity: equipment.quantity,
    minQuantity: equipment.minQuantity ?? undefined,
    trackUnits: equipment.trackUnits,
    unitIds: equipment.unitIds.join(', '),
    rentalPrice: equipment.rentalPrice ?? undefined,
    status: equipment.status,
    connector: equipment.attributes.connector ?? '',
    lengthM: equipment.attributes.lengthM,
    powerW: equipment.attributes.powerW,
    lightSource: equipment.attributes.lightSource ?? '',
    audioType: equipment.attributes.audioType ?? '',
    djType: equipment.attributes.djType ?? '',
    ipPrefix: equipment.attributes.ipPrefix,
    ipDhcp: equipment.attributes.ipDhcp ?? false,
    boxWidthCm: equipment.attributes.boxWidthCm,
    boxDepthCm: equipment.attributes.boxDepthCm,
    boxHeightCm: equipment.attributes.boxHeightCm,
    subDelayMs: equipment.attributes.subDelayMs,
    dmxModes: equipment.attributes.dmxModes ?? [],
    macAddress: equipment.macAddress,
    ipAddress: equipment.ipAddress,
    serviceIntervalMonths: equipment.serviceIntervalMonths ?? undefined,
    lastServiceOn: equipment.lastServiceOn ?? '',
    hoursIntervalMonths: equipment.hoursIntervalMonths ?? undefined,
    note: equipment.note,
    owner: equipment.ownerStaffId ?? '',
    purchasedOn: equipment.purchasedOn ?? '',
    unitPurchases: Object.entries(equipment.unitPurchases ?? {}).map(([unit, date]) => ({ unit: Number(unit), date })),
    links: equipment.links ?? [],
    cloneOf: equipment.cloneOf ?? '',
    captureMatch: equipment.captureMatch ?? '',
    captureNote: equipment.captureNote ?? '',
    isLedPanel: Boolean(equipment.attributes.ledPanel),
    ledPitchMm: equipment.attributes.ledPanel?.pitchMm,
    ledWidthMm: equipment.attributes.ledPanel?.widthMm,
    ledHeightMm: equipment.attributes.ledPanel?.heightMm,
    ledPxW: equipment.attributes.ledPanel?.pxW,
    ledPxH: equipment.attributes.ledPanel?.pxH,
    ledWeightKg: equipment.attributes.ledPanel?.weightKg || undefined,
    ledMaxW: equipment.attributes.ledPanel?.maxW || undefined,
    ledAvgW: equipment.attributes.ledPanel?.avgW || undefined,
    isLedProcessor: Boolean(equipment.attributes.ledProcessor),
    isDisplay: Boolean(equipment.attributes.display),
    displayType: equipment.attributes.display?.type ?? 'tv',
    displayResW: equipment.attributes.display?.resW,
    displayResH: equipment.attributes.display?.resH,
    displayDiagonalIn: equipment.attributes.display?.diagonalIn,
    displayLumens: equipment.attributes.display?.lumens,
    procOutputs: equipment.attributes.ledProcessor?.outputs,
    procPixels: equipment.attributes.ledProcessor?.pixelsPerOutput,
    procInputs: equipment.attributes.ledProcessor?.inputs,
    procChip: equipment.attributes.ledProcessor?.chip ?? '',
    procControl: equipment.attributes.ledProcessor?.control ?? '',
    procHdmi: equipment.attributes.ledProcessor?.inputTypes?.hdmi,
    procDvi: equipment.attributes.ledProcessor?.inputTypes?.dvi,
    procSdi: equipment.attributes.ledProcessor?.inputTypes?.sdi,
    procDp: equipment.attributes.ledProcessor?.inputTypes?.dp,
    procVga: equipment.attributes.ledProcessor?.inputTypes?.vga,
    procInputW: equipment.attributes.ledProcessor?.inputW,
    procInputH: equipment.attributes.ledProcessor?.inputH,
  }
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-xl border bg-surface p-4">
      <legend className="px-1 text-sm font-medium text-muted-foreground">{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}

type FormProps = {
  companyId: string
  equipment: Equipment | null
  categories: Lookup[]
  locations: Lookup[]
  cases: Lookup[]
  colors: CableColor[]
  canEditColors: boolean
}

function EquipmentForm({ companyId, equipment, categories, locations, cases, colors, canEditColors }: FormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const categoryListId = useId()
  const locationListId = useId()
  const connectorListId = useId()
  const cancelTo = equipment ? `/equipment/${equipment.id}` : '/equipment'
  const [searchParams] = useSearchParams()
  const ownerPreset = searchParams.get('owner') ?? ''

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentSchema),
    // Z karty zamestnanca sa dá pridať jeho vlastná technika (?owner=…).
    defaultValues: equipment ? toFormValues(equipment, categories, locations) : { ...EMPTY, owner: ownerPreset },
  })
  const kind = useWatch({ control, name: 'kind' })
  const categoryText = useWatch({ control, name: 'category' })
  // Časť Svetlo sa ukáže pri druhu Svetlo aj pri kategórii, ktorá je o svetlách.
  const lighting = isLighting(kind, categoryText ?? '')
  const audio = isAudio(kind, categoryText ?? '')
  const audioType = useWatch({ control, name: 'audioType' })
  const dmxModes = useFieldArray({ control, name: 'dmxModes' })
  const trackUnits = useWatch({ control, name: 'trackUnits' })
  const unitIdsText = useWatch({ control, name: 'unitIds' })
  const lengthM = useWatch({ control, name: 'lengthM' })
  const quantity = useWatch({ control, name: 'quantity' })
  const captureMatch = useWatch({ control, name: 'captureMatch' })
  const isLedPanel = useWatch({ control, name: 'isLedPanel' })
  const isLedProcessor = useWatch({ control, name: 'isLedProcessor' })
  const isDisplay = useWatch({ control, name: 'isDisplay' })
  const displayType = useWatch({ control, name: 'displayType' })
  const simple = isSimpleKind(kind, categoryText ?? '')
  // Neuložené farby dĺžok podľa dĺžky; uložia sa spolu s káblom.
  const [colorEdits, setColorEdits] = useState<Record<number, ColorEdit>>({})

  const save = useMutation({
    mutationFn: async (values: EquipmentFormValues) => {
      const colorEdit = values.kind === 'cable' && values.lengthM !== undefined ? colorEdits[values.lengthM] : undefined
      if (colorEdit) await saveCableColor(companyId, { lengthM: values.lengthM!, ...colorEdit })
      return saveEquipment({ companyId, id: equipment?.id ?? null, values, categories, locations })
    },
    onSuccess: async (id) => {
      // Uloženie mohlo založiť novú kategóriu či umiestnenie, preto celý strom firmy.
      await queryClient.invalidateQueries({ queryKey: ['company', companyId] })
      navigate(`/equipment/${id}`, { replace: true })
    },
    onError: (error: { code?: string; message?: string }) => {
      if (error.code === '23505' && error.message?.includes('inventory_number')) {
        setError('inventoryNumber', { message: 'Toto inventárne číslo už má iná technika' }, { shouldFocus: true })
      }
    },
  })

  return (
    <form onSubmit={handleSubmit((values) => save.mutate(values))} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
        <SelectField label="Druh" error={errors.kind?.message} {...register('kind')}>
          {EQUIPMENT_KINDS.map((value) => (
            <option key={value} value={value}>
              {KIND_LABELS[value]}
            </option>
          ))}
        </SelectField>
        <Field label="Názov *" autoFocus={!equipment} error={errors.name?.message} {...register('name')} />
      </div>

      {kind === 'cable' && (
        <Group title="Kábel">
          <Field
            label="Konektor / typ"
            list={connectorListId}
            placeholder="napr. XLR alebo powerCON napájací"
            autoComplete="off"
            error={errors.connector?.message}
            {...register('connector')}
          />
          <datalist id={connectorListId}>
            {COMMON_CONNECTORS.map((connector) => (
              <option key={connector} value={connector} />
            ))}
          </datalist>
          <Field
            label="Dĺžka (m)"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.1"
            error={errors.lengthM?.message}
            {...register('lengthM', asOptionalNumber)}
          />
          <div className="sm:col-span-2">
            <LengthColorField
              lengthM={lengthM}
              existing={colors}
              edit={lengthM === undefined ? undefined : colorEdits[lengthM]}
              onEdit={(edit) => lengthM !== undefined && setColorEdits((current) => ({ ...current, [lengthM]: edit }))}
              canEdit={canEditColors}
            />
          </div>
        </Group>
      )}

      {kind === 'truss' && (
        <Group title="Hliník / truss">
          <Field
            label="Dĺžka dielu (m)"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.5"
            error={errors.lengthM?.message}
            {...register('lengthM', asOptionalNumber)}
          />
        </Group>
      )}

      {lighting && (
        <Group title="Svetlo">
          <Field
            label="Výkon (W)"
            type="number"
            inputMode="decimal"
            min={0}
            error={errors.powerW?.message}
            {...register('powerW', asOptionalNumber)}
          />
          <SelectField label="Zdroj svetla" error={errors.lightSource?.message} {...register('lightSource')}>
            <option value="">— neuvedené —</option>
            {LIGHT_SOURCES.map((source) => (
              <option key={source} value={source}>
                {LIGHT_SOURCE_LABELS[source]}
              </option>
            ))}
          </SelectField>
          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 text-sm font-medium">DMX módy</legend>
            {dmxModes.fields.length === 0 && (
              <p className="mb-2 text-sm text-muted-foreground">Napríklad Basic 8 ch, Standard 16 ch, Extended 24 ch.</p>
            )}
            <ul className="flex flex-col gap-2">
              {dmxModes.fields.map((field, index) => (
                <li key={field.id} className="flex items-end gap-2">
                  <Field
                    label="Názov módu"
                    hideLabel={index > 0}
                    placeholder="napr. Standard"
                    maxLength={40}
                    className="flex-1"
                    error={errors.dmxModes?.[index]?.name?.message}
                    {...register(`dmxModes.${index}.name`)}
                  />
                  <Field
                    label="Kanály"
                    hideLabel={index > 0}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={512}
                    step={1}
                    className="w-24"
                    error={errors.dmxModes?.[index]?.channels?.message}
                    {...register(`dmxModes.${index}.channels`, { valueAsNumber: true })}
                  />
                  <Button variant="ghost" aria-label={`Odobrať mód ${index + 1}`} onClick={() => dmxModes.remove(index)}>
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
            {errors.dmxModes?.message && (
              <p role="alert" className="mt-1.5 text-sm text-destructive">
                {errors.dmxModes.message}
              </p>
            )}
            <Button variant="outline" size="sm" className="mt-2" onClick={() => dmxModes.append({ name: '', channels: Number.NaN })}>
              <Plus className="size-4" aria-hidden />
              Pridať mód
            </Button>
          </fieldset>
          <Field label="Kópia čoho" placeholder="napr. Robe Spiider, Clay Paky Sharpy" maxLength={120} error={errors.cloneOf?.message} {...register('cloneOf')} />
          <SelectField label="Sedí s fixtúrou v Capture?" error={errors.captureMatch?.message} {...register('captureMatch')}>
            <option value="">— nezistené —</option>
            {CAPTURE_MATCHES.map((match) => (
              <option key={match} value={match}>
                {CAPTURE_MATCH_LABELS[match]}
              </option>
            ))}
          </SelectField>
          {captureMatch && captureMatch !== 'yes' && (
            <Field
              label="Prečo nesedí / čo nesedí"
              className="sm:col-span-2"
              placeholder="napr. iné poradie kanálov, chýba zoom, použiť fixtúru Spiider Mode 2"
              maxLength={500}
              error={errors.captureNote?.message}
              {...register('captureNote')}
            />
          )}
        </Group>
      )}

      {kind === 'dj' && (
        <Group title="DJ technika">
          <SelectField label="Typ" error={errors.djType?.message} {...register('djType')}>
            <option value="">— nezadané —</option>
            {DJ_TYPES.map((type) => (
              <option key={type} value={type}>
                {DJ_TYPE_LABELS[type]}
              </option>
            ))}
          </SelectField>
          <Field label="Výkon (W)" type="number" inputMode="decimal" min={0} error={errors.powerW?.message} {...register('powerW', asOptionalNumber)} />
        </Group>
      )}

      {audio && (
        <Group title="Zvuk">
          <SelectField label="Typ" error={errors.audioType?.message} {...register('audioType')}>
            <option value="">— nezadané —</option>
            {AUDIO_TYPES.map((type) => (
              <option key={type} value={type}>
                {AUDIO_TYPE_LABELS[type]}
              </option>
            ))}
          </SelectField>
          <Field
            label="Výkon (W)"
            type="number"
            inputMode="decimal"
            min={0}
            error={errors.powerW?.message}
            {...register('powerW', asOptionalNumber)}
          />
          {hasBox(audioType) && (
            <fieldset className="sm:col-span-2">
              <legend className="mb-1 text-sm font-medium">Rozmery boxu (cm)</legend>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Šírka" type="number" inputMode="decimal" min={0} error={errors.boxWidthCm?.message} {...register('boxWidthCm', asOptionalNumber)} />
                <Field label="Hĺbka" type="number" inputMode="decimal" min={0} error={errors.boxDepthCm?.message} {...register('boxDepthCm', asOptionalNumber)} />
                <Field label="Výška" type="number" inputMode="decimal" min={0} error={errors.boxHeightCm?.message} {...register('boxHeightCm', asOptionalNumber)} />
              </div>
              {audioType === 'subwoofer' && (
                <Field
                  label="Vlastný delay subu (ms)"
                  className="mt-3 sm:w-64"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.1"
                  placeholder="napr. hornový / slimák"
                  error={errors.subDelayMs?.message}
                  {...register('subDelayMs', asOptionalNumber)}
                />
              )}
              <p className="mt-1 text-xs text-muted-foreground">Použije sa v delay kalkulačke (rozostup subov, cardioid, šírka radu).</p>
            </fieldset>
          )}
        </Group>
      )}

      {/* Video: LED panely a procesory pre LED kalkulačku (staršie položky iného druhu si údaje nechajú). */}
      {(kind === 'video' || isLedPanel || isLedProcessor || isDisplay) && (
        <fieldset className="rounded-xl border bg-surface p-4">
          <legend className="px-1 text-sm font-medium text-muted-foreground">Video</legend>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="size-4" {...register('isLedPanel')} />
            LED panel (pre LED kalkulačku)
          </label>
          {isLedPanel && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Pixel pitch (mm)" type="number" inputMode="decimal" min={0} step="0.1" placeholder="napr. 3,9" error={errors.ledPitchMm?.message} {...register('ledPitchMm', asOptionalNumber)} />
              <Field label="Šírka (mm) *" type="number" inputMode="decimal" min={1} error={errors.ledWidthMm?.message} {...register('ledWidthMm', asOptionalNumber)} />
              <Field label="Výška (mm) *" type="number" inputMode="decimal" min={1} error={errors.ledHeightMm?.message} {...register('ledHeightMm', asOptionalNumber)} />
              <Field label="Pixely šírka" type="number" inputMode="numeric" min={1} error={errors.ledPxW?.message} {...register('ledPxW', asOptionalNumber)} />
              <Field label="Pixely výška" type="number" inputMode="numeric" min={1} error={errors.ledPxH?.message} {...register('ledPxH', asOptionalNumber)} />
              <Field label="Váha (kg)" type="number" inputMode="decimal" min={0} error={errors.ledWeightKg?.message} {...register('ledWeightKg', asOptionalNumber)} />
              <Field label="Príkon max (W)" type="number" inputMode="decimal" min={0} error={errors.ledMaxW?.message} {...register('ledMaxW', asOptionalNumber)} />
              <Field label="Príkon priemer (W)" type="number" inputMode="decimal" min={0} error={errors.ledAvgW?.message} {...register('ledAvgW', asOptionalNumber)} />
              <p className="col-span-2 self-end text-xs text-muted-foreground sm:col-span-4">Pixely sa dopočítajú z rozmeru a pitchu, ak ich nevyplníte. Počet kusov = koľko panelov máme.</p>
            </div>
          )}
          <label className="mt-3 flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="size-4" {...register('isDisplay')} />
            Obrazovka – TV, monitor alebo projektor
          </label>
          {isDisplay && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <SelectField label="Typ" {...register('displayType')}>
                {DISPLAY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {DISPLAY_TYPE_LABELS[type]}
                  </option>
                ))}
              </SelectField>
              <Field label="Rozlíšenie šírka (px)" type="number" inputMode="numeric" placeholder="1920" error={errors.displayResW?.message} {...register('displayResW', asOptionalNumber)} />
              <Field label="Rozlíšenie výška (px)" type="number" inputMode="numeric" placeholder="1080" error={errors.displayResH?.message} {...register('displayResH', asOptionalNumber)} />
              <Field label="Uhlopriečka (palce)" type="number" inputMode="decimal" placeholder="55" error={errors.displayDiagonalIn?.message} {...register('displayDiagonalIn', asOptionalNumber)} />
              {displayType === 'projector' && (
                <Field label="Svietivosť (lm)" type="number" inputMode="numeric" placeholder="10000" error={errors.displayLumens?.message} {...register('displayLumens', asOptionalNumber)} />
              )}
            </div>
          )}
          <label className="mt-3 flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="size-4" {...register('isLedProcessor')} />
            LED procesor (napr. Novastar)
          </label>
          {isLedProcessor && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Field label="Výstupy (CH) *" type="number" inputMode="numeric" min={1} placeholder="napr. 4" error={errors.procOutputs?.message} {...register('procOutputs', asOptionalNumber)} />
              <Field label="Čip / platforma" placeholder="napr. Novastar, Linsn" maxLength={60} error={errors.procChip?.message} {...register('procChip')} />
              <SelectField label="Ovládanie" error={errors.procControl?.message} {...register('procControl')}>
                <option value="">— neuvedené —</option>
                {PROCESSOR_CONTROLS.map((control) => (
                  <option key={control} value={control}>
                    {PROCESSOR_CONTROL_LABELS[control]}
                  </option>
                ))}
              </SelectField>
              <Field label="HDMI (ks)" type="number" inputMode="numeric" min={0} {...register('procHdmi', asOptionalNumber)} />
              <Field label="DVI (ks)" type="number" inputMode="numeric" min={0} {...register('procDvi', asOptionalNumber)} />
              <Field label="SDI (ks)" type="number" inputMode="numeric" min={0} {...register('procSdi', asOptionalNumber)} />
              <Field label="DisplayPort (ks)" type="number" inputMode="numeric" min={0} {...register('procDp', asOptionalNumber)} />
              <Field label="VGA (ks)" type="number" inputMode="numeric" min={0} {...register('procVga', asOptionalNumber)} />
              <Field label="Pixelov na výstup" type="number" inputMode="numeric" placeholder="650000" error={errors.procPixels?.message} {...register('procPixels', asOptionalNumber)} />
              <Field label="Vstup šírka (px)" type="number" inputMode="numeric" placeholder="1920" error={errors.procInputW?.message} {...register('procInputW', asOptionalNumber)} />
              <Field label="Vstup výška (px)" type="number" inputMode="numeric" placeholder="1080" error={errors.procInputH?.message} {...register('procInputH', asOptionalNumber)} />
            </div>
          )}
        </fieldset>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Kategória"
          list={categoryListId}
          placeholder="Vyberte alebo napíšte novú"
          autoComplete="off"
          error={errors.category?.message}
          {...register('category')}
        />
        <datalist id={categoryListId}>
          {categories.map((category) => (
            <option key={category.id} value={category.name} />
          ))}
        </datalist>

        <Field
          label="Umiestnenie"
          list={locationListId}
          placeholder="Vyberte alebo napíšte nové"
          autoComplete="off"
          error={errors.location?.message}
          {...register('location')}
        />
        <datalist id={locationListId}>
          {locations.map((location) => (
            <option key={location.id} value={location.name} />
          ))}
        </datalist>

        <Field label="Výrobca" error={errors.manufacturer?.message} {...register('manufacturer')} />
        <Field label="Model" error={errors.model?.message} {...register('model')} />
        {!simple && (
          <Field label="Sériové číslo" autoComplete="off" error={errors.serialNumber?.message} {...register('serialNumber')} />
        )}
        <Field
          label="Inventárne číslo"
          autoComplete="off"
          error={errors.inventoryNumber?.message}
          {...register('inventoryNumber')}
        />
        <Field
          label="Počet kusov"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          error={errors.quantity?.message}
          {...register('quantity', { valueAsNumber: true })}
        />
        <Field
          label="Upozorniť, keď ostane (ks)"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          placeholder="nevyplnené = nesledovať"
          error={errors.minQuantity?.message}
          {...register('minQuantity', asOptionalNumber)}
        />
        <Field
          label="Cena prenájmu za kus a deň (€)"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          placeholder="nevyplnené = bez ceny"
          error={errors.rentalPrice?.message}
          {...register('rentalPrice', asOptionalNumber)}
        />
        <label className="flex cursor-pointer items-start gap-3 sm:col-span-2">
          <input type="checkbox" className="mt-0.5 size-5 shrink-0" {...register('trackUnits')} />
          <span>
            Evidovať každý kus zvlášť
            <span className="block text-sm text-muted-foreground">
              Kusy dostanú čísla #1, #2… a každý má vlastnú históriu servisu a výpožičiek (svetlá, repráky). Pri hákoch či
              gurtniach, kábloch či viazačoch nechajte vypnuté, tie sa rátajú len na počet.
            </span>
          </span>
        </label>
        {trackUnits && (
          <div className="sm:col-span-2">
            <Field
              label="Čísla kusov (nepovinné)"
              inputMode="numeric"
              autoComplete="off"
              placeholder="napr. 1, 4, 8 — prázdne = 1 až počet kusov"
              error={errors.unitIds?.message}
              {...register('unitIds')}
            />
            <p className="mt-1.5 text-sm text-muted-foreground">
              {parseUnitIds(unitIdsText ?? '').length > 0
                ? `Kusov podľa čísel: ${parseUnitIds(unitIdsText ?? '').length}. Počet kusov sa pri uložení nastaví podľa nich.`
                : 'Vyplňte, keď čísla nejdú po sebe – napríklad po vyradení kusu #2 ostanú 1, 3, 4. Ostatné kusy si svoje čísla a históriu nechajú.'}
            </p>
          </div>
        )}
        <SelectField label="Stav" error={errors.status?.message} {...register('status')}>
          {EQUIPMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </SelectField>
      </div>
      <p className="-mt-2 text-sm text-muted-foreground">
        Počet nechajte na 1, ak evidujete každý kus zvlášť. Viac kusov je pre veci na množstvo, napr. káble alebo háky. Pri
        spotrebnom materiáli (kvapalina do hazera) nastavte, pri koľkých kusoch sa má objaviť v zozname „treba kúpiť“.
      </p>

      <OwnerSelect companyId={companyId} error={errors.owner?.message} {...register('owner')} />

      <SelectField label="Case" error={errors.caseId?.message} {...register('caseId')}>
        <option value="">— nie je v žiadnom case —</option>
        {cases.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </SelectField>

      {!simple && (
        <>
          <Group title="Sieť (nepovinné)">
            <Field
              label="MAC adresa"
              placeholder="00:1A:2B:3C:4D:5E"
              autoComplete="off"
              autoCapitalize="characters"
              error={errors.macAddress?.message}
              {...register('macAddress')}
            />
            <Field
              label="IP adresa"
              placeholder="192.168.1.10"
              inputMode="decimal"
              autoComplete="off"
              error={errors.ipAddress?.message}
              {...register('ipAddress')}
            />
            <Field
              label="Prefix / maska"
              placeholder="24 (= 255.255.255.0)"
              type="number"
              inputMode="numeric"
              min={1}
              max={32}
              error={errors.ipPrefix?.message}
              {...register('ipPrefix', asOptionalNumber)}
            />
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" className="size-4" {...register('ipDhcp')} />
              IP prideľuje DHCP (bez pevnej adresy – pole IP nechajte prázdne)
            </label>
          </Group>

          <Group title="Servis (nepovinné)">
            <Field
              label="Interval (mesiace)"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              placeholder="napr. 12"
              error={errors.serviceIntervalMonths?.message}
              {...register('serviceIntervalMonths', asOptionalNumber)}
            />
            <Field label="Posledný servis" type="date" error={errors.lastServiceOn?.message} {...register('lastServiceOn')} />
          </Group>

          <Group title="Prevádzkové hodiny (nepovinné)">
            <Field
              label="Odčítať každých (mesiacov)"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              placeholder="napr. 3"
              error={errors.hoursIntervalMonths?.message}
              {...register('hoursIntervalMonths', asOptionalNumber)}
            />
            <p className="self-end text-sm text-muted-foreground">
              Pre zariadenia s vlastným počítadlom hodín (hlavy, zosilňovače). Appka pripomenie, kedy ho treba odčítať;
              samotný stav zapíšete v detaile techniky.
            </p>
          </Group>
        </>
      )}

      <PurchaseLinksFields control={control} register={register} errors={errors} trackUnits={trackUnits} unitIdsText={unitIdsText ?? ''} quantity={quantity} />

      <TextareaField label="Poznámka" error={errors.note?.message} {...register('note')} />

      {save.isError && !errors.inventoryNumber && (
        <p role="alert" className="text-sm text-destructive">
          Uloženie zlyhalo. {errorDetail(save.error) || 'Skontrolujte pripojenie a skúste to znova.'}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Ukladám…' : 'Uložiť'}
        </Button>
        <LinkButton to={cancelTo} variant="outline">
          Zrušiť
        </LinkButton>
      </div>
    </form>
  )
}

export function EquipmentFormPage() {
  const { id } = useParams()
  const company = useCompany().active!
  const lookups = useEquipmentLookups(company.companyId)
  const cases = useCases(company.companyId)
  const colors = useQuery({ queryKey: cableColorKeys.list(company.companyId), queryFn: () => fetchCableColors(company.companyId) })
  const item = useQuery({
    queryKey: equipmentKeys.detail(company.companyId, id ?? ''),
    queryFn: () => fetchEquipment(company.companyId, id!),
    enabled: Boolean(id),
  })

  const title = id ? 'Úprava techniky' : 'Nová technika'
  let body
  if (!can(company, 'equipment.edit')) {
    body = <ErrorBlock message="Na úpravu techniky nemáte oprávnenie." />
  } else if (lookups.isPending || cases.isPending || (id && item.isPending)) {
    body = <LoadingBlock />
  } else if (lookups.isError || cases.isError || item.isError) {
    const failed = item.error ?? cases.error ?? lookups.error
    body = (
      <ErrorBlock
        message={`Údaje sa nepodarilo načítať${item.isError ? ' (technika)' : cases.isError ? ' (cases)' : ' (kategórie / umiestnenia)'}. ${errorDetail(failed)}`}
        onRetry={() => void Promise.all([item.refetch(), cases.refetch(), lookups.refetch()])}
      />
    )
  } else if (id && !item.data) {
    body = <ErrorBlock message="Táto technika neexistuje alebo k nej nemáte prístup." />
  } else {
    body = (
      <EquipmentForm
        key={id ?? 'new'}
        companyId={company.companyId}
        equipment={item.data ?? null}
        categories={lookups.categories}
        locations={lookups.locations}
        cases={cases.data}
        colors={colors.data ?? []}
        canEditColors={can(company, 'lookups.manage')}
      />
    )
  }

  return (
    <>
      <PageHeader title={title} />
      {body}
    </>
  )
}
