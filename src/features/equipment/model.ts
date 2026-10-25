import { z } from 'zod'
import { DEFAULT_CHECK_DAYS, levelDays, type CheckLevel, type CheckLevelDays } from '@/features/checks/levels'
import type { CategoryColor } from './categoryColors'

export const EQUIPMENT_STATUSES = ['available', 'loaned', 'in_service', 'damaged', 'retired'] as const
export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number]

export const STATUS_LABELS: Record<EquipmentStatus, string> = {
  available: 'Dostupná',
  loaned: 'Vypožičaná',
  in_service: 'V servise',
  damaged: 'Poškodená',
  retired: 'Vyradená',
}

// Druh určuje, na čo sa formulár pýta. Zodpovedá check constraint v 0007_equipment_details.sql.
// Poradie vo výbere: zvuk, svetlo, stage, pódium, káble, spotrebný materiál, ostatné.
export const EQUIPMENT_KINDS = ['audio', 'light', 'video', 'dj', 'truss', 'stage', 'cable', 'it', 'appliance', 'consumable', 'general'] as const
export type EquipmentKind = (typeof EQUIPMENT_KINDS)[number]

export const KIND_LABELS: Record<EquipmentKind, string> = {
  general: 'Ostatné / všeobecné',
  cable: 'Kábel',
  light: 'Svetlo',
  video: 'Video (LED, procesory, projektory)',
  dj: 'DJ technika',
  it: 'IT (mobil, tablet, notebook…)',
  appliance: 'Spotrebiče (kávovar, chladnička…)',
  audio: 'Zvuk',
  truss: 'Stage – hliník / truss',
  stage: 'Pódium (Nivtec a príslušenstvo)',
  consumable: 'Spotrebný materiál',
}

export const LIGHT_SOURCES = ['led', 'discharge', 'halogen', 'laser', 'other'] as const
export type LightSource = (typeof LIGHT_SOURCES)[number]

/** Typ hliníka: koľko-bodový truss, ground support, príslušenstvo, stojany a lifty. */
export const TRUSS_TYPES = ['point1', 'point2', 'point3', 'point4', 'ground_support', 'accessory', 'stand_lift'] as const
export type TrussType = (typeof TRUSS_TYPES)[number]
export const TRUSS_TYPE_LABELS: Record<TrussType, string> = {
  point1: '1-point truss',
  point2: '2-point truss',
  point3: '3-point truss',
  point4: '4-point truss',
  ground_support: 'Ground support',
  accessory: 'Príslušenstvo k trussu',
  stand_lift: 'Stojany / lifty',
}
/** Tvar dielu trussu: rovný, roh, T (tečko), kríž, kocka, kruh / oblúk. */
export const TRUSS_SHAPES = ['straight', 'corner', 'tee', 'cross', 'box', 'circle', 'other'] as const
export type TrussShape = (typeof TRUSS_SHAPES)[number]
export const TRUSS_SHAPE_LABELS: Record<TrussShape, string> = {
  straight: 'Rovný',
  corner: 'Roh',
  tee: 'T (tečko)',
  cross: 'Kríž',
  box: 'Kocka',
  circle: 'Kruh / oblúk',
  other: 'Iný tvar',
}

/** Pódium: dosky alebo príslušenstvo. */
export const STAGE_TYPES = ['deck', 'accessory'] as const
export type StageType = (typeof STAGE_TYPES)[number]
export const STAGE_TYPE_LABELS: Record<StageType, string> = { deck: 'Dosky', accessory: 'Príslušenstvo' }

/** Truss, ktorý má dĺžku dielu (1–4-point). */
export const isTrussSection = (type: TrussType | '' | undefined) => !type || type.startsWith('point')

/** Typ svetla v skupinách; „acc_“ je príslušenstvo (bez príkonu, zdroja a DMX). */
export const LIGHT_TYPE_GROUPS = [
  { label: 'Pohyblivé svetlá', types: ['moving_beam', 'moving_wash', 'moving_spot', 'moving_hybrid'] },
  { label: 'Statické svetlá', types: ['led_par', 'led_bar'] },
  { label: 'Efektové svetlá', types: ['blinder', 'strobe', 'pixel_line', 'laser', 'special_fx'] },
  { label: 'Profilové / divadelné', types: ['profile', 'fresnel'] },
  { label: 'Výrobníky', types: ['smoke', 'hazer', 'fazer'] },
  { label: 'Príslušenstvo', types: ['acc_hook', 'acc_clamp', 'acc_barndoor', 'acc_converter', 'acc_console', 'acc_license', 'acc_fluid', 'acc_other'] },
] as const
export const LIGHT_TYPES = LIGHT_TYPE_GROUPS.flatMap((group) => group.types)
export type LightType = (typeof LIGHT_TYPE_GROUPS)[number]['types'][number]
export const LIGHT_TYPE_LABELS: Record<LightType, string> = {
  moving_beam: 'Beam',
  moving_wash: 'Wash',
  moving_spot: 'Spot',
  moving_hybrid: 'Hybrid',
  led_par: 'LED PAR',
  led_bar: 'LED bar',
  blinder: 'Blinder',
  strobe: 'Strobo',
  pixel_line: 'Pixel line',
  laser: 'Laser',
  special_fx: 'Špeciálne efekty',
  profile: 'Profil',
  fresnel: 'Fresnel',
  smoke: 'Dymostroj',
  hazer: 'Hazer',
  fazer: 'Fazer',
  acc_hook: 'Háky',
  acc_clamp: 'Klemy',
  acc_barndoor: 'Klapky',
  acc_converter: 'Prevodníky (DMX / sieť)',
  acc_console: 'Mixpult na svetlá',
  acc_license: 'Licenčné kľúče',
  acc_fluid: 'Kvapaliny',
  acc_other: 'Iné príslušenstvo',
}

export const LIGHT_SOURCE_LABELS: Record<LightSource, string> = {
  led: 'LED',
  discharge: 'Výbojka',
  halogen: 'Halogén',
  laser: 'Laser',
  other: 'Iné',
}

export const SUB_DESIGN_LABELS = { direct: 'Priamy (bass reflex)', horn: 'Horna', snail: 'Slimák' } as const

/** Video okrem LED a obrazoviek: kamery, statívy, objektívy, gimbaly. */
export const VIDEO_TYPES = ['camera', 'tripod', 'lens', 'gimbal', 'other'] as const
export type VideoType = (typeof VIDEO_TYPES)[number]
export const VIDEO_TYPE_LABELS: Record<VideoType, string> = { camera: 'Kamera', tripod: 'Statív', lens: 'Objektív', gimbal: 'Gimbal', other: 'Iné video' }

/** Kamera: snímač (full frame, APS-C) alebo akčná kamera. */
export const CAMERA_SENSORS = ['full_frame', 'aps_c', 'action', 'other'] as const
export type CameraSensor = (typeof CAMERA_SENSORS)[number]
export const CAMERA_SENSOR_LABELS: Record<CameraSensor, string> = { full_frame: 'Full frame', aps_c: 'APS-C', action: 'Akčná kamera', other: 'Iný snímač' }

export const IT_TYPES = ['phone', 'tablet', 'laptop', 'computer', 'network', 'other'] as const
export type ItType = (typeof IT_TYPES)[number]
export const IT_TYPE_LABELS: Record<ItType, string> = { phone: 'Mobil', tablet: 'Tablet / iPad', laptop: 'Notebook', computer: 'Počítač', network: 'Router / sieť', other: 'Iné IT' }

export const APPLIANCE_TYPES = ['coffee', 'fridge', 'kettle', 'heater', 'other'] as const
export type ApplianceType = (typeof APPLIANCE_TYPES)[number]
export const APPLIANCE_TYPE_LABELS: Record<ApplianceType, string> = { coffee: 'Kávovar', fridge: 'Chladnička', kettle: 'Rýchlovarná kanvica', heater: 'Ohrievač', other: 'Iný spotrebič' }

/** Podtyp DJ techniky. */
export const DJ_TYPES = ['mixer', 'player', 'turntable', 'all_in_one', 'pc_controller', 'other'] as const
export type DjType = (typeof DJ_TYPES)[number]
export const DJ_TYPE_LABELS: Record<DjType, string> = {
  mixer: 'Mix (DJ mixpult)',
  player: 'Player',
  turntable: 'Gramofón',
  all_in_one: 'All-in-one konzola',
  pc_controller: 'Konzola na PC',
  other: 'Iné',
}

