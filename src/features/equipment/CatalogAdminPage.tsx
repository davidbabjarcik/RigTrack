import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, ExternalLink, Pencil, Plus, ShieldCheck, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { bugKeys, fetchIsDeveloper } from '@/features/bugs/api'
import { plain } from '@/features/search/searchAll'
import { tf, tx } from '@/lib/i18n'
import { CATALOG_KEYS, CATALOG_KINDS, catalogKeys, catalogMissing, deleteCatalogEntry, thomannUrl, updateCatalogEntry, useCatalog, verifyCatalogEntries, type CatalogEntry } from './catalog'
import { describeAttributes, KIND_LABELS, type EquipmentAttributes, type EquipmentKind } from './model'

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
  ledPanel: 'LED panel (JSON)', ledProcessor: 'LED procesor (JSON)', display: 'Displej (JSON)', thomannCode: 'Kód Thomann (číslo artiklu)',
}
const BOOLEAN_KEYS = new Set(['biamp', 'poleMount', 'hdmiOut'])
const JSON_KEYS = new Set(['dmxModes', 'wirelessTxs', 'nodeProtocols', 'ledPanel', 'ledProcessor', 'display'])
const isNumberKey = (key: string) => /(W|Db|Ohm|Kg|Cm|M|Slots|Channels|Ports|Switches|W2|W4|W8|Bridge4|Bridge8)$/.test(key) && !['powered', 'woofer'].includes(key)
const label = (key: string) => (KEY_LABELS[key] ? tx(KEY_LABELS[key]) : key)

type Draft = { kind: EquipmentKind; manufacturer: string; model: string; verified: boolean; values: Record<string, string> }

const toText = (value: unknown) => (typeof value === 'object' && value !== null ? JSON.stringify(value, null, 1) : String(value ?? ''))

function toDraft(entry: CatalogEntry): Draft {
  const values: Record<string, string> = {}
  for (const [key, value] of Object.entries(entry.attributes as Record<string, unknown>)) values[key] = toText(value)
  return { kind: entry.kind, manufacturer: entry.manufacturer, model: entry.model, verified: entry.verified, values }
}

/** Text z formulára späť na údaje; chybný JSON alebo číslo vráti chybu s názvom poľa. */
function toAttributes(values: Record<string, string>): { attributes?: EquipmentAttributes; error?: string } {
  const out: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(values)) {
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
    .sort((a, b) => a.manufacturer.localeCompare(b.manufacturer, 'sk') || a.model.localeCompare(b.model, 'sk', { numeric: true }))
  const pages = Math.max(1, Math.ceil(matching.length / PAGE))
  const current = Math.min(page, pages - 1)
  const shown = matching.slice(current * PAGE, current * PAGE + PAGE)
  const toVerify = matching.filter((entry) => !entry.verified)
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

      <div className="grid gap-2 rounded-xl border bg-surface p-3 sm:grid-cols-2 lg:grid-cols-5">
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
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">{tf('Nájdených {0}', matching.length)}</span>
        {toVerify.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            disabled={verify.isPending}
            onClick={() =>
              window.confirm(tf('Overiť všetkých {0} zobrazených modelov? Skontrolovali ste ich údaje?', toVerify.length)) &&
              verify.mutate({ ids: toVerify.map((entry) => entry.id).slice(0, 2000), value: true })
            }
          >
            <ShieldCheck className="size-4" aria-hidden />
            {tf('Overiť zobrazené ({0})', Math.min(toVerify.length, 2000))}
          </Button>
        )}
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
                <Button size="sm" variant="ghost" className="size-8 shrink-0 p-0" aria-label={tf('Upraviť {0}', `${entry.manufacturer} ${entry.model}`)} onClick={() => setEditing(entry.id)}>
                  <Pencil className="size-4" aria-hidden />
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

/** Úprava modelu: druh, značka, model, technické údaje (po jednom poli) a overenie. */
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
  const unused = CATALOG_KEYS.filter((key) => !(key in draft.values))
  const setValue = (key: string, value: string) => setDraft((current) => ({ ...current, values: { ...current.values, [key]: value } }))

  function submit() {
    setError('')
    if (!draft.manufacturer.trim()) return setError(tx('Zadajte značku.'))
    const result = toAttributes(draft.values)
    if (result.error || !result.attributes) return setError(result.error ?? tx('Uloženie sa nepodarilo.'))
    save.mutate({ id: entry.id, kind: draft.kind, manufacturer: draft.manufacturer, model: draft.model, attributes: result.attributes, verified: draft.verified })
  }

  return (
    <div className="flex flex-col gap-3">
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

      <div className="flex flex-col gap-2">
        {Object.keys(draft.values).length === 0 && <p className="text-sm text-muted-foreground">{tx('Bez technických údajov – pridajte ich nižšie.')}</p>}
        {Object.entries(draft.values).map(([key, value]) => (
          <div key={key} className="grid items-start gap-2 sm:grid-cols-[14rem_1fr_auto]">
            <span className="pt-2 text-xs text-muted-foreground">{label(key)}</span>
            {BOOLEAN_KEYS.has(key) ? (
              <select className={input} aria-label={label(key)} value={value === 'true' ? 'true' : 'false'} onChange={(event) => setValue(key, event.target.value)}>
                <option value="true">{tx('Áno')}</option>
                <option value="false">{tx('Nie')}</option>
              </select>
            ) : JSON_KEYS.has(key) ? (
              <textarea className="min-h-24 w-full rounded-lg border bg-background p-2 font-mono text-xs" aria-label={label(key)} value={value} onChange={(event) => setValue(key, event.target.value)} />
            ) : (
              <input className={input} aria-label={label(key)} inputMode={isNumberKey(key) ? 'decimal' : undefined} value={value} onChange={(event) => setValue(key, event.target.value)} />
            )}
            <Button
              size="sm"
              variant="ghost"
              className="size-9 p-0"
              aria-label={tf('Odobrať {0}', label(key))}
              onClick={() =>
                setDraft((current) => {
                  const values = { ...current.values }
                  delete values[key]
                  return { ...current, values }
                })
              }
            >
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        ))}
        {unused.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <select className={`${input} max-w-xs`} aria-label={tx('Pridať údaj')} value={newKey} onChange={(event) => setNewKey(event.target.value)}>
              <option value="">{tx('— pridať údaj —')}</option>
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
                setValue(newKey, BOOLEAN_KEYS.has(newKey) ? 'true' : '')
                setNewKey('')
              }}
            >
              <Plus className="size-4" aria-hidden />
              {tx('Pridať')}
            </Button>
          </div>
        )}
      </div>

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
