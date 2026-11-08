import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, ExternalLink, Pencil, Plus, ShieldCheck, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { bugKeys, fetchIsDeveloper } from '@/features/bugs/api'
import { plain } from '@/features/search/searchAll'
import { tf, tx } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { CATALOG_KEYS, CATALOG_KINDS, catalogKeys, catalogMissing, deleteCatalogEntry, fetchCatalogUsage, fetchFeedbackQueue, resolveCatalogFeedback, thomannUrl, updateCatalogEntry, useCatalog, verifyCatalogEntries, type CatalogEntry, type CatalogFeedback } from './catalog'
import {
  APPLIANCE_TYPE_LABELS,
  APPLIANCE_TYPES,
  AUDIO_TYPE_LABELS,
  AUDIO_TYPES,
  CAMERA_SENSOR_LABELS,
  CAMERA_SENSORS,
  describeAttributes,
  DJ_TYPE_LABELS,
  DJ_TYPES,
  IT_TYPE_LABELS,
  IT_TYPES,
  KIND_LABELS,
  LIGHT_SOURCE_LABELS,
  LIGHT_SOURCES,
  LIGHT_TYPE_LABELS,
  LIGHT_TYPES,
  STAGE_TYPE_LABELS,
  STAGE_TYPES,
  TRUSS_SHAPE_LABELS,
  TRUSS_SHAPES,
  TRUSS_TYPE_LABELS,
  TRUSS_TYPES,
  VIDEO_TYPE_LABELS,
  VIDEO_TYPES,
  type DmxMode,
  type EquipmentAttributes,
  type EquipmentKind,
  type LightType,
} from './model'

// Vývojár → Databáza techniky: filtre (druh, značka, overené, údaje), úprava modelu a jeho technických údajov,
// overovanie. Zápis robia len funkcie v databáze, ktoré pustia iba vývojára.

const input = 'h-9 w-full rounded-lg border bg-background px-2 text-sm'
const PAGE = 100

/** Názvy technických údajov (kľúče v databáze → čo vidí vývojár). */
const KEY_LABELS: Record<string, string> = {
  audioType: 'Typ zvuku', powered: 'Aktívny / pasívny (active / passive)', rmsW: 'Výkon RMS (W)', programW: 'Výkon program (W)', peakW: 'Výkon peak (W)',
  woofer: 'Woofer / meniče', hfDriver: 'HF driver', maxSplDb: 'Max SPL continuous (dB)', maxSplPeakDb: 'Max SPL peak (dB)', sensitivityDb: 'Citlivosť (dB)',
  impedanceOhm: 'Impedancia (Ω)', freqRange: 'Frekvenčný rozsah', freqResponse: 'Frekvenčná odozva', coverage: 'Vyžarovací uhol', crossover: 'Výhybka',
  biamp: 'Bi-amp', connectors: 'Konektory', poleMount: 'Hniezdo na stojan', subDesign: 'Konštrukcia subu (direct / horn / snail)', weightKg: 'Váha (kg)',
  boxWidthCm: 'Šírka (cm)', boxDepthCm: 'Hĺbka (cm)', boxHeightCm: 'Výška (cm)', ampKind: 'Zosilňovač (analog / digital)', ampPresetSlots: 'Počet presetov',
  ampW2: 'Výkon 2 Ω (W)', ampW4: 'Výkon 4 Ω (W)', ampW8: 'Výkon 8 Ω (W)', ampBridge4: 'Bridge 4 Ω (W)', ampBridge8: 'Bridge 8 Ω (W)', mixerKind: 'Mixpult (analog / digital)',
  mixerChannels: 'Počet kanálov', micKind: 'Mikrofón (wired / wireless)', micType: 'Typ mikrofónu (dynamic / condenser)', rfRange: 'Frekvenčné pásmo',
  wirelessRx: 'Prijímač', wirelessTxs: 'Vysielače (JSON)', lightType: 'Typ svetla', lightSource: 'Zdroj svetla', powerW: 'Príkon (W)', dmxModes: 'DMX módy (JSON)',
  dipSwitches: 'DIP prepínače', nodeProtocols: 'Protokoly nodu (JSON)', nodePorts: 'Porty nodu', trussType: 'Typ trussu', trussShape: 'Tvar trussu', lengthM: 'Dĺžka dielu (m)',
  stageType: 'Typ pódia (deck / accessory)', stageSize: 'Veľkosť', djType: 'Typ DJ techniky', videoType: 'Typ videa', cameraSensor: 'Snímač', hdmiOut: 'HDMI výstup',
  itType: 'Typ IT', applianceType: 'Typ spotrebiča', cableType: 'Typ kábla', connector: 'Konektor', cableVariant: 'Variant kábla',
  ledPanel: 'LED panel (JSON)', ledProcessor: 'LED procesor (JSON)', display: 'Displej (JSON)', thomannCode: 'Kód Thomann (číslo artiklu)', compatibleAmps: 'Zosilňovače (JSON: model, perOutput, total)',
}
const BOOLEAN_KEYS = new Set(['biamp', 'poleMount', 'hdmiOut'])
const JSON_KEYS = new Set(['dmxModes', 'wirelessTxs', 'nodeProtocols', 'ledPanel', 'ledProcessor', 'display', 'compatibleAmps'])
const isNumberKey = (key: string) => /(W|Db|Ohm|Kg|Cm|M|Slots|Channels|Ports|Switches|W2|W4|W8|Bridge4|Bridge8)$/.test(key) && !['powered', 'woofer'].includes(key)
const label = (key: string) => (KEY_LABELS[key] ? tx(KEY_LABELS[key]) : key)