/** Čo je to za zvukovú techniku; podľa toho sa dá v zozname hľadať aj triediť. */
export const AUDIO_TYPES = ['line_array', 'speaker', 'monitor', 'subwoofer', 'mixer', 'amplifier', 'microphone', 'wireless', 'iem', 'di', 'stagebox', 'processor', 'speaker_stand', 'mic_stand', 'other'] as const
/** Stojany (na repráky a mikrofóny) – vlastná skupina vo výbere. */
export const STAND_TYPES = ['speaker_stand', 'mic_stand'] as const
/** Typy zvuku v skupine PA (ozvučenie); ostatné sú mikrofóny, stageboxy a pod. */
export const PA_TYPES = ['line_array', 'speaker', 'monitor', 'subwoofer', 'mixer', 'amplifier', 'processor', 'stagebox'] as const
/** DI box sa zadáva pri kábloch (Kábel → typ DI box); starší zvuk s typom DI ostáva platný. */
export const HIDDEN_AUDIO_TYPES = ['di'] as const
export type AudioType = (typeof AUDIO_TYPES)[number]

export const AUDIO_TYPE_LABELS: Record<AudioType, string> = {
  line_array: 'Line array (LA systém)',
  speaker_stand: 'Stojan na repráky',
  mic_stand: 'Stojan na mikrofón',
  mixer: 'Mixpult',
  microphone: 'Mikrofón',
  speaker: 'Live / portable PA (vrch)',
  subwoofer: 'Sub (basák)',
  monitor: 'Monitor',
  amplifier: 'Zosilňovač',
  processor: 'Procesor / DSP',
  di: 'DI box',
  stagebox: 'Stagebox',
  wireless: 'Bezdrôtový systém',
  iem: 'In-ear',
  other: 'Iné',
}

export const COMMON_CONNECTORS = [
  'XLR',
  'DMX 3-pin',
  'DMX 5-pin',
  'powerCON napájací',
  'powerCON prepojovací',
  'powerCON TRUE1',
  'Schuko',
  'CEE 16A',
  'CEE 32A',
  'speakON',
  'Jack 6,3 mm',
  'RJ45 / etherCON',
  'SDI (BNC)',
  'HDMI',
]

/** Údaje špecifické pre druh techniky (stĺpec equipment.attributes). */
export type EquipmentAttributes = {
  connector?: string
  lengthM?: number
  /** Kábel: kto ho vyrobil a koľko kusov (z 10 XLR spravil 8 Jano a 2 Fero). */
  makers?: { name: string; count: number }[]
  powerW?: number
  lightSource?: LightSource
  /** Typ hliníka (1–4-point, ground support, príslušenstvo, stojany / lifty). */
  trussType?: TrussType
  trussShape?: TrussShape
  /** Pódium: dosky (značka, veľkosť) alebo príslušenstvo. */
  stageType?: StageType
  stageBrand?: string
  stageSize?: string
  /** Technika, ktorá do case ani racku nepatrí (napr. stojany, kabeláž na cievke) – nehlási sa ako „mimo case“. */
  noCase?: boolean
  /** Sledovať prevádzkové hodiny (zosilňovače, svetlá) a s akou úrovňou kontroly odčítavať počítadlo. */
  trackHours?: boolean
  hoursPriority?: CheckLevel
  /** Výbojka / halogén: kedy sa naposledy menila a stav počítadla pri výmene. */
  lampChangedOn?: string
  lampChangedHours?: number
  /** Typ svetla (pohyblivé, statické, efektové, divadelné, výrobníky, príslušenstvo). */
  lightType?: LightType
  /** Typ zvukovej techniky (mixpult, mikrofón…). */
  audioType?: AudioType
  /** Podtyp DJ techniky (mix, player, gramofón…). */
  djType?: DjType
  videoType?: VideoType
  cameraSensor?: CameraSensor
  /** Kamera má HDMI výstup (čistý obraz do prepínača / LED). */
  hdmiOut?: boolean
  itType?: ItType
  applianceType?: ApplianceType
  /** DJ technika: rok a krajina výroby, farba, stav. */
  madeYear?: number
  madeIn?: string
  /** Zosilňovač: výkon (W) pri 2 Ω na kanál, 4 Ω a 8 Ω na kanál a v bridge. */
  ampW2?: number
  ampW4?: number
  ampW8?: number
  ampBridge4?: number
  ampBridge8?: number
  /** Zosilňovač analógový alebo digitálny (DSP s presetmi). */
  ampKind?: 'analog' | 'digital'
  /** Digitálny zosilňovač: koľko presetov sa doň zmestí a ktoré sú zapísané (aj ku ktorému reproboxu). */
  ampPresetSlots?: number
  ampPresets?: AmpPreset[]
  color?: string
  condition?: Condition
  /** Mixpult: analógový / digitálny, počet kanálov a pri digitálnom karta (Dante, MADI, USB…). */
  mixerKind?: 'analog' | 'digital'
  mixerChannels?: number
  mixerCard?: string
  /** Kábel alebo DI box (pri druhu Kábel). */
  cableType?: 'cable' | 'adapter' | 'di'
  /** Bezdrôtový systém / in-ear: frekvenčný rozsah (napr. G51 470–534 MHz). */
  rfRange?: string
  /** Mikrofón: káblový alebo bezdrôtový, dynamický alebo kondenzátorový (ten potrebuje phantom 48 V). */
  micKind?: 'wired' | 'wireless'
  micType?: 'dynamic' | 'condenser'
  /** Bezdrôtový mikrofón: kapsule, ktoré k nemu pasujú (id zo zoznamu kapsúl). */
  capsuleIds?: string[]
  /** Reprobox / sub / odposluch: aktívny alebo pasívny, výkon RMS a peak, woofery, max SPL, konektory, hniezdo na stojan. */
  powered?: 'active' | 'passive'
  rmsW?: number
  peakW?: number
  woofer?: string
  maxSplDb?: number
  connectors?: string
  poleMount?: boolean
  /** Katalógové údaje PA (napr. z listu JBL): výkon program, SPL peak, citlivosť, impedancia, frekvencie, uhol, výhybka, bi-amp, HF driver. */
  programW?: number
  maxSplPeakDb?: number
  sensitivityDb?: number
  impedanceOhm?: number
  freqRange?: string
  freqResponse?: string
  coverage?: string
  crossover?: string
  biamp?: boolean
  hfDriver?: string
  /** Sub: konštrukcia – priamy (bass reflex), horna alebo slimák. */
  subDesign?: 'direct' | 'horn' | 'snail'
  /** Váha jedného kusu (kg). */
  weightKg?: number
  /** Nákupná cena jedného kusu (€) a za koľko rokov sa odpíše do nuly. */
  purchasePrice?: number
  depreciationYears?: number
  /** Prefix siete pri IP adrese, napr. 24 (= maska 255.255.255.0). */
  ipPrefix?: number
  /** IP prideľuje DHCP (nemá pevnú adresu). */
  ipDhcp?: boolean
  /** Vonkajšie rozmery boxu (reprobox, sub, odposluch) v cm – napr. pre delay kalkulačku subov. */
  boxWidthCm?: number
  boxDepthCm?: number
  boxHeightCm?: number
  /** Vlastné oneskorenie subu v ms (hornový sub / „slimák“ má zvuk dlhšiu cestu) – pre delay kalkulačku. */
  subDelayMs?: number
  /** DMX módy svetla: názov a počet kanálov, napr. Standard 16 ch. */
  dmxModes?: DmxMode[]
  /** LED panel (pre LED kalkulačku): rozmer, pixely, váha a príkon jedného panela. */
  ledPanel?: LedPanelSpec
  /** LED procesor (napr. Novastar): výstupy, pixely na výstup, vstupy a ich rozlíšenie. */
  ledProcessor?: LedProcessorSpec
  /** Obrazovka: TV, monitor alebo projektor s rozlíšením a uhlopriečkou (palce) / svetelným výkonom. */
  display?: DisplaySpec
}

export const DISPLAY_TYPES = ['tv', 'monitor', 'projector'] as const
export type DisplayType = (typeof DISPLAY_TYPES)[number]
export const DISPLAY_TYPE_LABELS: Record<DisplayType, string> = { tv: 'TV', monitor: 'Monitor', projector: 'Projektor' }
export type DisplaySpec = { type: DisplayType; resW?: number; resH?: number; diagonalIn?: number; lumens?: number }

export const PROCESSOR_CONTROLS = ['usb_ethernet', 'usb', 'ethernet'] as const
export type ProcessorControl = (typeof PROCESSOR_CONTROLS)[number]
export const PROCESSOR_CONTROL_LABELS: Record<ProcessorControl, string> = { usb_ethernet: 'USB aj Ethernet', usb: 'len USB', ethernet: 'len Ethernet' }
/** Typy vstupov procesora; počet kusov každého. */
export const PROCESSOR_INPUTS = ['hdmi', 'dvi', 'sdi', 'dp', 'vga'] as const
export type ProcessorInput = (typeof PROCESSOR_INPUTS)[number]
export const PROCESSOR_INPUT_LABELS: Record<ProcessorInput, string> = { hdmi: 'HDMI', dvi: 'DVI', sdi: 'SDI', dp: 'DisplayPort', vga: 'VGA' }

