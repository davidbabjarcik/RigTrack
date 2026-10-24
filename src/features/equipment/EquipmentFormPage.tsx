import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useId, useState, useSyncExternalStore, type ReactNode } from 'react'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, LinkButton } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { useCapsules } from '@/features/capsules/api'
import { useCases } from '@/features/cases/useCases'
import { useCompany } from '@/features/companies/company-context'
import { OwnerSelect } from '@/features/staff/OwnerSelect'
import { can } from '@/lib/permissions'
import { errorDetail } from '@/lib/supabase/errors'
import { cn } from '@/lib/utils'
import { equipmentKeys, fetchEquipment, saveEquipment } from './api'
import { cableColorKeys, fetchCableColors, saveCableColor, type CableColor } from './cableColors'
import { LengthColorField, type ColorEdit } from './LengthColorField'
import {
  asOptionalNumber,
  AUDIO_TYPE_LABELS,
  AUDIO_TYPES,
  PA_TYPES,
  CAPTURE_MATCH_LABELS,
  CAPTURE_MATCHES,
  COMMON_CONNECTORS,
  DJ_TYPE_LABELS,
  DJ_TYPES,
  VIDEO_TYPE_LABELS,
  VIDEO_TYPES,
  CAMERA_SENSOR_LABELS,
  CAMERA_SENSORS,
  STAND_TYPES,
  IT_TYPE_LABELS,
  IT_TYPES,
  APPLIANCE_TYPE_LABELS,
  APPLIANCE_TYPES,
  cableBaseName,
  cableName,
  CONDITION_LABELS,
  CONDITIONS,
  SUB_DESIGN_LABELS,
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
  LIGHT_TYPE_GROUPS,
  LIGHT_TYPE_LABELS,
  isTrussSection,
  TRUSS_TYPE_LABELS,
  TRUSS_TYPES,
  TRUSS_SHAPE_LABELS,
  TRUSS_SHAPES,
  STAGE_TYPE_LABELS,
  STAGE_TYPES,
  STATUS_LABELS,
  type Equipment,
  type EquipmentFormValues,
  type Lookup,
} from './model'
import { PurchaseLinksFields } from './PurchaseLinksFields'
import { UnitDetailsFields } from './UnitDetailsFields'
import { CableMakersField } from './CableMakersField'
import { isCollapsed, setCollapsed, subscribeCollapsed } from '@/components/layout/collapsed'
import { CHECK_LEVEL_LABELS, CHECK_LEVELS, levelDays, useCheckLevels } from '@/features/checks/levels'
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
  lightType: '',
  trackHours: false,
  hoursPriority: 'normal',
  lampChangedOn: '',
  trussType: '',
  trussShape: '',
  stageType: '',
  stageBrand: '',
  stageSize: '',
  audioType: '',
  djType: '',
  videoType: '',
  cameraSensor: '',
  hdmiOut: false,
  itType: '',
  applianceType: '',
  madeIn: '',
  color: '',
  condition: '',
  mixerKind: '',
  mixerCard: '',
  micKind: '',
  cableType: 'cable',
  rfRange: '',
  micType: '',
  capsuleIds: [],
  powered: '',
  woofer: '',
  connectors: '',
  poleMount: false,
  subDesign: '',
  freqRange: '',
  freqResponse: '',
  coverage: '',
  crossover: '',
  biamp: false,
  hfDriver: '',
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
  unitInfo: [],
  makers: [],
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
    // Staršie pódiá mali značku zvlášť; teraz je vo Výrobcovi.
    manufacturer: equipment.manufacturer || (equipment.kind === 'stage' ? (equipment.attributes.stageBrand ?? '') : ''),
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
    lightType: equipment.attributes.lightType ?? '',
    // Staršia technika s intervalom v mesiacoch prejde na sledovanie so strednou úrovňou.
    trackHours: equipment.attributes.trackHours ?? (equipment.hoursIntervalMonths !== null || equipment.operatingHours !== null),
    hoursPriority: equipment.attributes.hoursPriority ?? 'normal',
    lampChangedOn: equipment.attributes.lampChangedOn ?? '',
    lampChangedHours: equipment.attributes.lampChangedHours,
    trussType: equipment.attributes.trussType ?? '',
    trussShape: equipment.attributes.trussShape ?? '',
    stageType: equipment.attributes.stageType ?? '',
    stageBrand: '',
    stageSize: equipment.attributes.stageSize ?? '',
    audioType: equipment.attributes.audioType ?? '',
    djType: equipment.attributes.djType ?? '',
    videoType: equipment.attributes.videoType ?? '',
    cameraSensor: equipment.attributes.cameraSensor ?? '',
    hdmiOut: equipment.attributes.hdmiOut ?? false,
    itType: equipment.attributes.itType ?? '',
    applianceType: equipment.attributes.applianceType ?? '',
    madeYear: equipment.attributes.madeYear,
    madeIn: equipment.attributes.madeIn ?? '',
    ampW2: equipment.attributes.ampW2,
    ampW4: equipment.attributes.ampW4,
    ampW8: equipment.attributes.ampW8,
    ampBridge4: equipment.attributes.ampBridge4,
    ampBridge8: equipment.attributes.ampBridge8,
    color: equipment.attributes.color ?? '',
    condition: equipment.attributes.condition ?? '',
    mixerKind: equipment.attributes.mixerKind ?? '',
    mixerChannels: equipment.attributes.mixerChannels,
    mixerCard: equipment.attributes.mixerCard ?? '',
    micKind: equipment.attributes.micKind ?? '',
    cableType: equipment.attributes.cableType ?? 'cable',
    rfRange: equipment.attributes.rfRange ?? '',
    micType: equipment.attributes.micType ?? '',
    capsuleIds: equipment.attributes.capsuleIds ?? [],
    powered: equipment.attributes.powered ?? '',
    rmsW: equipment.attributes.rmsW,
    peakW: equipment.attributes.peakW,
    woofer: equipment.attributes.woofer ?? '',
    maxSplDb: equipment.attributes.maxSplDb,
    connectors: equipment.attributes.connectors ?? '',
    poleMount: equipment.attributes.poleMount ?? false,
    subDesign: equipment.attributes.subDesign ?? '',
    programW: equipment.attributes.programW,
    maxSplPeakDb: equipment.attributes.maxSplPeakDb,
    sensitivityDb: equipment.attributes.sensitivityDb,
    impedanceOhm: equipment.attributes.impedanceOhm,
    freqRange: equipment.attributes.freqRange ?? '',
    freqResponse: equipment.attributes.freqResponse ?? '',
    coverage: equipment.attributes.coverage ?? '',
    crossover: equipment.attributes.crossover ?? '',
    biamp: equipment.attributes.biamp ?? false,
    hfDriver: equipment.attributes.hfDriver ?? '',
    weightKg: equipment.attributes.weightKg,
    purchasePrice: equipment.attributes.purchasePrice,
    depreciationYears: equipment.attributes.depreciationYears,
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
    makers: equipment.attributes.makers ?? [],
    unitInfo: Object.entries(equipment.unitInfo ?? {}).map(([unit, info]) => ({ unit: Number(unit), serial: info.serial ?? '', inv: info.inv ?? '', from: info.from ?? '' })),
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