/** Hodnoty na výber (namiesto písania): kľúč → [hodnota, popis]. */
const pairs = <T extends string>(values: readonly T[], labels: Record<T, string>) => values.map((value) => [value, labels[value]] as [string, string])
const SELECTS: Record<string, [string, string][]> = {
  audioType: pairs(AUDIO_TYPES, AUDIO_TYPE_LABELS),
  powered: [['active', 'Aktívny'], ['passive', 'Pasívny']],
  subDesign: [['direct', 'Priamy (bass reflex)'], ['horn', 'Horna'], ['snail', 'Slimák']],
  ampKind: [['analog', 'Analógový'], ['digital', 'Digitálny (DSP, presety)']],
  mixerKind: [['analog', 'Analógový'], ['digital', 'Digitálny']],
  micKind: [['wired', 'Káblový'], ['wireless', 'Bezdrôtový']],
  micType: [['dynamic', 'Dynamický'], ['condenser', 'Kondenzátorový']],
  lightType: pairs(LIGHT_TYPES as readonly LightType[], LIGHT_TYPE_LABELS),
  lightSource: pairs(LIGHT_SOURCES, LIGHT_SOURCE_LABELS),
  trussType: pairs(TRUSS_TYPES, TRUSS_TYPE_LABELS),
  trussShape: pairs(TRUSS_SHAPES, TRUSS_SHAPE_LABELS),
  stageType: pairs(STAGE_TYPES, STAGE_TYPE_LABELS),
  djType: pairs(DJ_TYPES, DJ_TYPE_LABELS),
  cableType: [['cable', 'Kábel'], ['adapter', 'Redukcia'], ['di', 'DI box']],
  videoType: pairs(VIDEO_TYPES, VIDEO_TYPE_LABELS),
  cameraSensor: pairs(CAMERA_SENSORS, CAMERA_SENSOR_LABELS),
  itType: pairs(IT_TYPES, IT_TYPE_LABELS),
  applianceType: pairs(APPLIANCE_TYPES, APPLIANCE_TYPE_LABELS),
}

const SPEAKER_FIELDS = ['powered', 'rmsW', 'programW', 'peakW', 'woofer', 'hfDriver', 'freqRange', 'freqResponse', 'maxSplDb', 'maxSplPeakDb', 'sensitivityDb', 'impedanceOhm', 'coverage', 'crossover', 'biamp', 'subDesign', 'poleMount', 'connectors', 'weightKg', 'boxWidthCm', 'boxDepthCm', 'boxHeightCm']

