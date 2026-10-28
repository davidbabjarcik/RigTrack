import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, LinkButton } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { caseTitle, type Case } from '@/features/cases/model'
import { useCases } from '@/features/cases/useCases'
import { useCompany } from '@/features/companies/company-context'
import { OwnerSelect } from '@/features/staff/OwnerSelect'
import { can } from '@/lib/permissions'
import { errorDetail } from '@/lib/supabase/errors'
import { copyEquipmentPhoto, equipmentKeys, fetchEquipment, fetchEquipmentList, saveEquipment, syncEquipmentGroup } from './api'
import { cableColorKeys, fetchCableColors, resolveCableType, saveCableColor, type CableColor } from './cableColors'
import { LengthColorField, type ColorEdit } from './LengthColorField'
import {
  asOptionalNumber,
  CABLE_VARIANTS,
  COMMON_CONNECTORS,
  DJ_TYPE_LABELS,
  DJ_TYPES,
  IT_TYPE_LABELS,
  IT_TYPES,
  APPLIANCE_TYPE_LABELS,
  APPLIANCE_TYPES,
  cableBaseName,
  cableName,
  CONDITION_LABELS,
  CONDITIONS,
  EQUIPMENT_KINDS,
  EQUIPMENT_STATUSES,
  equipmentSchema,
  isAudio,
  isLighting,
  unitInfoToForm,
  isSimpleKind,
  KIND_LABELS,
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
import { makerModeOf, makersOver, makersToSave, type Maker, type MakerMode } from './makers'
import { CHECK_LEVEL_LABELS, CHECK_LEVELS, levelDays, useCheckLevels } from '@/features/checks/levels'
import { useEquipmentLookups } from './useEquipmentLookups'
import { Group } from './FormGroup'
import { AudioFields } from './AudioFields'
import { LightingFields } from './LightingFields'
import { VideoFields } from './VideoFields'

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
  noCase: false,
  sheetAccessory: false,
  cableVariant: '',
  inCover: false,
  coverNote: '',
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

/** Duplikát: rovnaké údaje ako vzor, bez toho, čo patrí len jednému kusu (sériové a inventárne číslo, MAC, IP, case, čísla kusov). */
function copyFormValues(source: Equipment, categories: Lookup[], locations: Lookup[]): EquipmentFormValues {
  return {
    ...toFormValues(source, categories, locations),
    serialNumber: '',
    inventoryNumber: '',
    macAddress: '',
    ipAddress: '',
    caseId: '',
    unitIds: '',
    unitInfo: [],
    lastServiceOn: '',
    status: 'available',
  }
}

/** „#1–#16“ alebo „#1–#4, #9“: súvislé čísla kusov ako rozsah. */
function formatUnitList(units: number[]) {
  const parts: string[] = []
  for (let index = 0; index < units.length; index++) {
    let end = index
    while (end + 1 < units.length && units[end + 1] === units[end] + 1) end++
    parts.push(end > index ? `#${units[index]}–#${units[end]}` : `#${units[index]}`)
    index = end
  }
  return parts.join(', ')
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
    noCase: equipment.attributes.noCase ?? false,
    sheetAccessory: equipment.attributes.sheetAccessory ?? false,
    cableVariant: equipment.attributes.cableVariant ?? '',
    dipSwitches: equipment.attributes.dipSwitches,
    nodeProtocols: equipment.attributes.nodeProtocols ?? [],
    nodePorts: equipment.attributes.nodePorts ?? [],
    dipNote: equipment.attributes.dipNote ?? '',
    inCover: equipment.attributes.inCover ?? false,
    coverNote: equipment.attributes.coverNote ?? '',
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
    ampKind: equipment.attributes.ampKind ?? '',
    ampPresetSlots: equipment.attributes.ampPresetSlots,
    ampDeviceId: equipment.attributes.ampDeviceId ?? '',
    ampPresets: (equipment.attributes.ampPresets ?? []).map((preset) => ({ slot: preset.slot, name: preset.name, speakerId: preset.speakerId ?? '', note: preset.note ?? '', locked: Boolean(preset.locked) })),
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
    unitInfo: unitInfoToForm(equipment.unitInfo),
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

type FormProps = {
  companyId: string
  equipment: Equipment | null
  /** Vzor pri duplikovaní: nová technika s jeho údajmi. */
  copyFrom?: Equipment | null
  categories: Lookup[]
  locations: Lookup[]
  cases: Pick<Case, 'id' | 'name' | 'labelNumber'>[]
  colors: CableColor[]
  canEditColors: boolean
}

function EquipmentForm({ companyId, equipment, copyFrom, categories, locations, cases, colors, canEditColors }: FormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const categoryListId = useId()
  const locationListId = useId()
  const connectorListId = useId()
  const [searchParams] = useSearchParams()
  // ?group=id1,id2 – úprava všetkých častí rozdelenej techniky naraz (zo zoznamu techniky).
  const groupIds = (searchParams.get('group') ?? '').split(',').filter(Boolean)
  const canAddresses = can(useCompany().active!, 'networks.addresses')
  // Hromadná úprava sa vracia na prehľad skupiny, nie na jednu časť.
  const cancelTo = equipment ? (groupIds.length > 1 ? `/equipment/group?ids=${groupIds.join(',')}` : `/equipment/${equipment.id}`) : '/equipment'
  const groupMode = Boolean(equipment) && groupIds.length > 1
  const groupList = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId), enabled: groupMode })
  const groupParts = (groupList.data ?? []).filter((item) => groupIds.includes(item.id))
  const groupPieces = groupParts.reduce((sum, item) => sum + item.quantity, 0)
  const groupUnits = groupParts.flatMap((item) => (item.trackUnits ? item.unitIds : [])).sort((a, b) => a - b)
  const ownerPreset = searchParams.get('owner') ?? ''

  const methods = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentSchema),
    // Z karty zamestnanca sa dá pridať jeho vlastná technika (?owner=…).
    defaultValues: equipment
      ? toFormValues(equipment, categories, locations)
      : copyFrom
        ? copyFormValues(copyFrom, categories, locations)
        : { ...EMPTY, owner: ownerPreset },
  })
  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = methods
  const kind = useWatch({ control, name: 'kind' })
  const dmxModesValue = useWatch({ control, name: 'dmxModes' })
  const categoryText = useWatch({ control, name: 'category' })
  // Časť Svetlo sa ukáže pri druhu Svetlo aj pri kategórii, ktorá je o svetlách.
  const lighting = isLighting(kind, categoryText ?? '')
  const audio = isAudio(kind, categoryText ?? '')
  const trackUnits = useWatch({ control, name: 'trackUnits' })
  const unitIdsText = useWatch({ control, name: 'unitIds' })
  const lengthM = useWatch({ control, name: 'lengthM' })
  const quantity = useWatch({ control, name: 'quantity' })
  const isLedPanel = useWatch({ control, name: 'isLedPanel' })
  const isLedProcessor = useWatch({ control, name: 'isLedProcessor' })
  const isDisplay = useWatch({ control, name: 'isDisplay' })
  const cableType = useWatch({ control, name: 'cableType' })
  const trackHours = useWatch({ control, name: 'trackHours' })
  const caseValue = useWatch({ control, name: 'caseId' })
  const inCover = useWatch({ control, name: 'inCover' })
  const checkDays = useCheckLevels(companyId).days
  const trussType = useWatch({ control, name: 'trussType' })
  const stageType = useWatch({ control, name: 'stageType' })
  const stageBrandList = useId()
  const simple = isSimpleKind(kind, categoryText ?? '')
  // Neuložené farby dĺžok podľa dĺžky; uložia sa spolu s káblom.
  const [colorEdits, setColorEdits] = useState<Record<number, ColorEdit>>({})
  const connectorValue = useWatch({ control, name: 'connector' })
  // Ďalšie dĺžky nového kábla (namiesto samostatnej „Sady káblov“).
  const [extraLengths, setExtraLengths] = useState<{ lengthM: number; quantity: number; makers?: Maker[] }[]>([])
  // Kto káble vyrobil: nič, jeden človek na všetky kusy, alebo pri každej dĺžke kto koľko.
  const savedMakers = equipment?.attributes.makers ?? []
  const [makerMode, setMakerMode] = useState<MakerMode>(() => makerModeOf(savedMakers, equipment?.quantity ?? 0))
  const [oneMaker, setOneMaker] = useState(() => (makerModeOf(savedMakers, equipment?.quantity ?? 0) === 'one' ? savedMakers[0].name : ''))
  const mainMakers = useWatch({ control, name: 'makers' }) ?? []
  // Nový bežný kábel: dĺžky a počty v jednom zozname (počet kusov dole sa vtedy neukazuje).
  const multiLength = !equipment && kind === 'cable' && (cableType ?? 'cable') === 'cable'
  // Sieť a servis sa ukážu len pri technike, ktorá ich má (alebo keď ich zaškrtnete).
  const [showNetwork, setShowNetwork] = useState(() => Boolean(equipment?.macAddress || equipment?.ipAddress || equipment?.attributes.ipDhcp))
  const [showService, setShowService] = useState(() => Boolean(equipment?.serviceIntervalMonths || equipment?.lastServiceOn))

  const lengthTitle = (value: number | undefined) => (value !== undefined && Number.isFinite(value) && value > 0 ? `${String(value).replace('.', ',')} m` : 'Dĺžka bez zadania')
  const makerRows = [
    { key: 'main', title: multiLength || lengthM ? lengthTitle(lengthM) : 'Táto položka', quantity: Number.isFinite(quantity) ? quantity : 0, makers: mainMakers },
    ...(multiLength ? extraLengths.map((row, i) => ({ key: `x${i}`, title: lengthTitle(row.lengthM), quantity: Number.isFinite(row.quantity) ? row.quantity : 0, makers: row.makers ?? [] })) : []),
  ]
  const makersInvalid = kind === 'cable' && makerMode === 'split' && makerRows.some(makersOver)

  const save = useMutation({
    mutationFn: async (values: EquipmentFormValues) => {
      const colorEdit = values.kind === 'cable' && values.lengthM !== undefined ? colorEdits[values.lengthM] : undefined
      if (colorEdit) await saveCableColor(companyId, { lengthM: values.lengthM!, cableType: resolveCableType(colors, values.connector), ...colorEdit })
      const isCable = values.kind === 'cable'
      const id = await saveEquipment({
        companyId,
        id: equipment?.id ?? null,
        values: isCable
          ? {
              ...values,
              // Nový kábel s dĺžkou: aj prvá dĺžka má dĺžku v názve („XLR 5 m“), rovnako ako ďalšie dĺžky.
              name: multiLength && values.lengthM ? cableName(cableBaseName(values.name), values.lengthM) : values.name,
              makers: makersToSave(makerMode, oneMaker, values.quantity, values.makers ?? []),
            }
          : values,
        categories,
        locations,
        addresses: canAddresses,
      })
      // Duplikát dostane vlastnú kópiu fotky vzoru.
      if (!equipment && copyFrom?.photoPath) await copyEquipmentPhoto(companyId, id, copyFrom.photoPath).catch(() => {})
      // „Upraviť všetky naraz“: spoločné údaje aj do ostatných častí rozdelenej techniky.
      if (equipment && groupIds.length > 1) await syncEquipmentGroup(companyId, id, groupIds)
      // Nový kábel: každá ďalšia dĺžka je samostatná položka s rovnakým konektorom a kategóriou (a svojimi výrobcami).
      if (!equipment && values.kind === 'cable' && (values.cableType ?? 'cable') === 'cable') {
        const base = cableBaseName(values.name)
        const known = [...categories]
        for (const extra of extraLengths.filter((row) => row.lengthM > 0 && row.quantity > 0)) {
          const makers = makersToSave(makerMode, oneMaker, extra.quantity, extra.makers ?? [])
          await saveEquipment({ companyId, id: null, values: { ...values, name: cableName(base, extra.lengthM), lengthM: extra.lengthM, quantity: extra.quantity, makers }, categories: known, locations, addresses: canAddresses })
        }
      }
      return id
    },
    onSuccess: async (id) => {
      // Uloženie mohlo založiť novú kategóriu či umiestnenie, preto celý strom firmy.
      await queryClient.invalidateQueries({ queryKey: ['company', companyId] })
      navigate(equipment && groupIds.length > 1 ? `/equipment/group?ids=${groupIds.join(',')}` : `/equipment/${id}`, { replace: true })
    },
    onError: (error: { code?: string; message?: string }) => {
      if (error.code === '23505' && error.message?.includes('inventory_number')) {
        setError('inventoryNumber', { message: 'Toto inventárne číslo už má iná technika' }, { shouldFocus: true })
      }
    },
  })

  return (
    <FormProvider {...methods}>
    <form onSubmit={handleSubmit((values) => save.mutate(values))} noValidate className="flex flex-col gap-4">
      {!equipment && copyFrom && (
        <p role="status" className="rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm">
          <strong>Kópia „{copyFrom.name}“.</strong> Upravte, čo treba, a uložte – vznikne nová technika (aj s fotkou). Sériové a
          inventárne číslo, MAC, IP, case a čísla kusov sa nekopírujú.
        </p>
      )}
      {equipment && groupIds.length > 1 && equipment.kind === 'cable' && (
        <p role="status" className="rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm">
          <strong>Úprava všetkých {groupIds.length} dĺžok naraz.</strong> Fotka, výrobca, konektor, kategória, poznámka a ďalšie
          spoločné údaje sa po uložení prenesú do všetkých dĺžok. Názov s dĺžkou, dĺžka, kto kábel vyrobil, cena, počet kusov,
          case a stav ostanú pri každej dĺžke vlastné. Ak tu zmeníte názov, ostatné dĺžky dostanú nový názov so svojou dĺžkou.
        </p>
      )}
      {equipment && groupIds.length > 1 && equipment.kind !== 'cable' && (
        <p role="status" className="rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm">
          <strong>Úprava všetkých {groupIds.length} častí naraz.</strong> Názov, výrobca, model, kategória, parametre, poznámka, fotka a
          ďalšie spoločné údaje sa po uložení prenesú do všetkých. Počet kusov, čísla kusov, case, sériové a inventárne čísla a stav
          ostanú pri každej časti vlastné.
        </p>
      )}
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
          {/* Variant toho istého typu (stereo, silent jack…): na hárku ostane v stĺpci typu, ale označený. */}
          <Field
            label="Variant (nepovinné)"
            list={`${connectorListId}-variant`}
            placeholder="napr. stereo, silent – prázdne = obyčajný"
            autoComplete="off"
            maxLength={40}
            error={errors.cableVariant?.message}
            {...register('cableVariant')}
          />
          <datalist id={`${connectorListId}-variant`}>
            {CABLE_VARIANTS.map((variant) => (
              <option key={variant} value={variant} />
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
              connector={connectorValue}
              existing={colors}
              edit={lengthM === undefined ? undefined : colorEdits[lengthM]}
              onEdit={(edit) => lengthM !== undefined && setColorEdits((current) => ({ ...current, [lengthM]: edit }))}
              canEdit={canEditColors}
            />
          </div>
          <CableMakersField
            companyId={companyId}
            mode={makerMode}
            onMode={setMakerMode}
            oneName={oneMaker}
            onOneName={setOneMaker}
            rows={makerRows}
            onRow={(key, makers) =>
              key === 'main'
                ? setValue('makers', makers, { shouldDirty: true })
                : setExtraLengths(extraLengths.map((item, i) => (`x${i}` === key ? { ...item, makers } : item)))
            }
          />
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

      {lighting && <LightingFields />}

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

      {audio && <AudioFields companyId={companyId} />}

      {/* Video: LED panely a procesory pre LED kalkulačku (staršie položky iného druhu si údaje nechajú). */}
      {(kind === 'video' || isLedPanel || isLedProcessor || isDisplay) && <VideoFields />}

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
        {!simple && !trackUnits && !groupMode && (
          <Field label="Sériové číslo" autoComplete="off" error={errors.serialNumber?.message} {...register('serialNumber')} />
        )}
        {!groupMode && (
          <Field
            label={trackUnits ? 'Inventárne číslo položky (spoločné, nepovinné)' : 'Inventárne číslo'}
            autoComplete="off"
            error={errors.inventoryNumber?.message}
            {...register('inventoryNumber')}
          />
        )}
        {groupMode && (
          <div className="rounded-lg border bg-muted/40 p-3 text-sm sm:col-span-2">
            <p className="font-medium">
              Spolu {groupPieces} ks v {groupIds.length} častiach{groupUnits.length > 0 && ` (${formatUnitList(groupUnits)})`}
            </p>
            <p className="text-muted-foreground">Počet kusov, čísla kusov, sériové a inventárne čísla, stav a case sa menia pri každej časti zvlášť.</p>
          </div>
        )}
        {!multiLength && !groupMode && (
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
        <label className={groupMode ? 'hidden' : 'flex cursor-pointer items-start gap-3 sm:col-span-2'}>
          <input type="checkbox" className="mt-0.5 size-5 shrink-0" {...register('trackUnits')} />
          <span>
            Evidovať každý kus zvlášť
            <span className="block text-sm text-muted-foreground">
              Kusy dostanú čísla #1, #2… a každý má vlastnú históriu servisu a výpožičiek (svetlá, repráky). Pri hákoch či
              gurtniach, kábloch či viazačoch nechajte vypnuté, tie sa rátajú len na počet.
            </span>
          </span>
        </label>
        {trackUnits && !groupMode && (
          <UnitDetailsFields
            control={control}
            register={register}
            errors={errors}
            unitIdsText={unitIdsText ?? ''}
            quantity={quantity}
            dmxModes={lighting ? (dmxModesValue ?? []).map((mode) => mode.name || `${mode.channels} ch`).filter(Boolean) : null}
          />
        )}
        <SelectField label="Stav" className={groupMode ? 'hidden' : undefined} error={errors.status?.message} {...register('status')}>
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

      <SelectField label="Case" className={groupMode ? 'hidden' : undefined} error={errors.caseId?.message} {...register('caseId')}>
        <option value="">— nie je v žiadnom case —</option>
        {[...cases]
          .sort((a, b) => caseTitle(a).localeCompare(caseTitle(b), 'sk', { numeric: true }))
          .map((item) => (
            <option key={item.id} value={item.id}>
              {caseTitle(item)}
            </option>
          ))}
      </SelectField>
      {!caseValue && !groupMode && (
        <div className="-mt-2 flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4" {...register('inCover')} />
            Má vlastný obal (nie case) – napr. reprobox v obale
          </label>
          {inCover && <Field label="Aký obal (nepovinné)" placeholder="napr. obal na top, poťah na sub" maxLength={80} error={errors.coverNote?.message} {...register('coverNote')} />}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4" {...register('noCase')} />
            Nepatrí do case ani racku (nehlásiť ako „mimo case“)
          </label>
        </div>
      )}

      {/* IP a MAC len s oprávnením „Vidieť IP a MAC adresy“ (inak ich databáza ani nevráti). */}
      {!simple && canAddresses && (
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

      {makersInvalid && <p className="text-sm text-destructive">Pri niektorej dĺžke je výrobcov viac kusov, ako má kábel – opravte „Kto káble vyrobil“.</p>}
      <div className="flex gap-3">
        <Button type="submit" disabled={save.isPending || makersInvalid}>
          {save.isPending ? 'Ukladám…' : 'Uložiť'}
        </Button>
        <LinkButton to={cancelTo} variant="outline">
          Zrušiť
        </LinkButton>
      </div>
    </form>
    </FormProvider>
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
  // /equipment/new?copy=<id> – duplikovanie: formulár novej techniky s údajmi vzoru.
  const search = useLocation().search
  const copyId = id ? null : new URLSearchParams(search).get('copy')
  const copy = useQuery({
    queryKey: equipmentKeys.detail(company.companyId, copyId ?? ''),
    queryFn: () => fetchEquipment(company.companyId, copyId!),
    enabled: Boolean(copyId),
  })

  const title = id ? 'Úprava techniky' : copyId ? 'Duplikovať techniku' : 'Nová technika'
  let body
  if (!can(company, 'equipment.edit')) {
    body = <ErrorBlock message="Na úpravu techniky nemáte oprávnenie." />
  } else if (lookups.isPending || cases.isPending || (id && item.isPending) || (copyId && copy.isPending)) {
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
        key={id ?? `new-${copyId ?? ''}`}
        companyId={company.companyId}
        equipment={item.data ?? null}
        copyFrom={copy.data ?? null}
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