/** Skupina polí; kliknutím na nadpis sa zbalí a prehliadač si to pamätá (pre všetku techniku). */
function Group({ title, children }: { title: string; children: ReactNode }) {
  const id = `equipment.form.${title}`
  const collapsed = useSyncExternalStore(subscribeCollapsed, () => isCollapsed(id))
  return (
    <fieldset className="rounded-xl border bg-surface p-4">
      <legend className="px-1 text-sm font-medium text-muted-foreground">
        <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" aria-expanded={!collapsed} onClick={() => setCollapsed(id, !collapsed)}>
          <ChevronDown className={cn('size-4 transition-transform', collapsed && '-rotate-90')} aria-hidden />
          {title}
        </button>
      </legend>
      <div className="grid gap-4 sm:grid-cols-2" hidden={collapsed}>
        {children}
      </div>
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
    setValue,
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
  const videoType = useWatch({ control, name: 'videoType' })
  const cableType = useWatch({ control, name: 'cableType' })
  const powered = useWatch({ control, name: 'powered' })
  const lightType = useWatch({ control, name: 'lightType' })
  const lightSource = useWatch({ control, name: 'lightSource' })
  const trackHours = useWatch({ control, name: 'trackHours' })
  const checkDays = useCheckLevels(companyId).days
  const trussType = useWatch({ control, name: 'trussType' })
  const stageType = useWatch({ control, name: 'stageType' })
  const stageBrandList = useId()
  const lightAccessory = Boolean(lightType && lightType.startsWith('acc_'))
  const mixerKind = useWatch({ control, name: 'mixerKind' })
  const micKind = useWatch({ control, name: 'micKind' })
  const capsuleIds = useWatch({ control, name: 'capsuleIds' }) ?? []
  const capsules = useCapsules(companyId)
  const wirelessMic = audio && (audioType === 'wireless' || (audioType === 'microphone' && micKind === 'wireless'))
  const displayType = useWatch({ control, name: 'displayType' })
  const simple = isSimpleKind(kind, categoryText ?? '')
  // Neuložené farby dĺžok podľa dĺžky; uložia sa spolu s káblom.
  const [colorEdits, setColorEdits] = useState<Record<number, ColorEdit>>({})
  // Ďalšie dĺžky nového kábla (namiesto samostatnej „Sady káblov“).
  const [extraLengths, setExtraLengths] = useState<{ lengthM: number; quantity: number }[]>([])
  // Nový bežný kábel: dĺžky a počty v jednom zozname (počet kusov dole sa vtedy neukazuje).
  const multiLength = !equipment && kind === 'cable' && (cableType ?? 'cable') === 'cable'
  // Sieť a servis sa ukážu len pri technike, ktorá ich má (alebo keď ich zaškrtnete).
  const [showNetwork, setShowNetwork] = useState(() => Boolean(equipment?.macAddress || equipment?.ipAddress || equipment?.attributes.ipDhcp))
  const [showService, setShowService] = useState(() => Boolean(equipment?.serviceIntervalMonths || equipment?.lastServiceOn))

  const save = useMutation({
    mutationFn: async (values: EquipmentFormValues) => {
      const colorEdit = values.kind === 'cable' && values.lengthM !== undefined ? colorEdits[values.lengthM] : undefined
      if (colorEdit) await saveCableColor(companyId, { lengthM: values.lengthM!, ...colorEdit })
      const id = await saveEquipment({ companyId, id: equipment?.id ?? null, values, categories, locations })
      // Nový kábel: každá ďalšia dĺžka je samostatná položka s rovnakým konektorom a kategóriou.
      if (!equipment && values.kind === 'cable' && (values.cableType ?? 'cable') === 'cable') {
        const base = cableBaseName(values.name)
        const known = [...categories]
        for (const extra of extraLengths.filter((row) => row.lengthM > 0 && row.quantity > 0)) {
          await saveEquipment({ companyId, id: null, values: { ...values, name: cableName(base, extra.lengthM), lengthM: extra.lengthM, quantity: extra.quantity }, categories: known, locations })
        }
      }
      return id
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
        <SelectField
          label="Druh"
          error={errors.kind?.message}
          {...register('kind', {
            // Sada káblov a kapsule majú vlastné formuláre.
            onChange: (event: { target: { value: string } }) => {
              if (event.target.value === 'capsule') navigate('/equipment/capsules?new=1')
            },
          })}
        >
          {EQUIPMENT_KINDS.map((value) => (
            <option key={value} value={value}>
              {KIND_LABELS[value]}
            </option>
          ))}
          {!equipment && (
            <optgroup label="Iný formulár">
              <option value="capsule">Kapsula k mikrofónu</option>
            </optgroup>
          )}
        </SelectField>
        <Field label="Názov *" autoFocus={!equipment} error={errors.name?.message} {...register('name')} />
      </div>

      {kind === 'cable' && (
        <Group title="Kábel">
          <SelectField label="Typ" {...register('cableType')}>
            <option value="cable">Kábel</option>
            <option value="adapter">Redukcia</option>
            <option value="di">DI box</option>
          </SelectField>
          {cableType === 'di' && (
            <SelectField label="DI box" {...register('powered')}>
              <option value="">—</option>
              <option value="active">Aktívny</option>
              <option value="passive">Pasívny</option>
            </SelectField>
          )}
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
          {multiLength ? (
            // Nový kábel: jeden zoznam dĺžok – prvý riadok je táto položka, každý ďalší samostatná položka.
            <div className="sm:col-span-2">
              <div className="mb-1 grid grid-cols-[1fr_6rem_2.5rem] gap-2 text-sm font-medium">
                <span>Dĺžka (m)</span>
                <span>Kusov</span>
                <span />
              </div>
              <ul className="flex flex-col gap-2">
                <li className="grid grid-cols-[1fr_6rem_2.5rem] items-start gap-2">
                  <Field label="Dĺžka (m)" hideLabel type="number" inputMode="decimal" min={0} step="0.1" placeholder="napr. 5" error={errors.lengthM?.message} {...register('lengthM', asOptionalNumber)} />
                  <Field label="Kusov" hideLabel type="number" inputMode="numeric" min={0} step={1} error={errors.quantity?.message} {...register('quantity', { valueAsNumber: true })} />
                  <span />
                </li>
                {extraLengths.map((row, index) => (
                  <li key={index} className="grid grid-cols-[1fr_6rem_2.5rem] items-start gap-2">
                    <Field
                      label={`Dĺžka (m) – riadok ${index + 2}`}
                      hideLabel
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.1"
                      placeholder="napr. 10"
                      value={Number.isNaN(row.lengthM) ? '' : row.lengthM}
                      onChange={(e) => setExtraLengths(extraLengths.map((item, i) => (i === index ? { ...item, lengthM: e.target.valueAsNumber } : item)))}
                    />
                    <Field
                      label={`Kusov – riadok ${index + 2}`}
                      hideLabel
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={Number.isNaN(row.quantity) ? '' : row.quantity}
                      onChange={(e) => setExtraLengths(extraLengths.map((item, i) => (i === index ? { ...item, quantity: e.target.valueAsNumber } : item)))}
                    />
                    <Button variant="ghost" className="h-11 px-0" aria-label={`Odobrať dĺžku ${index + 2}`} onClick={() => setExtraLengths(extraLengths.filter((_, i) => i !== index))}>
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </li>
                ))}
              </ul>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setExtraLengths([...extraLengths, { lengthM: Number.NaN, quantity: 1 }])}>
                <Plus className="size-4" aria-hidden />
                Pridať dĺžku
              </Button>
              {extraLengths.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">Každá dĺžka sa uloží ako samostatná položka, napr. „XLR kábel 5 m“, „XLR kábel 10 m“.</p>
              )}
            </div>
          ) : (
            <Field
              label="Dĺžka (m)"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              error={errors.lengthM?.message}
              {...register('lengthM', asOptionalNumber)}
            />
          )}
          <div className="sm:col-span-2">
            <LengthColorField
              lengthM={lengthM}
              existing={colors}
              edit={lengthM === undefined ? undefined : colorEdits[lengthM]}
              onEdit={(edit) => lengthM !== undefined && setColorEdits((current) => ({ ...current, [lengthM]: edit }))}
              canEdit={canEditColors}
            />
          </div>
          <CableMakersField companyId={companyId} control={control} register={register} quantity={quantity} />
        </Group>
      )}

      {kind === 'truss' && (
        <Group title="Hliník / truss">
          <SelectField label="Typ" error={errors.trussType?.message} {...register('trussType')}>
            <option value="">— nezadané —</option>
            {TRUSS_TYPES.map((type) => (
              <option key={type} value={type}>
                {TRUSS_TYPE_LABELS[type]}
              </option>
            ))}
          </SelectField>
          {trussType?.startsWith('point') && (
            <SelectField label="Tvar" {...register('trussShape')}>
              <option value="">— nezadané —</option>
              {TRUSS_SHAPES.map((shape) => (
                <option key={shape} value={shape}>
                  {TRUSS_SHAPE_LABELS[shape]}
                </option>
              ))}
            </SelectField>
          )}
          {isTrussSection(trussType) && (
            <Field
              label="Dĺžka dielu (m)"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.5"
              error={errors.lengthM?.message}
              {...register('lengthM', asOptionalNumber)}
            />
          )}
        </Group>
      )}

      {kind === 'it' && (
        <Group title="IT">
          <SelectField label="Typ" {...register('itType')}>
            <option value="">— nezadané —</option>
            {IT_TYPES.map((type) => (
              <option key={type} value={type}>
                {IT_TYPE_LABELS[type]}
              </option>
            ))}
          </SelectField>
        </Group>
      )}

      {kind === 'appliance' && (
        <Group title="Spotrebič">
          <SelectField label="Typ" {...register('applianceType')}>
            <option value="">— nezadané —</option>
            {APPLIANCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {APPLIANCE_TYPE_LABELS[type]}
              </option>
            ))}
          </SelectField>
          <Field label="Príkon (W)" type="number" inputMode="decimal" min={0} error={errors.powerW?.message} {...register('powerW', asOptionalNumber)} />
        </Group>
      )}

      {kind === 'stage' && (
        <Group title="Pódium">
          <SelectField label="Typ" {...register('stageType')}>
            <option value="">— nezadané —</option>
            {STAGE_TYPES.map((type) => (
              <option key={type} value={type}>
                {STAGE_TYPE_LABELS[type]}
              </option>
            ))}
          </SelectField>
          {stageType === 'deck' && (
            <>
              <Field label="Veľkosť" placeholder="napr. 2 × 1 m" maxLength={40} {...register('stageSize')} />
            </>
          )}
        </Group>
      )}

      {lighting && (
        <Group title="Svetlo">
          <SelectField label="Typ svetla" error={errors.lightType?.message} {...register('lightType')}>
            <option value="">— nezadané —</option>
            {LIGHT_TYPE_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.types.map((type) => (
                  <option key={type} value={type}>
                    {LIGHT_TYPE_LABELS[type]}
                  </option>
                ))}
              </optgroup>
            ))}
          </SelectField>
          {!lightAccessory && (
            <Field label="Príkon (W)" type="number" inputMode="decimal" min={0} error={errors.powerW?.message} {...register('powerW', asOptionalNumber)} />
          )}
          {!lightAccessory && (
          <SelectField label="Zdroj svetla" error={errors.lightSource?.message} {...register('lightSource')}>
            <option value="">— neuvedené —</option>
            {LIGHT_SOURCES.map((source) => (
              <option key={source} value={source}>
                {LIGHT_SOURCE_LABELS[source]}
              </option>
            ))}
          </SelectField>
          )}
          {!lightAccessory && (
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
          )}
          <Field label="Kópia čoho" placeholder="napr. Robe Spiider, Clay Paky Sharpy" maxLength={120} error={errors.cloneOf?.message} {...register('cloneOf')} />
          <SelectField label="Sedí s fixtúrou v Capture?" error={errors.captureMatch?.message} {...register('captureMatch')}>
            <option value="">— nezistené —</option>
            {CAPTURE_MATCHES.map((match) => (
              <option key={match} value={match}>
                {CAPTURE_MATCH_LABELS[match]}
              </option>
            ))}
          </SelectField>
          {(lightSource === 'discharge' || lightSource === 'halogen') && !lightAccessory && (
            <>
              <Field label={lightSource === 'discharge' ? 'Výbojka naposledy menená' : 'Žiarovka naposledy menená'} type="date" error={errors.lampChangedOn?.message} {...register('lampChangedOn')} />
              <Field label="Stav počítadla pri výmene (h)" type="number" inputMode="decimal" min={0} placeholder="nepovinné" error={errors.lampChangedHours?.message} {...register('lampChangedHours', asOptionalNumber)} />
            </>
          )}
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
          <SelectField label="Stav" {...register('condition')}>
            <option value="">— nezadané —</option>
            {CONDITIONS.map((condition) => (
              <option key={condition} value={condition}>
                {CONDITION_LABELS[condition]}
              </option>
            ))}
          </SelectField>
          <Field label="Rok výroby" type="number" inputMode="numeric" min={1950} max={2100} placeholder="napr. 2021" error={errors.madeYear?.message} {...register('madeYear', asOptionalNumber)} />
          <Field label="Krajina výroby" placeholder="napr. Japonsko, Čína" maxLength={60} {...register('madeIn')} />
          <Field label="Farba" placeholder="napr. čierna, biela (limitovaná)" maxLength={40} {...register('color')} />
        </Group>
      )}

      {audio && (
        <Group title="Zvuk">
          <SelectField label="Typ" error={errors.audioType?.message} {...register('audioType')}>
            <option value="">— nezadané —</option>
            <optgroup label="PA">
              {PA_TYPES.map((type) => (
                <option key={type} value={type}>
                  {AUDIO_TYPE_LABELS[type]}
                </option>
              ))}
            </optgroup>
            <optgroup label="Stojany">
              {STAND_TYPES.map((type) => (
                <option key={type} value={type}>
                  {AUDIO_TYPE_LABELS[type]}
                </option>
              ))}
            </optgroup>
            <optgroup label="Mikrofóny a ostatné">
              {AUDIO_TYPES.filter((type) => !(PA_TYPES as readonly string[]).includes(type) && !(STAND_TYPES as readonly string[]).includes(type) && (type !== 'di' || audioType === 'di')).map((type) => (
                <option key={type} value={type}>
                  {AUDIO_TYPE_LABELS[type]}
                </option>
              ))}
            </optgroup>
          </SelectField>
          {(audioType === 'amplifier' || audioType === 'processor' || (hasBox(audioType) && powered === 'active')) && (
            <Field label="Príkon zo siete (W)" type="number" inputMode="decimal" min={0} error={errors.powerW?.message} {...register('powerW', asOptionalNumber)} />
          )}
          {audioType === 'amplifier' && (
            <>
              <Field label="Výkon 2 Ω na kanál (W)" type="number" inputMode="numeric" min={0} placeholder="napr. 1800" error={errors.ampW2?.message} {...register('ampW2', asOptionalNumber)} />
              <Field label="Výkon 4 Ω na kanál (W)" type="number" inputMode="numeric" min={0} placeholder="napr. 2000" error={errors.ampW4?.message} {...register('ampW4', asOptionalNumber)} />
              <Field label="Výkon 8 Ω na kanál (W)" type="number" inputMode="numeric" min={0} placeholder="napr. 1250" error={errors.ampW8?.message} {...register('ampW8', asOptionalNumber)} />
              <Field label="Bridge 4 Ω (W)" type="number" inputMode="numeric" min={0} placeholder="napr. 3600" error={errors.ampBridge4?.message} {...register('ampBridge4', asOptionalNumber)} />
              <Field label="Bridge 8 Ω (W)" type="number" inputMode="numeric" min={0} placeholder="napr. 4000" error={errors.ampBridge8?.message} {...register('ampBridge8', asOptionalNumber)} />
              <Field label="Krajina výroby" placeholder="napr. Kórea, Čína" maxLength={60} {...register('madeIn')} />
            </>
          )}
          {audioType === 'mixer' && (
            <>
              <SelectField label="Mixpult" error={errors.mixerKind?.message} {...register('mixerKind')}>
                <option value="">— nezadané —</option>
                <option value="analog">Analógový</option>
                <option value="digital">Digitálny</option>
              </SelectField>
              <Field label="Počet kanálov" type="number" inputMode="numeric" min={1} placeholder="napr. 32" error={errors.mixerChannels?.message} {...register('mixerChannels', asOptionalNumber)} />
              {mixerKind === 'digital' && (
                <Field label="Karta" placeholder="napr. Dante, MADI, USB, AES50" maxLength={80} error={errors.mixerCard?.message} {...register('mixerCard')} />
              )}
            </>
          )}
          {(audioType === 'wireless' || audioType === 'iem') && (
            <Field label="Frekvenčný rozsah" placeholder="napr. G51 470–534 MHz" maxLength={60} {...register('rfRange')} />
          )}
          {audioType === 'stagebox' && (
            <Field label="Karta / protokol" placeholder="napr. Dante, AES50, MADI" maxLength={80} {...register('mixerCard')} />
          )}
          {audioType === 'microphone' && (
            <>
              <SelectField label="Mikrofón" error={errors.micKind?.message} {...register('micKind')}>
                <option value="">— nezadané —</option>
                <option value="wired">Káblový</option>
                <option value="wireless">Bezdrôtový</option>
              </SelectField>
              <SelectField label="Typ mikrofónu" error={errors.micType?.message} {...register('micType')}>
                <option value="">— nezadané —</option>
                <option value="dynamic">Dynamický</option>
                <option value="condenser">Kondenzátorový (phantom 48 V)</option>
              </SelectField>
            </>
          )}
          {wirelessMic && (
            <fieldset className="sm:col-span-2">
              <legend className="mb-1.5 text-sm font-medium">Kapsule, ktoré pasujú</legend>
              <div className="flex flex-wrap gap-2">
                {(capsules.data ?? []).map((capsule) => {
                  const on = capsuleIds.includes(capsule.id)
                  return (
                    <button
                      key={capsule.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setValue('capsuleIds', on ? capsuleIds.filter((id) => id !== capsule.id) : [...capsuleIds, capsule.id], { shouldDirty: true })}
                      className={cn('h-9 rounded-lg border px-3 text-sm font-medium', on ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted')}
                    >
                      {[capsule.manufacturer, capsule.name].filter(Boolean).join(' ')}
                    </button>
                  )
                })}
                <Link to="/equipment/capsules?new=1" target="_blank" className="inline-flex h-9 items-center gap-1 rounded-lg border border-dashed px-3 text-sm text-accent hover:bg-muted">
                  <Plus className="size-4" aria-hidden />
                  Nová kapsula
                </Link>
              </div>
              {capsules.isError && <p className="mt-1 text-xs text-muted-foreground">Kapsule sa nedajú načítať (migrácia 0060).</p>}
            </fieldset>
          )}
          {hasBox(audioType) && (
            <fieldset className="grid grid-cols-2 items-end gap-3 sm:col-span-2 sm:grid-cols-4">
              <legend className="mb-1 text-sm font-medium">{AUDIO_TYPE_LABELS[audioType as keyof typeof AUDIO_TYPE_LABELS]}</legend>
              <SelectField label="Aktívny / pasívny" {...register('powered')}>
                <option value="">—</option>
                <option value="active">Aktívny</option>
                <option value="passive">Pasívny</option>
              </SelectField>
              {audioType === 'subwoofer' && (
                <SelectField label="Konštrukcia" {...register('subDesign')}>
                  <option value="">—</option>
                  {(Object.keys(SUB_DESIGN_LABELS) as (keyof typeof SUB_DESIGN_LABELS)[]).map((design) => (
                    <option key={design} value={design}>
                      {SUB_DESIGN_LABELS[design]}
                    </option>
                  ))}
                </SelectField>
              )}
              <Field label="Výkon continuous / RMS (W)" type="number" inputMode="decimal" min={0} error={errors.rmsW?.message} {...register('rmsW', asOptionalNumber)} />
              <Field label="Výkon program (W)" type="number" inputMode="decimal" min={0} error={errors.programW?.message} {...register('programW', asOptionalNumber)} />
              <Field label="Výkon peak (W)" type="number" inputMode="decimal" min={0} error={errors.peakW?.message} {...register('peakW', asOptionalNumber)} />
              <Field label="Impedancia (Ω)" type="number" inputMode="decimal" min={0} placeholder="8" error={errors.impedanceOhm?.message} {...register('impedanceOhm', asOptionalNumber)} />
              <Field label="LF driver (woofer)" placeholder={audioType === 'subwoofer' ? 'napr. 2× 18″' : 'napr. 1× 15″ JBL 2265H'} maxLength={40} {...register('woofer')} />
              {audioType !== 'subwoofer' && <Field label="HF driver" placeholder="napr. JBL 2452H, 1,5″ výstup" maxLength={80} {...register('hfDriver')} />}
              <Field label="Max SPL continuous (dB)" type="number" inputMode="decimal" min={0} error={errors.maxSplDb?.message} {...register('maxSplDb', asOptionalNumber)} />
              <Field label="Max SPL peak (dB)" type="number" inputMode="decimal" min={0} error={errors.maxSplPeakDb?.message} {...register('maxSplPeakDb', asOptionalNumber)} />
              <Field label="Citlivosť 1 W / 1 m (dB)" type="number" inputMode="decimal" min={0} error={errors.sensitivityDb?.message} {...register('sensitivityDb', asOptionalNumber)} />
              <Field label="Frekvenčný rozsah (−10 dB)" placeholder="napr. 60 Hz – 20 kHz" maxLength={40} {...register('freqRange')} />
              <Field label="Frekvenčná odozva (±3 dB)" placeholder="napr. 70 Hz – 20 kHz" maxLength={40} {...register('freqResponse')} />
              {audioType !== 'subwoofer' && <Field label="Vyžarovací uhol" placeholder="napr. 50° × 90°" maxLength={40} {...register('coverage')} />}
              <Field label="Výhybka" placeholder="napr. 1,1 kHz" maxLength={40} {...register('crossover')} />
              <label className="flex items-end gap-2 pb-3 text-sm">
                <input type="checkbox" className="size-4" {...register('biamp')} />
                Dá sa na bi-amp
              </label>
              <Field label="Konektory" placeholder="napr. XLR, speakON NL4, powerCON" maxLength={80} {...register('connectors')} />
              <label className="flex items-end gap-2 pb-3 text-sm">
                <input type="checkbox" className="size-4" {...register('poleMount')} />
                Hniezdo na stojan (35 mm)
              </label>
            </fieldset>
          )}
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
          <SelectField
            label="Typ"
            className="sm:w-72"
            value={isLedPanel ? 'led_panel' : isLedProcessor ? 'led_processor' : isDisplay ? (displayType ?? 'tv') : (videoType ?? '')}
            onChange={(e) => {
              const value = e.target.value
              const opts = { shouldDirty: true }
              setValue('videoType', (VIDEO_TYPES as readonly string[]).includes(value) ? (value as (typeof VIDEO_TYPES)[number]) : '', opts)
              setValue('isLedPanel', value === 'led_panel', opts)
              setValue('isLedProcessor', value === 'led_processor', opts)
              setValue('isDisplay', value === 'tv' || value === 'monitor' || value === 'projector', opts)
              if (value === 'tv' || value === 'monitor' || value === 'projector') setValue('displayType', value, opts)
            }}
          >
            <option value="">— nezadané —</option>
            <option value="led_panel">LED panel</option>
            <option value="led_processor">LED procesor (napr. Novastar)</option>
            <option value="tv">TV</option>
            <option value="monitor">Monitor</option>
            <option value="projector">Projektor</option>
            {VIDEO_TYPES.map((type) => (
              <option key={type} value={type}>
                {VIDEO_TYPE_LABELS[type]}
              </option>
            ))}
          </SelectField>
          {videoType === 'camera' && !isLedPanel && !isLedProcessor && !isDisplay && (
            <div className="mt-3 grid grid-cols-2 items-end gap-3 sm:grid-cols-4">
              <SelectField label="Snímač / typ" {...register('cameraSensor')}>
                <option value="">— nezadané —</option>
                {CAMERA_SENSORS.map((sensor) => (
                  <option key={sensor} value={sensor}>
                    {CAMERA_SENSOR_LABELS[sensor]}
                  </option>
                ))}
              </SelectField>
              <label className="flex items-center gap-2 pb-3 text-sm">
                <input type="checkbox" className="size-4" {...register('hdmiOut')} />
                Má HDMI výstup
              </label>
            </div>
          )}
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
          {isDisplay && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Field label="Rozlíšenie šírka (px)" type="number" inputMode="numeric" placeholder="1920" error={errors.displayResW?.message} {...register('displayResW', asOptionalNumber)} />
              <Field label="Rozlíšenie výška (px)" type="number" inputMode="numeric" placeholder="1080" error={errors.displayResH?.message} {...register('displayResH', asOptionalNumber)} />
              <Field label="Uhlopriečka (palce)" type="number" inputMode="decimal" placeholder="55" error={errors.displayDiagonalIn?.message} {...register('displayDiagonalIn', asOptionalNumber)} />
              {displayType === 'projector' && (
                <Field label="Svietivosť (lm)" type="number" inputMode="numeric" placeholder="10000" error={errors.displayLumens?.message} {...register('displayLumens', asOptionalNumber)} />
              )}
            </div>
          )}
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
        {/* Pódium má vlastný typ (dosky, nohy…), všeobecná kategória by ho len zdvojovala. */}
        {kind !== 'stage' && (
          <Field
            label="Kategória"
            list={categoryListId}
            placeholder="Vyberte alebo napíšte novú"
            autoComplete="off"
            error={errors.category?.message}
            {...register('category')}
          />
        )}
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

        <Field
          label={kind === 'stage' ? 'Výrobca / značka' : 'Výrobca'}
          list={kind === 'stage' ? stageBrandList : undefined}
          placeholder={kind === 'stage' ? 'napr. Nivtec originál' : undefined}
          error={errors.manufacturer?.message}
          {...register('manufacturer')}
        />
        {kind === 'stage' && (
          <datalist id={stageBrandList}>
            <option value="Nivtec originál" />
            <option value="Nivtec kompatibilné" />
            <option value="Bütec" />
            <option value="Litec" />
          </datalist>
        )}
        <Field label="Váha kusu (kg)" type="number" inputMode="decimal" min={0} step="0.1" error={errors.weightKg?.message} {...register('weightKg', asOptionalNumber)} />
        <Field label="Model" error={errors.model?.message} {...register('model')} />
        {/* Pri evidencii po kusoch má každý kus svoje sériové a inventárne číslo (nižšie, Údaje po kusoch). */}
        {!simple && !trackUnits && (
          <Field label="Sériové číslo" autoComplete="off" error={errors.serialNumber?.message} {...register('serialNumber')} />
        )}
        <Field
          label={trackUnits ? 'Inventárne číslo položky (spoločné, nepovinné)' : 'Inventárne číslo'}
          autoComplete="off"
          error={errors.inventoryNumber?.message}
          {...register('inventoryNumber')}
        />
        {!multiLength && (
          <Field
            label="Počet kusov"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            error={errors.quantity?.message}
            {...register('quantity', { valueAsNumber: true })}
          />
        )}
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
          <UnitDetailsFields control={control} register={register} errors={errors} unitIdsText={unitIdsText ?? ''} quantity={quantity} />
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
        Pri evidencii po kusoch zadajte počet kusov a údaje každého kusu vyplníte priamo pod tým. Pri spotrebnom materiáli
        (kvapalina do hazera) nastavte, pri koľkých kusoch sa má objaviť v zozname „treba kúpiť“.
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
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="size-5" checked={showNetwork}
              onChange={(event) => {
                setShowNetwork(event.target.checked)
                if (!event.target.checked) {
                  setValue('macAddress', '')
                  setValue('ipAddress', '')
                  setValue('ipPrefix', undefined)
                  setValue('ipDhcp', false)
                }
              }} />
            Zariadenie je v sieti (má IP alebo MAC adresu)
          </label>
          {showNetwork && (
          <Group title="Sieť">
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
          )}

          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="size-5" checked={showService}
              onChange={(event) => {
                setShowService(event.target.checked)
                if (!event.target.checked) {
                  setValue('serviceIntervalMonths', undefined)
                  setValue('lastServiceOn', '')
                }
              }} />
            Pravidelný servis
          </label>
          {showService && (
          <Group title="Servis">
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
          )}

          <Group title="Prevádzkové hodiny (nepovinné)">
            <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
              <input type="checkbox" className="size-4" {...register('trackHours')} />
              Sledovať prevádzkové hodiny (zosilňovače, svetlá s počítadlom)
            </label>
            {trackHours && (
              <SelectField label="Úroveň kontroly – ako často odčítať" {...register('hoursPriority')}>
                {CHECK_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {CHECK_LEVEL_LABELS[level]}
                    {levelDays(level, checkDays) !== null ? ` – každých ${levelDays(level, checkDays)} dní` : ' – len zapisovať, nepripomínať'}
                  </option>
                ))}
              </SelectField>
            )}
            <p className="self-end text-sm text-muted-foreground">
              Stav počítadla zapíšete v detaile techniky, tam je aj graf. Dni pri úrovniach nastaví admin v Nastaveniach → Pripomienky.
            </p>
          </Group>
        </>
      )}

      <PurchaseLinksFields control={control} register={register} errors={errors} perUnit={Boolean(trackUnits)} />

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