/** Údaje, ktoré sa pri úprave ukážu vždy (aj prázdne) – podľa druhu a typu. */
function fieldsFor(kind: EquipmentKind, values: Record<string, string>): string[] {
  const audio = values.audioType ?? ''
  const fields: Record<string, string[]> = {
    audio: ['audioType', ...(audio === 'amplifier'
      ? ['ampKind', 'ampW2', 'ampW4', 'ampW8', 'ampBridge4', 'ampBridge8', 'ampPresetSlots', 'connectors', 'weightKg']
      : audio === 'mixer'
        ? ['mixerKind', 'mixerChannels', 'connectors', 'weightKg']
        : audio === 'microphone'
          ? ['micKind', 'micType', 'freqRange', 'connectors']
          : audio === 'wireless' || audio === 'iem'
            ? ['rfRange', 'wirelessRx', 'connectors', 'weightKg']
            : SPEAKER_FIELDS)],
    light: ['lightType', 'lightSource', 'powerW', 'weightKg', 'dipSwitches'],
    truss: ['trussType', 'trussShape', 'lengthM', 'weightKg'],
    stage: ['stageType', 'stageSize', 'weightKg'],
    dj: ['djType', 'connectors', 'weightKg'],
    video: ['videoType', 'cameraSensor', 'hdmiOut', 'powerW', 'weightKg'],
    it: ['itType', 'weightKg'],
    appliance: ['applianceType', 'powerW', 'weightKg'],
    cable: ['cableType', 'connector', 'cableVariant', 'powered', 'lengthM', 'weightKg'],
    consumable: ['weightKg'],
    general: ['powerW', 'weightKg'],
  }
  return [...(fields[kind] ?? []), 'thomannCode']
}

type Mode = { name: string; channels: string; map: string }
type Draft = { kind: EquipmentKind; manufacturer: string; model: string; verified: boolean; values: Record<string, string>; modes: Mode[] }

const toText = (value: unknown) => (typeof value === 'object' && value !== null ? JSON.stringify(value, null, 1) : String(value ?? ''))

function toDraft(entry: CatalogEntry): Draft {
  const values: Record<string, string> = {}
  let modes: Mode[] = []
  for (const [key, value] of Object.entries(entry.attributes as Record<string, unknown>)) {
    if (key === 'dmxModes' && Array.isArray(value)) modes = value.map((mode: DmxMode) => ({ name: mode.name ?? '', channels: String(mode.channels ?? ''), map: mode.map ?? '' }))
    else values[key] = toText(value)
  }
  return { kind: entry.kind, manufacturer: entry.manufacturer, model: entry.model, verified: entry.verified, values, modes }
}

/** Formulár späť na údaje; chybný JSON, číslo alebo DMX mód vráti chybu s názvom poľa. */
function toAttributes(draft: Draft): { attributes?: EquipmentAttributes; error?: string } {
  const out: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(draft.values)) {
    const text = raw.trim()
    if (text === '') continue
    if (BOOLEAN_KEYS.has(key)) out[key] = text === 'true'
    else if (JSON_KEYS.has(key)) {
      try {
        out[key] = JSON.parse(text)
      } catch {
        return { error: tf('Pole „{0}“ nie je platný JSON.', label(key)) }
      }
    } else if (isNumberKey(key)) {
      const number = Number(text.replace(',', '.'))
      if (!Number.isFinite(number)) return { error: tf('Pole „{0}“ musí byť číslo.', label(key)) }
      out[key] = number
    } else out[key] = text
  }
  const modes: DmxMode[] = []
  for (const mode of draft.modes) {
    if (!mode.name.trim() && !mode.channels.trim()) continue
    const channels = Number(mode.channels)
    if (!mode.name.trim() || !Number.isInteger(channels) || channels < 1 || channels > 512) return { error: tx('Každý DMX mód potrebuje názov a počet kanálov 1–512.') }
    modes.push({ name: mode.name.trim().slice(0, 40), channels, ...(mode.map.trim() ? { map: mode.map.replace(/\s+$/, '').slice(0, 6000) } : {}) })
  }
  if (modes.length) out.dmxModes = modes
  return { attributes: out as EquipmentAttributes }
}