export type LedProcessorSpec = {
  outputs: number
  pixelsPerOutput: number
  /** Vstupov spolu (súčet podľa typov). */
  inputs: number
  inputW: number
  inputH: number
  chip?: string
  control?: ProcessorControl
  inputTypes?: Partial<Record<ProcessorInput, number>>
}

export type LedPanelSpec = { widthMm: number; heightMm: number; pxW: number; pxH: number; weightKg: number; maxW: number; avgW: number; pitchMm?: number }

export type DmxMode = { name: string; channels: number }

/** Odkaz pri technike: návod, fixtúra (GDTF / Capture), firmvér… */
export const LINK_TAGS = ['manual', 'fixture', 'firmware', 'datasheet', 'video', 'other'] as const
export type LinkTag = (typeof LINK_TAGS)[number]
export const LINK_TAG_LABELS: Record<LinkTag, string> = {
  manual: 'Návod',
  fixture: 'Fixtúra',
  firmware: 'Firmvér / softvér',
  datasheet: 'Datasheet',
  video: 'Video',
  other: 'Iné',
}
export type EquipmentLink = { title: string; url: string; tag: LinkTag }

/** Sedí svetlo s fixtúrou v Capture? */
export const CAPTURE_MATCHES = ['yes', 'partial', 'no'] as const
export type CaptureMatch = (typeof CAPTURE_MATCHES)[number]
export const CAPTURE_MATCH_LABELS: Record<CaptureMatch, string> = { yes: 'Áno', partial: 'Čiastočne', no: 'Nie' }

export type LabelRole = 'main' | 'secondary'

export type Lookup = { id: string; name: string; consumable?: boolean; color?: CategoryColor | null }

export type Equipment = {
  id: string
  name: string
  kind: EquipmentKind
  attributes: EquipmentAttributes
  categoryId: string | null
  locationId: string | null
  caseId: string | null
  /** Rola na flight case štítku: jeden hlavný prvok case (s fotkou) a vedľajšie prvky. */
  labelRole: LabelRole | null
  /** Pri tomto počte kusov (a menej) sa položka objaví v zozname „treba kúpiť“. */
  minQuantity: number | null
  quantity: number
  /** Každý kus má číslo (#1..počet) a vlastnú históriu; inak sa technika ráta len na počet. */
  trackUnits: boolean
  /** Vlastné čísla kusov (napr. 1, 4, 8); prázdne = kusy 1..počet. */
  unitIds: number[]
  /** Cena prenájmu za kus a deň; bez nej sa do kalkulácie výpožičky nepočíta. */
  rentalPrice: number | null
  manufacturer: string
  model: string
  serialNumber: string
  inventoryNumber: string
  macAddress: string
  ipAddress: string
  serviceIntervalMonths: number | null
  lastServiceOn: string | null
  /** Ako často treba odčítať počítadlo prevádzkových hodín zariadenia. */
  hoursIntervalMonths: number | null
  /** Posledný odčítaný stav počítadla a kedy sa odčítal. */
  operatingHours: number | null
  hoursReadOn: string | null
  /** Cesta fotky v Storage; prázdna = bez fotky. */
  photoPath: string
  status: EquipmentStatus
  note: string
  updatedAt: string
  /** Karta zamestnanca, ktorému technika patrí (jeho vlastná); prázdne = firma. */
  ownerStaffId?: string | null
  /** Dátum nákupu celej položky a po kusoch (číslo kusu → dátum); 0060. */
  purchasedOn?: string | null
  unitPurchases?: Record<string, string>
  /** Údaje po kusoch: číslo kusu → sériové a inventárne číslo (0078). */
  unitInfo?: Record<string, UnitInfo>
  links?: EquipmentLink[]
  /** Pri svetle: kópia čoho je (napr. Robe Spiider) a či sedí s fixtúrou v Capture. */
  cloneOf?: string
  captureMatch?: CaptureMatch | ''
  captureNote?: string
}

const text = (max: number) => z.string().trim().max(max, `Najviac ${max} znakov`)
const optionalNumber = (max: number) => z.number('Zadajte číslo').positive('Musí byť viac ako 0').max(max).optional()

/** Pre register(): prázdne pole = nevyplnené, inak číslo. */
export const asOptionalNumber = {
  setValueAs: (value: unknown) => (value === '' || value == null ? undefined : Number(value)),
}

const MAC = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/

/** „00-1a-2b-3c-4d-5e“ aj „001a2b3c4d5e“ → „00:1A:2B:3C:4D:5E“. Iný vstup vráti len orezaný a veľkými písmenami. */
export function normalizeMac(value: string) {
  const hex = value.trim().toUpperCase().replace(/[-:.\s]/g, '')
  if (!/^[0-9A-F]{12}$/.test(hex)) return value.trim().toUpperCase()
  return hex.match(/.{2}/g)!.join(':')
}

export function isValidIp(value: string) {
  const parts = value.split('.')
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}