export function CatalogAdminPage() {
  const developer = useQuery({ queryKey: bugKeys.developer, queryFn: fetchIsDeveloper, retry: false, staleTime: 10 * 60_000 })
  if (developer.isPending) return <LoadingBlock />
  // Len vývojár: ostatných (aj keď zadajú adresu ručne) pošle na výber firmy. Zápis aj tak pustí len databáza.
  if (developer.data !== true) return <Navigate to="/company/select" replace />
  return <CatalogAdmin />
}

function CatalogAdmin() {
  const queryClient = useQueryClient()
  const catalog = useCatalog()
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState<EquipmentKind | ''>('')
  const [brand, setBrand] = useState('')
  const [verified, setVerified] = useState<'all' | 'unverified' | 'verified'>('unverified')
  const [data, setData] = useState<'all' | 'empty' | 'filled' | 'incomplete' | 'complete'>('all')
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState<string | null>(null)
  const [order, setOrder] = useState<'brand' | 'usage'>('brand')
  // Koľko firiem a kusov model používa – čo overovať najskôr.
  const usage = useQuery({ queryKey: catalogKeys.usage, queryFn: fetchCatalogUsage, retry: false, staleTime: 5 * 60_000 })
  const used = (id: string) => usage.data?.get(id)
  const refresh = () => queryClient.invalidateQueries({ queryKey: catalogKeys.all })
  const verify = useMutation({ mutationFn: ({ ids, value }: { ids: string[]; value: boolean }) => verifyCatalogEntries(ids, value), onSuccess: refresh })

  const all = useMemo(() => catalog.data ?? [], [catalog.data])
  const brands = useMemo(
    () => [...new Set(all.filter((entry) => !kind || entry.kind === kind).map((entry) => entry.manufacturer))].sort((a, b) => a.localeCompare(b, 'sk')),
    [all, kind],
  )
  const words = plain(search.trim()).split(/\s+/).filter(Boolean)
  const matching = all
    .filter((entry) => !kind || entry.kind === kind)
    .filter((entry) => !brand || entry.manufacturer === brand)
    .filter((entry) => verified === 'all' || entry.verified === (verified === 'verified'))
    .filter((entry) => {
      if (data === 'all') return true
      if (data === 'empty' || data === 'filled') return (Object.keys(entry.attributes).length === 0) === (data === 'empty')
      // „Neúplné“ / „Úplné“ – bez kódu Thomann, ten sa dopĺňa zvlášť.
      const missing = catalogMissing(entry).filter((item) => item !== 'kód Thomann')
      return (missing.length > 0) === (data === 'incomplete')
    })
    .filter((entry) => words.every((word) => plain(`${entry.manufacturer} ${entry.model}`).includes(word)))
    .sort(
      (a, b) =>
        (order === 'usage' ? (used(b.id)?.companies ?? 0) - (used(a.id)?.companies ?? 0) || (used(b.id)?.pieces ?? 0) - (used(a.id)?.pieces ?? 0) : 0) ||
        a.manufacturer.localeCompare(b.manufacturer, 'sk') ||
        a.model.localeCompare(b.model, 'sk', { numeric: true }),
    )
  const pages = Math.max(1, Math.ceil(matching.length / PAGE))
  const current = Math.min(page, pages - 1)
  const shown = matching.slice(current * PAGE, current * PAGE + PAGE)
  const resetPage = <T,>(set: (value: T) => void) => (value: T) => {
    set(value)
    setPage(0)
  }

  if (catalog.isPending) return <LoadingBlock />
  if (catalog.isError) return <ErrorBlock message={tx('Katalóg sa nepodarilo načítať.')} onRetry={() => void catalog.refetch()} />

  return (
    <article className="flex flex-col gap-4">
      <Link to="/company/select?view=developer" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {tx('Vývojár')}
      </Link>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{tx('Databáza techniky')}</h1>
        <p className="text-sm text-muted-foreground">
          {tf('{0} modelov, overených {1}. Firmy pri výbere modelu vidia, či sú údaje overené.', all.length, all.filter((entry) => entry.verified).length)}
        </p>
      </header>

      <FeedbackQueue catalog={all} />

      <div className="grid gap-2 rounded-xl border bg-surface p-3 sm:grid-cols-2 lg:grid-cols-6">
        <input className={input} placeholder={tx('Hľadať značku alebo model…')} aria-label={tx('Hľadať')} value={search} onChange={(event) => resetPage(setSearch)(event.target.value)} />
        <select className={input} aria-label={tx('Druh')} value={kind} onChange={(event) => { resetPage(setKind)(event.target.value as EquipmentKind | ''); setBrand('') }}>
          <option value="">{tx('Všetky druhy')}</option>
          {CATALOG_KINDS.map((value) => (
            <option key={value} value={value}>
              {tx(KIND_LABELS[value])}
            </option>
          ))}
        </select>
        <select className={input} aria-label={tx('Značka')} value={brand} onChange={(event) => resetPage(setBrand)(event.target.value)}>
          <option value="">{tf('Všetky značky ({0})', brands.length)}</option>
          {brands.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select className={input} aria-label={tx('Overenie')} value={verified} onChange={(event) => resetPage(setVerified)(event.target.value as typeof verified)}>
          <option value="unverified">{tx('Neoverené')}</option>
          <option value="verified">{tx('Overené')}</option>
          <option value="all">{tx('Overené aj neoverené')}</option>
        </select>
        <select className={input} aria-label={tx('Údaje')} value={data} onChange={(event) => resetPage(setData)(event.target.value as typeof data)}>
          <option value="all">{tx('S údajmi aj bez')}</option>
          <option value="empty">{tx('Bez technických údajov')}</option>
          <option value="filled">{tx('S technickými údajmi')}</option>
          <option value="incomplete">{tx('Neúplné (niečo chýba)')}</option>
          <option value="complete">{tx('Úplné')}</option>
        </select>
        <select className={input} aria-label={tx('Zoradenie')} value={order} onChange={(event) => resetPage(setOrder)(event.target.value as typeof order)}>
          <option value="brand">{tx('Podľa značky')}</option>
          <option value="usage">{tx('Najpoužívanejšie vo firmách')}</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">{tf('Nájdených {0}', matching.length)}</span>
        {verify.isError && <span className="text-destructive">{tx('Overenie sa nepodarilo.')}</span>}
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tx('Nič sa nenašlo.')}</p>
      ) : (
        <ul className="divide-y rounded-xl border bg-surface">
          {shown.map((entry) =>
            editing === entry.id ? (
              <li key={entry.id} className="p-3">
                <Editor entry={entry} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <li key={entry.id} className="flex items-start gap-3 px-3 py-2 text-sm">
                <span className="w-24 shrink-0 pt-0.5 text-muted-foreground">{tx(KIND_LABELS[entry.kind])}</span>
                <span className="min-w-0 flex-1">
                  <span className="block">
                    <span className="font-medium">{entry.manufacturer}</span> {entry.model}
                  </span>
                  <span className="block text-xs text-muted-foreground">{describeAttributes({ attributes: entry.attributes }) || tx('bez technických údajov')}</span>
                  {used(entry.id) && (
                    <span className="block text-xs text-sky-700 dark:text-sky-400">{tf('Používa {0} firiem · {1} ks', used(entry.id)!.companies, used(entry.id)!.pieces)}</span>
                  )}
                  <Missing entry={entry} />
                </span>
                <Button
                  size="sm"
                  variant={entry.verified ? 'ghost' : 'outline'}
                  className="shrink-0"
                  disabled={verify.isPending}
                  aria-label={entry.verified ? tf('Zrušiť overenie: {0} {1}', entry.manufacturer, entry.model) : tf('Overiť: {0} {1}', entry.manufacturer, entry.model)}
                  onClick={() => verify.mutate({ ids: [entry.id], value: !entry.verified })}
                >
                  {entry.verified ? <ShieldCheck className="size-4 text-emerald-600" aria-hidden /> : <Check className="size-4" aria-hidden />}
                  {entry.verified ? tx('Overené') : tx('Overiť')}
                </Button>
                <Button size="sm" variant="outline" className="shrink-0" aria-label={tf('Upraviť {0}', `${entry.manufacturer} ${entry.model}`)} onClick={() => setEditing(entry.id)}>
                  <Pencil className="size-4" aria-hidden />
                  {tx('Upraviť')}
                </Button>
              </li>
            ),
          )}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <Button size="sm" variant="outline" disabled={current === 0} onClick={() => setPage(current - 1)}>
            {tx('Predchádzajúce')}
          </Button>
          <span className="text-muted-foreground">{tf('Strana {0} z {1}', current + 1, pages)}</span>
          <Button size="sm" variant="outline" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
            {tx('Ďalšie')}
          </Button>
        </div>
      )}
    </article>
  )
}

/** Od firiem: „údaje sú správne“ (overiť jedným klikom) a navrhované zmeny údajov (prijať do databázy / zamietnuť). */
function FeedbackQueue({ catalog }: { catalog: CatalogEntry[] }) {
  const queryClient = useQueryClient()
  const queue = useQuery({ queryKey: catalogKeys.feedback, queryFn: fetchFeedbackQueue, retry: false })
  const resolve = useMutation({
    mutationFn: ({ item, accept }: { item: CatalogFeedback; accept: boolean }) => resolveCatalogFeedback(item.id, accept),
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: catalogKeys.feedback }), queryClient.invalidateQueries({ queryKey: catalogKeys.all })]),
  })
  const items = (queue.data ?? []).map((item) => ({ item, entry: catalog.find((entry) => entry.id === item.catalogId) })).filter((row) => row.entry)
  if (items.length === 0) return null
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-accent/40 bg-accent/5 p-3">
      <h2 className="font-semibold">{tf('Od firiem na overenie ({0})', items.length)}</h2>
      {resolve.isError && <p className="text-sm text-destructive">{tx('Nepodarilo sa uložiť.')}</p>}
      <ul className="flex flex-col gap-2">
        {items.map(({ item, entry }) => (
          <li key={item.id} className="flex flex-wrap items-start gap-3 rounded-lg border bg-surface px-3 py-2 text-sm">
            <span className="min-w-0 flex-1">
              <span className="block">
                <span className="font-medium">{entry!.manufacturer}</span> {entry!.model}
                <span className="ml-2 text-xs text-muted-foreground">{tx(KIND_LABELS[entry!.kind])}</span>
              </span>
              {item.type === 'confirm' ? (
                <span className="block text-xs text-emerald-700 dark:text-emerald-400">
                  {tf('Údaje sú podľa firiem správne ({0})', item.companies)}
                </span>
              ) : (
                <span className="mt-1 flex flex-col gap-0.5 text-xs">
                  <span className="text-amber-700 dark:text-amber-400">{tx('Navrhovaná zmena údajov:')}</span>
                  {Object.entries(item.attributes).map(([key, value]) => {
                    const before = (entry!.attributes as Record<string, unknown>)[key]
                    return (
                      <span key={key} className="break-words">
                        {label(key)}: <span className="text-muted-foreground line-through">{before === undefined ? tx('(prázdne)') : toText(before)}</span> → <span className="font-medium">{toText(value)}</span>
                      </span>
                    )
                  })}
                </span>
              )}
            </span>
            <Button size="sm" variant="outline" className="shrink-0" disabled={resolve.isPending} onClick={() => resolve.mutate({ item, accept: true })}>
              <Check className="size-4" aria-hidden />
              {item.type === 'confirm' ? tx('Overiť') : tx('Prijať zmenu')}
            </Button>
            <Button size="sm" variant="ghost" className="shrink-0" disabled={resolve.isPending} onClick={() => resolve.mutate({ item, accept: false })}>
              <X className="size-4" aria-hidden />
              {tx('Zamietnuť')}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Čo modelu chýba (podľa druhu a typu) a odkaz na Thomann, ak je zadaný kód. */
function Missing({ entry }: { entry: CatalogEntry }) {
  const missing = catalogMissing(entry)
  const code = String((entry.attributes as Record<string, unknown>).thomannCode ?? '')
  return (
    <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
      {missing.length > 0 ? (
        <span className="text-amber-700 dark:text-amber-400">{tf('Chýba: {0}', missing.map((item) => tx(item)).join(', '))}</span>
      ) : (
        <span className="text-emerald-700 dark:text-emerald-400">{tx('Všetky dôležité údaje sú vyplnené')}</span>
      )}
      {code && (
        <a href={thomannUrl(code)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
          {tf('Thomann {0}', code)}
          <ExternalLink className="size-3" aria-hidden />
        </a>
      )}
    </span>
  )
}

/** Úprava modelu: všetky údaje, ktoré k druhu patria (aj prázdne), DMX módy po riadkoch a overenie. */
function Editor({ entry, onDone }: { entry: CatalogEntry; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<Draft>(() => toDraft(entry))
  const [newKey, setNewKey] = useState('')
  const [error, setError] = useState('')
  const refresh = () => queryClient.invalidateQueries({ queryKey: catalogKeys.all })
  const save = useMutation({
    mutationFn: updateCatalogEntry,
    onSuccess: async () => {
      await refresh()
      onDone()
    },
    onError: (failure: { code?: string }) => setError(failure.code === '23505' ? tx('Taký model (druh, značka a model) už v databáze je.') : tx('Uloženie sa nepodarilo.')),
  })
  const remove = useMutation({ mutationFn: () => deleteCatalogEntry(entry.id), onSuccess: refresh })
  const standard = fieldsFor(draft.kind, draft.values)
  const extra = Object.keys(draft.values).filter((key) => !standard.includes(key))
  const shownKeys = [...standard, ...extra]
  const unused = CATALOG_KEYS.filter((key) => key !== 'dmxModes' && !shownKeys.includes(key))
  const showModes = draft.kind === 'light' || draft.modes.length > 0
  const setValue = (key: string, value: string) => setDraft((current) => ({ ...current, values: { ...current.values, [key]: value } }))
  const setMode = (index: number, patch: Partial<Mode>) => setDraft((current) => ({ ...current, modes: current.modes.map((mode, i) => (i === index ? { ...mode, ...patch } : mode)) }))

  function submit() {
    setError('')
    if (!draft.manufacturer.trim()) return setError(tx('Zadajte značku.'))
    const result = toAttributes(draft)
    if (result.error || !result.attributes) return setError(result.error ?? tx('Uloženie sa nepodarilo.'))
    save.mutate({ id: entry.id, kind: draft.kind, manufacturer: draft.manufacturer, model: draft.model, attributes: result.attributes, verified: draft.verified })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-[10rem_1fr_1fr]">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {tx('Druh')}
          <select className={input} value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as EquipmentKind })}>
            {CATALOG_KINDS.map((value) => (
              <option key={value} value={value}>
                {tx(KIND_LABELS[value])}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {tx('Značka')}
          <input className={input} maxLength={80} value={draft.manufacturer} onChange={(event) => setDraft({ ...draft, manufacturer: event.target.value })} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {tx('Model')}
          <input className={input} maxLength={80} value={draft.model} onChange={(event) => setDraft({ ...draft, model: event.target.value })} />
        </label>
      </div>

      <div className="grid gap-x-3 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        {shownKeys.map((key) => {
          const value = draft.values[key] ?? ''
          const options = SELECTS[key]
          return (
            <div key={key} className={cn('flex flex-col gap-1', JSON_KEYS.has(key) && 'sm:col-span-2 lg:col-span-3')}>
              <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                {label(key)}
                {extra.includes(key) && (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={tf('Odobrať {0}', label(key))}
                    onClick={() =>
                      setDraft((current) => {
                        const values = { ...current.values }
                        delete values[key]
                        return { ...current, values }
                      })
                    }
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                )}
              </span>
              {options ? (
                <select className={input} aria-label={label(key)} value={value} onChange={(event) => setValue(key, event.target.value)}>
                  <option value="">{tx('— nezadané —')}</option>
                  {options.map(([optionValue, optionLabel]) => (
                    <option key={optionValue} value={optionValue}>
                      {tx(optionLabel)}
                    </option>
                  ))}
                  {value && !options.some(([optionValue]) => optionValue === value) && <option value={value}>{value}</option>}
                </select>
              ) : BOOLEAN_KEYS.has(key) ? (
                <select className={input} aria-label={label(key)} value={value} onChange={(event) => setValue(key, event.target.value)}>
                  <option value="">{tx('— nezadané —')}</option>
                  <option value="true">{tx('Áno')}</option>
                  <option value="false">{tx('Nie')}</option>
                </select>
              ) : JSON_KEYS.has(key) ? (
                <textarea className="min-h-24 w-full rounded-lg border bg-background p-2 font-mono text-xs" aria-label={label(key)} value={value} onChange={(event) => setValue(key, event.target.value)} />
              ) : (
                <input className={input} aria-label={label(key)} inputMode={isNumberKey(key) ? 'decimal' : undefined} value={value} onChange={(event) => setValue(key, event.target.value)} />
              )}
              {key === 'thomannCode' && value.trim() && (
                <a href={thomannUrl(value)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                  {tx('Otvoriť v Thomanne')}
                  <ExternalLink className="size-3" aria-hidden />
                </a>
              )}
            </div>
          )
        })}
      </div>

      {unused.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <select className={`${input} max-w-xs`} aria-label={tx('Pridať údaj')} value={newKey} onChange={(event) => setNewKey(event.target.value)}>
            <option value="">{tx('— pridať ďalší údaj —')}</option>
            {unused.map((key) => (
              <option key={key} value={key}>
                {label(key)}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            disabled={!newKey}
            onClick={() => {
              setValue(newKey, '')
              setNewKey('')
            }}
          >
            <Plus className="size-4" aria-hidden />
            {tx('Pridať')}
          </Button>
        </div>
      )}

      {showModes && (
        <section className="flex flex-col gap-2 rounded-lg border p-3">
          <h3 className="text-sm font-medium">{tf('DMX módy ({0})', draft.modes.length)}</h3>
          {draft.modes.map((mode, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[1fr_7rem_auto]">
              <input className={input} placeholder={tx('Názov módu')} aria-label={tf('Názov módu {0}', index + 1)} maxLength={40} value={mode.name} onChange={(event) => setMode(index, { name: event.target.value })} />
              <input className={input} placeholder={tx('Kanály')} aria-label={tf('Kanály módu {0}', index + 1)} inputMode="numeric" value={mode.channels} onChange={(event) => setMode(index, { channels: event.target.value })} />
              <Button size="sm" variant="ghost" className="size-9 p-0" aria-label={tf('Odobrať mód {0}', index + 1)} onClick={() => setDraft((current) => ({ ...current, modes: current.modes.filter((_, i) => i !== index) }))}>
                <X className="size-4" aria-hidden />
              </Button>
              <textarea
                className="min-h-20 w-full rounded-lg border bg-background p-2 font-mono text-xs sm:col-span-3"
                placeholder={tx('Rozpis kanálov – jeden riadok = jeden kanál')}
                aria-label={tf('Rozpis kanálov módu {0}', index + 1)}
                rows={Math.min(12, Math.max(3, mode.map.split('\n').length))}
                value={mode.map}
                onChange={(event) => setMode(index, { map: event.target.value })}
              />
            </div>
          ))}
          <Button size="sm" variant="outline" className="self-start" onClick={() => setDraft((current) => ({ ...current, modes: [...current.modes, { name: '', channels: '', map: '' }] }))}>
            <Plus className="size-4" aria-hidden />
            {tx('Pridať mód')}
          </Button>
        </section>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4" checked={draft.verified} onChange={(event) => setDraft({ ...draft, verified: event.target.checked })} />
        {tx('Údaje sú overené')}
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={save.isPending} onClick={submit}>
          {save.isPending ? tx('Ukladám…') : tx('Uložiť')}
        </Button>
        <Button size="sm" variant="outline" onClick={onDone}>
          {tx('Zrušiť')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto text-destructive"
          disabled={remove.isPending}
          onClick={() => window.confirm(tf('Zmazať z katalógu {0} {1}? Technika firiem ostane.', entry.manufacturer, entry.model)) && remove.mutate()}
        >
          <Trash2 className="size-4" aria-hidden />
          {tx('Zmazať')}
        </Button>
      </div>
    </div>
  )
}