// Limity zodpovedajú check constraints v migráciách 0002 a 0007.
export const equipmentSchema = z.object({
  name: text(120).min(1, 'Zadajte názov'),
  kind: z.enum(EQUIPMENT_KINDS),
  category: text(80),
  location: text(80),
  caseId: z.string(),
  manufacturer: text(80),
  model: text(80),
  serialNumber: text(80),
  inventoryNumber: text(40),
  quantity: z.number('Zadajte počet kusov').int('Zadajte celé číslo').min(0, 'Počet nemôže byť záporný').max(100000),
  minQuantity: z.number('Zadajte číslo').int('Zadajte celé číslo').min(0, 'Nemôže byť záporné').max(100000).optional(),
  trackUnits: z.boolean(),
  /** Čísla kusov oddelené čiarkou alebo medzerou; prázdne = 1..počet. */
  unitIds: z
    .string()
    .trim()
    .max(2000, 'Príliš veľa čísel')
    .regex(/^[\d\s,;]*$/, 'Len čísla oddelené čiarkou')
    .refine((text) => parseUnitIds(text).every((id) => id >= 1 && id <= 100000), 'Čísla od 1 do 100000'),
  rentalPrice: z.number('Zadajte číslo').min(0, 'Nemôže byť záporné').max(1_000_000).optional(),
  status: z.enum(EQUIPMENT_STATUSES),
  connector: text(60),
  lengthM: optionalNumber(1000),
  powerW: optionalNumber(100000),
  lightSource: z.enum([...LIGHT_SOURCES, '']),
  lightType: z.enum([...(LIGHT_TYPES as LightType[]), '']).optional(),
  trackHours: z.boolean().optional(),
  noCase: z.boolean().optional(),
  hoursPriority: z.enum(['none', 'low', 'normal', 'high', '']).optional(),
  lampChangedOn: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Zadajte dátum').optional(),
  lampChangedHours: z.number('Zadajte číslo').min(0).max(1_000_000).optional(),
  trussType: z.enum([...TRUSS_TYPES, '']).optional(),
  trussShape: z.enum([...TRUSS_SHAPES, '']).optional(),
  stageType: z.enum([...STAGE_TYPES, '']).optional(),
  stageBrand: text(60).optional(),
  stageSize: text(40).optional(),
  audioType: z.enum([...AUDIO_TYPES, '']),
  djType: z.enum([...DJ_TYPES, '']).optional(),
  videoType: z.enum([...VIDEO_TYPES, '']).optional(),
  cameraSensor: z.enum([...CAMERA_SENSORS, '']).optional(),
  hdmiOut: z.boolean().optional(),
  itType: z.enum([...IT_TYPES, '']).optional(),
  applianceType: z.enum([...APPLIANCE_TYPES, '']).optional(),
  madeYear: z.number('Zadajte rok').int('Celý rok').min(1950, 'Od 1950').max(2100).optional(),
  madeIn: text(60).optional(),
  ampW2: optionalNumber(100000),
  ampW4: optionalNumber(100000),
  ampW8: optionalNumber(100000),
  ampBridge4: optionalNumber(100000),
  ampBridge8: optionalNumber(100000),
  ampKind: z.enum(['analog', 'digital', '']).optional(),
  ampPresetSlots: z.number('Zadajte počet').int('Celé číslo').min(1).max(999).optional(),
  ampPresets: z
    .array(z.object({ slot: z.number().int().min(1).max(999).catch(1), name: z.string().trim().max(80).catch(''), speakerId: z.string().catch(''), note: z.string().trim().max(200).catch(''), locked: z.boolean().catch(false) }))
    .max(999)
    .optional(),
  unitInfo: z.array(z.object({ unit: z.number(), serial: text(80), inv: text(40), from: text(120).optional() })).optional(),
  color: text(40).optional(),
  condition: z.enum(['new', 'excellent', 'good', 'worn', 'damaged', '']).optional(),
  mixerKind: z.enum(['analog', 'digital', '']).optional(),
  mixerChannels: optionalNumber(512),
  mixerCard: text(80).optional(),
  micKind: z.enum(['wired', 'wireless', '']).optional(),
  cableType: z.enum(['cable', 'adapter', 'di', '']).optional(),
  rfRange: text(60).optional(),
  micType: z.enum(['dynamic', 'condenser', '']).optional(),
  capsuleIds: z.array(z.string()).max(30).optional(),
  powered: z.enum(['active', 'passive', '']).optional(),
  rmsW: optionalNumber(100000),
  peakW: optionalNumber(200000),
  woofer: text(40).optional(),
  maxSplDb: optionalNumber(200),
  connectors: text(80).optional(),
  poleMount: z.boolean().optional(),
  subDesign: z.enum(['direct', 'horn', 'snail', '']).optional(),
  programW: optionalNumber(200000),
  maxSplPeakDb: optionalNumber(200),
  sensitivityDb: optionalNumber(200),
  impedanceOhm: optionalNumber(1000),
  freqRange: text(40).optional(),
  freqResponse: text(40).optional(),
  coverage: text(40).optional(),
  crossover: text(40).optional(),
  biamp: z.boolean().optional(),
  hfDriver: text(80).optional(),
  weightKg: optionalNumber(10000),
  purchasePrice: z.number('Zadajte číslo').min(0, 'Nemôže byť záporné').max(10_000_000).optional(),
  depreciationYears: z.number('Zadajte číslo').int('Celé číslo').min(1, 'Aspoň 1 rok').max(50, 'Najviac 50 rokov').optional(),
  ipPrefix: z.number('Zadajte číslo').int('Celé číslo').min(1, 'Od 1').max(32, 'Najviac 32').optional(),
  ipDhcp: z.boolean().optional(),
  boxWidthCm: optionalNumber(1000),
  boxDepthCm: optionalNumber(1000),
  boxHeightCm: optionalNumber(1000),
  subDelayMs: z.number('Zadajte číslo').min(0, 'Nemôže byť záporné').max(200, 'Najviac 200 ms').optional(),
  makers: z.array(z.object({ name: z.string().trim().max(80).catch(''), count: z.number().int().min(0).max(100000).catch(0) })).max(10).optional(),
  dmxModes: z
    .array(
      z.object({
        name: text(40).min(1, 'Zadajte názov módu'),
        channels: z.number('Zadajte počet kanálov').int('Celé číslo').min(1, 'Aspoň 1 kanál').max(512, 'Najviac 512 kanálov'),
      }),
    )
    .max(20, 'Najviac 20 módov'),
  macAddress: z
    .string()
    .trim()
    .refine((value) => value === '' || MAC.test(normalizeMac(value)), 'MAC adresa má tvar 00:1A:2B:3C:4D:5E'),
  ipAddress: z
    .string()
    .trim()
    .refine((value) => value === '' || isValidIp(value), 'IP adresa má tvar 192.168.1.10'),
  serviceIntervalMonths: z.number('Zadajte číslo').int('Celé mesiace').min(1, 'Aspoň 1 mesiac').max(120).optional(),
  lastServiceOn: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Zadajte dátum'),
  hoursIntervalMonths: z.number('Zadajte číslo').int('Celé mesiace').min(1, 'Aspoň 1 mesiac').max(120).optional(),
  note: text(2000),
  /** Vlastník: prázdne = firma, id karty zamestnanca, alebo „m-<id člena>“ pre člena bez karty. */
  owner: z.string().optional(),
  purchasedOn: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Zadajte dátum').optional(),
  /** Dátum nákupu po kusoch; prázdny dátum = ako celá položka. */
  unitPurchases: z.array(z.object({ unit: z.number(), date: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Zadajte dátum') })).optional(),
  links: z
    .array(
      z.object({
        title: text(120),
        url: z.string().trim().max(1000, 'Príliš dlhý odkaz').regex(/^https?:\/\/\S+$/i, 'Odkaz začína https://'),
        tag: z.enum(LINK_TAGS),
      }),
    )
    .max(30, 'Najviac 30 odkazov')
    .optional(),
  cloneOf: text(120).optional(),
  captureMatch: z.enum([...CAPTURE_MATCHES, '']).optional(),
  captureNote: text(500).optional(),
  isLedPanel: z.boolean().optional(),
  ledPitchMm: optionalNumber(100),
  ledWidthMm: optionalNumber(5000),
  ledHeightMm: optionalNumber(5000),
  ledPxW: optionalNumber(10000),
  ledPxH: optionalNumber(10000),
  ledWeightKg: optionalNumber(1000),
  ledMaxW: optionalNumber(10000),
  ledAvgW: optionalNumber(10000),
  isDisplay: z.boolean().optional(),
  displayType: z.enum(['tv', 'monitor', 'projector']).optional(),
  displayResW: optionalNumber(20000),
  displayResH: optionalNumber(20000),
  displayDiagonalIn: optionalNumber(1000),
  displayLumens: optionalNumber(100000),
  isLedProcessor: z.boolean().optional(),
  procOutputs: optionalNumber(64),
  procPixels: optionalNumber(10_000_000),
  procInputs: optionalNumber(32),
  procChip: text(60).optional(),
  procControl: z.enum(['usb_ethernet', 'usb', 'ethernet', '']).optional(),
  procHdmi: z.number().int().min(0).max(32).optional(),
  procDvi: z.number().int().min(0).max(32).optional(),
  procSdi: z.number().int().min(0).max(32).optional(),
  procDp: z.number().int().min(0).max(32).optional(),
  procVga: z.number().int().min(0).max(32).optional(),
  procInputW: optionalNumber(16000),
  procInputH: optionalNumber(16000),
})

export type EquipmentFormValues = z.infer<typeof equipmentSchema>

/** Káble a spotrebný materiál nemajú sériové číslo, sieť ani servis — formulár sa na to nepýta. */
export function isSimpleKind(kind: EquipmentKind, category = '') {
  if (kind === 'cable' || kind === 'consumable') return true
  // Pri „Ostatné“ rozhodne kategória (napr. „Káble“, „Spotrebný materiál“).
  return kind === 'general' && /k[aá]bel|k[aá]bl|cable|spotreb|consum/.test(plainText(category))
}

const plainText = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/** Zásoba klesla na nastavenú hranicu: treba dokúpiť. */
export function needsRestock(item: Pick<Equipment, 'quantity' | 'minQuantity'>) {
  return item.minQuantity !== null && item.quantity <= item.minQuantity
}

/**
 * Je to svetlo? Podľa druhu, alebo podľa kategórie, ktorej názov hovorí o svetlách
 * („Svetlá“, „Svetlo – hlavy“, „Light“). Vtedy sa formulár pýta aj na zdroj a DMX módy.
 */
export function isLighting(kind: EquipmentKind, category: string) {
  // Druh rozhoduje vždy; kategória len pri „Ostatné“, aby sa napr. repro v kategórii „Svetlá a zvuk“ nepýtalo na DMX.
  return kind === 'light' || (kind === 'general' && /svetl|light/.test(plainText(category)))
}

/** Je to zvuk? Podľa druhu, alebo podľa kategórie („Zvuk“, „Audio“, „Sound“). */
export function isAudio(kind: EquipmentKind, category: string) {
  return kind === 'audio' || (kind === 'general' && /zvuk|audio|sound/.test(plainText(category)))
}

/** Reprobox, sub a odposluch majú rozmery boxu. */
export function hasBox(audioType: AudioType | '' | undefined) {
  return audioType === 'line_array' || audioType === 'speaker' || audioType === 'subwoofer' || audioType === 'monitor'
}

/** Z formulára vyberie iba údaje, ktoré k zvolenému druhu patria. */
export function attributesFor(
  values: Pick<EquipmentFormValues, 'kind' | 'connector' | 'lengthM' | 'powerW' | 'lightSource'> &
    Partial<
      Pick<
        EquipmentFormValues,
        | 'category'
        | 'lightType'
        | 'trackHours'
        | 'noCase'
        | 'caseId'
        | 'hoursPriority'
        | 'lampChangedOn'
        | 'lampChangedHours'
        | 'trussType'
        | 'trussShape'
        | 'stageType'
        | 'stageBrand'
        | 'stageSize'
        | 'dmxModes'
        | 'makers'
        | 'audioType'
        | 'djType'
        | 'videoType'
        | 'cameraSensor'
        | 'hdmiOut'
        | 'itType'
        | 'applianceType'
        | 'madeYear'
        | 'madeIn'
        | 'ampW2'
        | 'ampW4'
        | 'ampW8'
        | 'ampBridge4'
        | 'ampBridge8'
        | 'ampKind'
        | 'ampPresetSlots'
        | 'ampPresets'
        | 'color'
        | 'condition'
        | 'mixerKind'
        | 'mixerChannels'
        | 'mixerCard'
        | 'micKind'
        | 'cableType'
        | 'rfRange'
        | 'micType'
        | 'capsuleIds'
        | 'powered'
        | 'rmsW'
        | 'peakW'
        | 'woofer'
        | 'maxSplDb'
        | 'connectors'
        | 'poleMount'
        | 'subDesign'
        | 'programW'
        | 'maxSplPeakDb'
        | 'sensitivityDb'
        | 'impedanceOhm'
        | 'freqRange'
        | 'freqResponse'
        | 'coverage'
        | 'crossover'
        | 'biamp'
        | 'hfDriver'
        | 'weightKg'
        | 'purchasePrice'
        | 'depreciationYears'
        | 'boxWidthCm'
        | 'boxDepthCm'
        | 'boxHeightCm'
        | 'subDelayMs'
        | 'ipPrefix'
        | 'ipAddress'
        | 'ipDhcp'
        | 'isLedPanel'
        | 'ledPitchMm'
        | 'ledWidthMm'
        | 'ledHeightMm'
        | 'ledPxW'
        | 'ledPxH'
        | 'ledWeightKg'
        | 'ledMaxW'
        | 'ledAvgW'
        | 'isLedProcessor'
        | 'isDisplay'
        | 'displayType'
        | 'displayResW'
        | 'displayResH'
        | 'displayDiagonalIn'
        | 'displayLumens'
        | 'procOutputs'
        | 'procPixels'
        | 'procInputs'
        | 'procChip'
        | 'procControl'
        | 'procHdmi'
        | 'procDvi'
        | 'procSdi'
        | 'procDp'
        | 'procVga'
        | 'procInputW'
        | 'procInputH'
      >
    >,
) {
  const attributes: EquipmentAttributes = {}
  if (values.noCase && !values.caseId) attributes.noCase = true
  const lighting = isLighting(values.kind, values.category ?? '')
  const audio = isAudio(values.kind, values.category ?? '')
  if (values.kind === 'cable') {
    if (values.cableType === 'di' || values.cableType === 'adapter') attributes.cableType = values.cableType
    if (values.cableType === 'di' && values.powered) attributes.powered = values.powered
    if (values.connector) attributes.connector = values.connector
    if (values.lengthM !== undefined) attributes.lengthM = values.lengthM
  }
  // Truss sa delí podľa dĺžky dielu (0,5 / 1 / 2 / 3 m).
  if (values.kind === 'truss' && values.trussType) attributes.trussType = values.trussType
  if (values.kind === 'truss' && values.trussType?.startsWith('point') && values.trussShape) attributes.trussShape = values.trussShape
  if (values.kind === 'stage' && values.stageType) attributes.stageType = values.stageType
  if (values.kind === 'stage' && values.stageType === 'deck') {
    if (values.stageBrand?.trim()) attributes.stageBrand = values.stageBrand.trim()
    if (values.stageSize?.trim()) attributes.stageSize = values.stageSize.trim()
  }
  if (values.kind === 'truss' && isTrussSection(values.trussType) && values.lengthM !== undefined) attributes.lengthM = values.lengthM
  if (lighting || audio) {
    if (values.powerW !== undefined) attributes.powerW = values.powerW
  }
  const accessory = Boolean(values.lightType?.startsWith('acc_'))
  if (lighting && values.lightType) attributes.lightType = values.lightType
  if (lighting && values.lightSource && !accessory) attributes.lightSource = values.lightSource
  if (lighting && (values.lightSource === 'discharge' || values.lightSource === 'halogen') && !accessory) {
    if (values.lampChangedOn) attributes.lampChangedOn = values.lampChangedOn
    if (values.lampChangedHours !== undefined) attributes.lampChangedHours = values.lampChangedHours
  }
  if (values.trackHours && !isSimpleKind(values.kind, values.category ?? '')) {
    attributes.trackHours = true
    if (values.hoursPriority) attributes.hoursPriority = values.hoursPriority
  }
  if (audio && values.audioType) attributes.audioType = values.audioType
  if (audio && (values.audioType === 'wireless' || values.audioType === 'iem') && values.rfRange?.trim()) attributes.rfRange = values.rfRange.trim()
  if (audio && values.audioType === 'stagebox' && values.mixerCard?.trim()) attributes.mixerCard = values.mixerCard.trim()
  if (audio && values.audioType === 'mixer') {
    if (values.mixerKind) attributes.mixerKind = values.mixerKind
    if (values.mixerChannels !== undefined) attributes.mixerChannels = values.mixerChannels
    if (values.mixerKind === 'digital' && values.mixerCard?.trim()) attributes.mixerCard = values.mixerCard.trim()
  }
  if (audio && values.audioType === 'microphone') {
    if (values.micKind) attributes.micKind = values.micKind
    if (values.micType) attributes.micType = values.micType
  }
  const wireless = audio && (values.audioType === 'wireless' || (values.audioType === 'microphone' && values.micKind === 'wireless'))
  if (wireless && values.capsuleIds?.length) attributes.capsuleIds = values.capsuleIds
  if (values.kind === 'dj' && values.djType) attributes.djType = values.djType
  if (values.kind === 'video' && values.videoType && !values.isLedPanel && !values.isLedProcessor && !values.isDisplay) attributes.videoType = values.videoType
  if (attributes.videoType === 'camera') {
    if (values.cameraSensor) attributes.cameraSensor = values.cameraSensor
    if (values.hdmiOut) attributes.hdmiOut = true
  }
  if (values.kind === 'it' && values.itType) attributes.itType = values.itType
  if (values.kind === 'appliance' && values.applianceType) attributes.applianceType = values.applianceType
  if (values.kind === 'appliance' && values.powerW !== undefined) attributes.powerW = values.powerW
  if (values.kind === 'dj') {
    if (values.madeYear !== undefined) attributes.madeYear = values.madeYear
    if (values.madeIn?.trim()) attributes.madeIn = values.madeIn.trim()
    if (values.color?.trim()) attributes.color = values.color.trim()
    if (values.condition) attributes.condition = values.condition
  }
  if (values.kind === 'dj' && values.powerW !== undefined) attributes.powerW = values.powerW
  if (audio && values.audioType === 'amplifier') {
    for (const key of ['ampW2', 'ampW4', 'ampW8', 'ampBridge4', 'ampBridge8'] as const) if (values[key] !== undefined) attributes[key] = values[key]
    if (values.madeIn?.trim()) attributes.madeIn = values.madeIn.trim()
    if (values.ampKind) attributes.ampKind = values.ampKind
    if (values.ampKind === 'digital') {
      if (values.ampPresetSlots !== undefined) attributes.ampPresetSlots = values.ampPresetSlots
      const presets = (values.ampPresets ?? [])
        .filter((preset) => preset.name.trim() || preset.speakerId || preset.locked)
        .map((preset) => ({ slot: preset.slot, name: preset.name.trim(), ...(preset.speakerId && { speakerId: preset.speakerId }), ...(preset.note.trim() && { note: preset.note.trim() }), ...(preset.locked && { locked: true }) }))
        .sort((a, b) => a.slot - b.slot)
      if (presets.length > 0) attributes.ampPresets = presets
    }
  }
  if (!isSimpleKind(values.kind, values.category ?? '') && values.ipAddress && values.ipPrefix !== undefined) attributes.ipPrefix = values.ipPrefix
  if (!isSimpleKind(values.kind, values.category ?? '') && values.ipDhcp && !values.ipAddress) attributes.ipDhcp = true
  if (values.weightKg !== undefined) attributes.weightKg = values.weightKg
  if (values.purchasePrice !== undefined) attributes.purchasePrice = values.purchasePrice
  if (values.purchasePrice !== undefined && values.depreciationYears !== undefined) attributes.depreciationYears = values.depreciationYears
  if (audio && hasBox(values.audioType)) {
    if (values.powered) attributes.powered = values.powered
    if (values.rmsW !== undefined) attributes.rmsW = values.rmsW
    if (values.peakW !== undefined) attributes.peakW = values.peakW
    if (values.woofer?.trim()) attributes.woofer = values.woofer.trim()
    if (values.maxSplDb !== undefined) attributes.maxSplDb = values.maxSplDb
    if (values.connectors?.trim()) attributes.connectors = values.connectors.trim()
    if (values.poleMount) attributes.poleMount = true
    const numbers = ['programW', 'maxSplPeakDb', 'sensitivityDb', 'impedanceOhm'] as const
    for (const key of numbers) if (values[key] !== undefined) attributes[key] = values[key]
    const texts = ['freqRange', 'freqResponse', 'coverage', 'crossover', 'hfDriver'] as const
    for (const key of texts) if (values[key]?.trim()) attributes[key] = values[key]!.trim()
    if (values.biamp) attributes.biamp = true
    if (values.audioType === 'subwoofer' && values.subDesign) attributes.subDesign = values.subDesign
    if (values.boxWidthCm !== undefined) attributes.boxWidthCm = values.boxWidthCm
    if (values.boxDepthCm !== undefined) attributes.boxDepthCm = values.boxDepthCm
    if (values.boxHeightCm !== undefined) attributes.boxHeightCm = values.boxHeightCm
    if (values.audioType === 'subwoofer' && values.subDelayMs !== undefined) attributes.subDelayMs = values.subDelayMs
  }
  if (lighting && values.dmxModes?.length) attributes.dmxModes = values.dmxModes.map((mode) => ({ name: mode.name.trim(), channels: mode.channels }))
  if (values.kind === 'cable') {
    const makers = (values.makers ?? []).filter((maker) => maker.name.trim() && maker.count > 0).map((maker) => ({ name: maker.name.trim(), count: maker.count }))
    if (makers.length > 0) attributes.makers = makers
  }
  // Pixely sa dajú zadať priamo, alebo sa dopočítajú z rozmeru a pixel pitchu (500 mm / P3.9 = 128 px).
  const pitch = values.ledPitchMm
  const pxW = values.ledPxW ?? (pitch && values.ledWidthMm ? Math.round(values.ledWidthMm / pitch) : undefined)
  const pxH = values.ledPxH ?? (pitch && values.ledHeightMm ? Math.round(values.ledHeightMm / pitch) : undefined)
  if (values.isLedPanel && values.ledWidthMm && values.ledHeightMm && pxW && pxH) {
    attributes.ledPanel = {
      widthMm: values.ledWidthMm,
      heightMm: values.ledHeightMm,
      pxW,
      pxH,
      ...(pitch ? { pitchMm: pitch } : {}),
      weightKg: values.ledWeightKg ?? 0,
      maxW: values.ledMaxW ?? 0,
      avgW: values.ledAvgW ?? 0,
    }
  }
  if (values.isDisplay) {
    const type = values.displayType ?? 'tv'
    attributes.display = {
      type,
      ...(values.displayResW && values.displayResH ? { resW: values.displayResW, resH: values.displayResH } : {}),
      ...(values.displayDiagonalIn ? { diagonalIn: values.displayDiagonalIn } : {}),
      ...(type === 'projector' && values.displayLumens ? { lumens: values.displayLumens } : {}),
    }
  }
  if (values.isLedProcessor && values.procOutputs) {
    const counts: [ProcessorInput, number | undefined][] = [
      ['hdmi', values.procHdmi],
      ['dvi', values.procDvi],
      ['sdi', values.procSdi],
      ['dp', values.procDp],
      ['vga', values.procVga],
    ]
    const inputTypes = Object.fromEntries(counts.filter(([, count]) => count)) as Partial<Record<ProcessorInput, number>>
    const typed = Object.values(inputTypes).reduce((sum, count) => sum + (count ?? 0), 0)
    attributes.ledProcessor = {
      outputs: values.procOutputs,
      pixelsPerOutput: values.procPixels ?? 650_000,
      inputs: typed || (values.procInputs ?? 1),
      inputW: values.procInputW ?? 1920,
      inputH: values.procInputH ?? 1080,
      ...(values.procChip?.trim() ? { chip: values.procChip.trim() } : {}),
      ...(values.procControl ? { control: values.procControl } : {}),
      ...(typed ? { inputTypes } : {}),
    }
  }
  return attributes
}

/** 1.5 → „1,5“ */
export function formatNumber(value: number) {
  return String(value).replace('.', ',')
}

/** „LED procesor 4-CH · Novastar · 2× HDMI, 1× DVI · 1920×1080 · len USB“ */
export function describeProcessor(spec: LedProcessorSpec) {
  const inputs = spec.inputTypes
    ? (Object.entries(spec.inputTypes) as [ProcessorInput, number][]).map(([type, count]) => `${count}× ${PROCESSOR_INPUT_LABELS[type]}`).join(', ')
    : `${spec.inputs}× vstup`
  return [`LED procesor ${spec.outputs}-CH`, spec.chip, inputs, `${spec.inputW}×${spec.inputH}`, spec.control && PROCESSOR_CONTROL_LABELS[spec.control]].filter(Boolean).join(' · ')
}

/** Krátky popis údajov druhu do zoznamu a detailu, napr. „XLR · 5 m“ alebo „200 W · LED“. */
export function describeAttributes(item: Pick<Equipment, 'attributes'>) {
  const a = item.attributes
  return [
    a.audioType && AUDIO_TYPE_LABELS[a.audioType],
    a.lightType && LIGHT_TYPE_LABELS[a.lightType],
    a.trussType && TRUSS_TYPE_LABELS[a.trussType],
    a.trussShape && TRUSS_SHAPE_LABELS[a.trussShape],
    a.stageType && STAGE_TYPE_LABELS[a.stageType],
    a.stageBrand,
    a.stageSize,
    a.djType && DJ_TYPE_LABELS[a.djType],
    a.videoType && VIDEO_TYPE_LABELS[a.videoType],
    a.cameraSensor && CAMERA_SENSOR_LABELS[a.cameraSensor],
    a.hdmiOut && 'HDMI out',
    a.itType && IT_TYPE_LABELS[a.itType],
    a.applianceType && APPLIANCE_TYPE_LABELS[a.applianceType],
    a.color,
    a.madeYear !== undefined && `${a.madeYear}${a.madeIn ? ` · ${a.madeIn}` : ''}`,
    a.madeYear === undefined && a.madeIn && `vyrobené: ${a.madeIn}`,
    ampPower(a),
    a.ampKind && (a.ampKind === 'digital' ? `digitálny${a.ampPresetSlots ? ` · presety ${(a.ampPresets ?? []).length}/${a.ampPresetSlots}` : ''}` : 'analógový'),
    a.makers?.length && `vyrobil ${a.makers.map((maker) => `${maker.name} ${maker.count}×`).join(', ')}`,
    a.condition && CONDITION_LABELS[a.condition].toLowerCase(),
    a.cableType === 'di' && 'DI box',
    a.cableType === 'adapter' && 'Redukcia',
    a.rfRange,
    a.mixerKind && (a.mixerKind === 'digital' ? 'digitálny' : 'analógový'),
    a.mixerChannels !== undefined && `${a.mixerChannels} ch`,
    a.mixerCard && `karta ${a.mixerCard}`,
    a.micKind && (a.micKind === 'wireless' ? 'bezdrôtový' : 'káblový'),
    a.micType && (a.micType === 'condenser' ? 'kondenzátorový' : 'dynamický'),
    a.powered && (a.powered === 'active' ? 'aktívny' : 'pasívny'),
    a.subDesign && SUB_DESIGN_LABELS[a.subDesign].toLowerCase(),
    a.woofer,
    a.rmsW !== undefined && `${formatNumber(a.rmsW)} W RMS`,
    a.maxSplDb !== undefined && `${formatNumber(a.maxSplDb)} dB SPL`,
    a.biamp && 'bi-amp',
    a.impedanceOhm !== undefined && `${formatNumber(a.impedanceOhm)} Ω`,
    a.weightKg !== undefined && `${formatNumber(a.weightKg)} kg`,
    a.connector,
    a.lengthM !== undefined && `${formatNumber(a.lengthM)} m`,
    a.lightSource && LIGHT_SOURCE_LABELS[a.lightSource],
    a.boxWidthCm !== undefined && a.boxDepthCm !== undefined && `${formatNumber(a.boxWidthCm)}×${formatNumber(a.boxDepthCm)}${a.boxHeightCm !== undefined ? `×${formatNumber(a.boxHeightCm)}` : ''} cm`,
    a.dmxModes?.length && `DMX ${a.dmxModes.map((mode) => mode.channels).join('/')} ch`,
    a.ledPanel && `LED${a.ledPanel.pitchMm ? ` P${formatNumber(a.ledPanel.pitchMm)}` : ''} ${a.ledPanel.widthMm}×${a.ledPanel.heightMm} mm, ${a.ledPanel.pxW}×${a.ledPanel.pxH} px`,
    a.display &&
      [DISPLAY_TYPE_LABELS[a.display.type], a.display.diagonalIn && `${formatNumber(a.display.diagonalIn)}″`, a.display.resW && `${a.display.resW}×${a.display.resH}`, a.display.lumens && `${a.display.lumens} lm`]
        .filter(Boolean)
        .join(' '),
    a.ledProcessor && describeProcessor(a.ledProcessor),
  ].filter(Boolean) as string[]
}

// ---------------------------------------------------------------------------
// Servis
// ---------------------------------------------------------------------------

function addMonths(isoDate: string, months: number) {
  const [year, month, day] = isoDate.split('-').map(Number)
  const target = new Date(Date.UTC(year, month - 1 + months, 1))
  // 31. 1. + 1 mesiac = posledný deň februára, nie začiatok marca.
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(day, lastDay))
  return target.toISOString().slice(0, 10)
}

export type ServiceState = { state: 'none' } | { state: 'unknown' } | { state: 'ok' | 'soon' | 'overdue'; dueOn: string }

const SOON_DAYS = 30

/** Stav servisu k dnešnému dňu: po termíne, do 30 dní, v poriadku, alebo interval bez zapísaného servisu. */
export function serviceState(item: Pick<Equipment, 'serviceIntervalMonths' | 'lastServiceOn'>, today: string): ServiceState {
  return intervalState(item.serviceIntervalMonths, item.lastServiceOn, today)
}

/**
 * Stav odčítania prevádzkových hodín. S úrovňou kontroly (Nastavenia → Úrovne kontroly) sa ráta v dňoch podľa nej,
 * inak podľa staršieho intervalu v mesiacoch.
 */
export function hoursState(item: Pick<Equipment, 'hoursIntervalMonths' | 'hoursReadOn'> & { attributes?: EquipmentAttributes }, today: string, days: CheckLevelDays = DEFAULT_CHECK_DAYS): ServiceState {
  const level = item.attributes?.hoursPriority
  if (item.attributes?.trackHours && level) {
    const limit = levelDays(level, days)
    if (limit === null) return { state: 'none' }
    if (!item.hoursReadOn) return { state: 'unknown' }
    const dueOn = new Date(Date.parse(item.hoursReadOn) + limit * 86_400_000).toISOString().slice(0, 10)
    if (dueOn < today) return { state: 'overdue', dueOn }
    const daysLeft = (Date.parse(dueOn) - Date.parse(today)) / 86_400_000
    return { state: daysLeft <= Math.min(SOON_DAYS, Math.ceil(limit / 3)) ? 'soon' : 'ok', dueOn }
  }
  return intervalState(item.hoursIntervalMonths, item.hoursReadOn, today)
}

/** Hodiny od poslednej výmeny výbojky / žiarovky (ak je zapísaný stav počítadla pri výmene). */
export function hoursSinceLamp(item: Pick<Equipment, 'operatingHours'> & { attributes: EquipmentAttributes }) {
  const at = item.attributes.lampChangedHours
  if (at === undefined || item.operatingHours === null) return null
  return Math.max(0, Math.round((item.operatingHours - at) * 10) / 10)
}

function intervalState(intervalMonths: number | null, lastOn: string | null, today: string): ServiceState {
  if (!intervalMonths) return { state: 'none' }
  if (!lastOn) return { state: 'unknown' }
  const dueOn = addMonths(lastOn, intervalMonths)
  if (dueOn < today) return { state: 'overdue', dueOn }
  const daysLeft = (Date.parse(dueOn) - Date.parse(today)) / 86_400_000
  return { state: daysLeft <= SOON_DAYS ? 'soon' : 'ok', dueOn }
}

// ---------------------------------------------------------------------------
// Filter zoznamu
// ---------------------------------------------------------------------------

export type EquipmentFilter = {
  search: string
  status: EquipmentStatus | ''
  categoryId: string
  locationId: string
  /** Prázdne = všetko, NO_CASE = technika mimo cases, inak id konkrétneho case. */
  caseId: string
  kind?: EquipmentKind | ''
  audioType?: AudioType | ''
  /** Prázdne = všetci, COMPANY_OWNER = firemná, inak id karty zamestnanca. */
  owner?: string
  manufacturer?: string
  /** Na čo upozorniť: servis po termíne / do 30 dní, dokúpiť, odčítať hodiny. */
  attention?: '' | 'service' | 'restock' | 'hours'
  /** Svetlá: sedí s Capture (yes/partial/no), alebo „unset“ = nevyplnené. */
  capture?: '' | CaptureMatch | 'unset'
  /** Rok nákupu (celá položka alebo niektorý kus). */
  purchasedYear?: string
  withNetwork?: boolean
  withLinks?: boolean
  sort?: EquipmentSort
  /** Prepojené firmy: prázdne = len naša technika, „all“ = aj všetkých prepojených, inak id firmy (len jej). */
  company?: string
}

export const COMPANY_OWNER = 'company'

export const EQUIPMENT_SORTS = ['name', 'newest', 'oldest', 'purchased', 'quantity'] as const
export type EquipmentSort = (typeof EQUIPMENT_SORTS)[number]
export const SORT_LABELS: Record<EquipmentSort, string> = {
  name: 'Podľa názvu',
  newest: 'Naposledy upravené',
  oldest: 'Najdlhšie neupravené',
  purchased: 'Podľa dátumu nákupu',
  quantity: 'Najviac kusov',
}

/** Počet zapnutých rozšírených filtrov (na odznak pri tlačidle). */
export function advancedFilterCount(filter: EquipmentFilter) {
  return [filter.company, filter.status, filter.categoryId, filter.locationId, filter.caseId, filter.kind, filter.audioType, filter.owner, filter.manufacturer, filter.attention, filter.capture, filter.purchasedYear, filter.withNetwork, filter.withLinks].filter(Boolean).length
}

/** Všetky dátumy nákupu techniky (celá položka aj kusy). */
export type UnitInfo = { serial?: string; inv?: string; /** Odkiaľ je kus kúpený (obchod, od koho). */ from?: string }

/** Výkon zosilňovača do jedného riadku: „2 Ω 1 800 W · 4 Ω 2 000 W · 8 Ω 1 250 W · bridge 4 Ω 3 600 W“. */
/** Preset v digitálnom zosilňovači: číslo, názov, reprobox, pre ktorý je, a či je výrobný (nedá sa prepísať). */
export type AmpPreset = { slot: number; name: string; speakerId?: string; note?: string; locked?: boolean }

/**
 * Návrh počtu presetov podľa modelu (verejne známe údaje výrobcu): Crown I-Tech HD 50 (č. 1 výrobný),
 * Crown I-Tech 20. Neznámy model → null.
 */
export function suggestPresetSlots(manufacturer: string, model: string): { slots: number; factorySlot?: number } | null {
  const text = `${manufacturer} ${model}`.toLowerCase()
  if (!/crown/.test(text) && !/i-?tech/.test(text)) return null
  // „I-Tech HD 12000“ aj „I-Tech 4x3500HD“.
  if (/i-?tech/.test(text) && /hd/.test(text)) return { slots: 50, factorySlot: 1 }
  if (/i-?tech/.test(text)) return { slots: 20 }
  return null
}

/** Presety zosilňovačov, ktoré patria k reproboxu (na detail reproboxu). */
export function presetsForSpeaker(speakerId: string, amps: Pick<Equipment, 'id' | 'name' | 'attributes'>[]) {
  return amps.flatMap((amp) => (amp.attributes.ampPresets ?? []).filter((preset) => preset.speakerId === speakerId).map((preset) => ({ ampId: amp.id, ampName: amp.name, ...preset })))
}

export function ampPower(a: Pick<EquipmentAttributes, 'ampW2' | 'ampW4' | 'ampW8' | 'ampBridge4' | 'ampBridge8'>) {
  const parts = [
    a.ampW2 !== undefined && `2 Ω ${formatNumber(a.ampW2)} W`,
    a.ampW4 !== undefined && `4 Ω ${formatNumber(a.ampW4)} W`,
    a.ampW8 !== undefined && `8 Ω ${formatNumber(a.ampW8)} W`,
    a.ampBridge4 !== undefined && `bridge 4 Ω ${formatNumber(a.ampBridge4)} W`,
    a.ampBridge8 !== undefined && `bridge 8 Ω ${formatNumber(a.ampBridge8)} W`,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : false
}

/** Údaje kusov z formulára do databázy: len kusy, ktoré existujú, a len vyplnené údaje. */
export function unitInfoFromForm(rows: { unit: number; serial: string; inv: string; from?: string }[], units: Set<number>): Record<string, UnitInfo> {
  const info: Record<string, UnitInfo> = {}
  for (const row of rows) {
    if (!units.has(row.unit)) continue
    const serial = row.serial.trim()
    const inv = row.inv.trim()
    const from = (row.from ?? '').trim()
    if (!serial && !inv && !from) continue
    info[String(row.unit)] = { ...(serial && { serial }), ...(inv && { inv }), ...(from && { from }) }
  }
  return info
}

export function purchaseDates(item: Pick<Equipment, 'purchasedOn' | 'unitPurchases'>) {
  return [item.purchasedOn, ...Object.values(item.unitPurchases ?? {})].filter((date): date is string => Boolean(date))
}

export const NO_CASE = 'none'

/** Bez diakritiky a veľkosti písmen, aby „mikrofon“ našlo „Mikrofón“. */
function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

export function filterEquipment(items: Equipment[], filter: EquipmentFilter, today = new Date().toISOString().slice(0, 10)) {
  const words = normalize(filter.search).split(/\s+/).filter(Boolean)
  const found = items.filter((item) => {
    if (filter.status && item.status !== filter.status) return false
    if (filter.kind && item.kind !== filter.kind) return false
    if (filter.audioType && item.attributes.audioType !== filter.audioType) return false
    if (filter.owner === COMPANY_OWNER ? item.ownerStaffId : filter.owner && item.ownerStaffId !== filter.owner) return false
    if (filter.manufacturer && normalize(item.manufacturer.trim()) !== normalize(filter.manufacturer.trim())) return false
    if (filter.attention === 'service' && !['overdue', 'soon'].includes(serviceState(item, today).state)) return false
    if (filter.attention === 'restock' && !needsRestock(item)) return false
    if (filter.attention === 'hours' && !['overdue', 'unknown'].includes(hoursState(item, today).state)) return false
    if (filter.capture === 'unset' ? item.kind !== 'light' || Boolean(item.captureMatch) : filter.capture && item.captureMatch !== filter.capture) return false
    if (filter.purchasedYear && !purchaseDates(item).some((date) => date.startsWith(filter.purchasedYear!))) return false
    if (filter.withNetwork && !item.ipAddress && !item.macAddress && !item.attributes.ipDhcp) return false
    if (filter.withLinks && !item.links?.length) return false
    if (filter.categoryId && item.categoryId !== filter.categoryId) return false
    if (filter.locationId && item.locationId !== filter.locationId) return false
    if (filter.caseId === NO_CASE ? item.caseId !== null : filter.caseId && item.caseId !== filter.caseId) return false
    if (words.length === 0) return true
    const haystack = normalize(
      [
        item.name,
        item.manufacturer,
        item.model,
        item.serialNumber,
        item.inventoryNumber,
        ...Object.values(item.unitInfo ?? {}).flatMap((info) => [info.serial ?? '', info.inv ?? '']),
        item.macAddress,
        item.ipAddress,
        item.attributes.connector,
        item.attributes.audioType && AUDIO_TYPE_LABELS[item.attributes.audioType],
        item.cloneOf,
      ].join(' '),
    )
    return words.every((word) => haystack.includes(word))
  })
  return sortEquipment(found, filter.sort ?? 'name')
}

export function sortEquipment(items: Equipment[], sort: EquipmentSort) {
  if (sort === 'name') return items
  const sorted = [...items]
  const firstPurchase = (item: Equipment) => purchaseDates(item).sort()[0] ?? '9999'
  if (sort === 'newest') sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  if (sort === 'oldest') sorted.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
  if (sort === 'purchased') sorted.sort((a, b) => firstPurchase(a).localeCompare(firstPurchase(b)))
  if (sort === 'quantity') sorted.sort((a, b) => b.quantity - a.quantity)
  return sorted
}

/** Technika, ktorá by mala byť v nejakom case, ale nie je. Vyradená a spotrebný materiál sa nerátajú. */
export function unpackedEquipment(items: Equipment[]) {
  return items.filter((item) => item.caseId === null && item.status !== 'retired' && item.kind !== 'consumable' && !item.attributes.noCase)
}

// ---------------------------------------------------------------------------
// Sada káblov: jeden typ vo viacerých dĺžkach naraz
// ---------------------------------------------------------------------------

export const cableSetSchema = z.object({
  namePrefix: text(100).min(1, 'Zadajte názov, napr. XLR kábel'),
  connector: text(60),
  category: text(80),
  location: text(80),
  rows: z
    .array(
      z.object({
        lengthM: z.number('Zadajte dĺžku').positive('Musí byť viac ako 0').max(1000),
        quantity: z.number('Zadajte počet').int('Celé číslo').min(1, 'Aspoň 1').max(100000),
      }),
    )
    .min(1, 'Pridajte aspoň jednu dĺžku')
    .superRefine((rows, ctx) => {
      rows.forEach((row, index) => {
        if (rows.findIndex((other) => other.lengthM === row.lengthM) !== index) {
          ctx.addIssue({ code: 'custom', path: [index, 'lengthM'], message: 'Táto dĺžka je tu dvakrát' })
        }
      })
    }),
})

export type CableSetValues = z.infer<typeof cableSetSchema>

export function cableName(namePrefix: string, lengthM: number) {
  return `${namePrefix} ${formatNumber(lengthM)} m`
}

/** „XLR kábel 5 m“ → „XLR kábel“ (dĺžka na konci názvu sa odstráni). */
export function cableBaseName(name: string) {
  return name.replace(/\s*\d+(?:[.,]\d+)?\s*m\s*$/i, '').trim() || name.trim()
}

/** Stav DJ techniky. */
export const CONDITIONS = ['new', 'excellent', 'good', 'worn', 'damaged'] as const
export type Condition = (typeof CONDITIONS)[number]
export const CONDITION_LABELS: Record<Condition, string> = { new: 'Nový', excellent: 'Výborný', good: 'Dobrý', worn: 'Opotrebovaný', damaged: 'Poškodený' }

/** Čísla kusov 1..count. */
export const unitRange = (count: number) => Array.from({ length: Math.max(count, 0) }, (_, index) => index + 1)

/** Platné čísla kusov techniky: vlastný zoznam, alebo 1..počet, ak ho nemá. */
export function unitIdsOf(item: Pick<Equipment, 'quantity' | 'unitIds'>) {
  return item.unitIds.length > 0 ? item.unitIds : unitRange(item.quantity)
}

/** „1, 4 8;4“ → [1, 4, 8]: bez duplicít, vzostupne. */
export function parseUnitIds(text: string) {
  const ids = text.split(/[\s,;]+/).filter(Boolean).map(Number).filter(Number.isInteger)
  return [...new Set(ids)].sort((a, b) => a - b)
}

/** „1-4, 7“ → [1, 2, 3, 4, 7] – čísla kusov aj s rozsahmi (najviac 500 kusov). */
export function parseUnitRanges(text: string) {
  const ids = new Set<number>()
  for (const part of text.split(/[\s,;]+/).filter(Boolean)) {
    const range = /^(\d+)\s*[-–]\s*(\d+)$/.exec(part)
    if (range) {
      const [from, to] = [Number(range[1]), Number(range[2])].sort((a, b) => a - b)
      for (let id = from; id <= to && ids.size < 500; id++) if (id > 0) ids.add(id)
    } else if (/^\d+$/.test(part) && Number(part) > 0) {
      ids.add(Number(part))
    }
  }
  return [...ids].sort((a, b) => a - b)
}

/** [1, 4, 8] → „#1, #4, #8“; súvislý rad skráti na „#1 – #16“. */
export function describeUnitIds(ids: number[]) {
  if (ids.length === 0) return ''
  const consecutive = ids.length > 2 && ids.every((id, index) => index === 0 || id === ids[index - 1] + 1)
  return consecutive ? `#${ids[0]} – #${ids[ids.length - 1]}` : ids.map((id) => `#${id}`).join(', ')
}

/** Metre káblov podľa konektora (kábel × dĺžka × kusy), od najviac; vyradené sa nerátajú. */
export function cableMeters(items: Pick<Equipment, 'kind' | 'attributes' | 'quantity' | 'status'>[]) {
  const totals = new Map<string, number>()
  for (const item of items) {
    if (item.kind !== 'cable' || item.status === 'retired' || item.attributes.cableType === 'adapter' || item.attributes.cableType === 'di') continue
    const length = item.attributes.lengthM ?? 0
    if (length <= 0) continue
    const key = item.attributes.connector?.trim() || 'Bez konektora'
    totals.set(key, (totals.get(key) ?? 0) + length * item.quantity)
  }
  return [...totals].map(([label, meters]) => ({ id: label, label, value: Math.round(meters * 10) / 10 })).sort((a, b) => b.value - a.value)
}

/** Kto spravil najviac káblov (súčet kusov podľa mena, bez ohľadu na veľké písmená). */
export function cableMakers(items: Pick<Equipment, 'kind' | 'attributes'>[], limit = 10) {
  const totals = new Map<string, { label: string; count: number }>()
  for (const item of items) {
    if (item.kind !== 'cable') continue
    for (const maker of item.attributes.makers ?? []) {
      const key = maker.name.trim().toLowerCase()
      if (!key) continue
      const current = totals.get(key) ?? { label: maker.name.trim(), count: 0 }
      current.count += maker.count
      totals.set(key, current)
    }
  }
  return [...totals]
    .map(([id, value]) => ({ id, label: value.label, value: value.count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}
