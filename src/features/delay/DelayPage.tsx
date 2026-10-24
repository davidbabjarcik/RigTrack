import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { SelectField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { DevNotice } from '@/components/feedback/DevNotice'
import { PageHeader } from '@/components/layout/PageHeader'
import { CalculatorTabs } from '@/components/layout/ModuleTabs'
import { Field } from '@/components/ui/field'
import { cn } from '@/lib/utils'
import {
  alignWithSubDelay,
  compensateOwnDelay,
  arcDelay,
  cardioid,
  endFire,
  maxLineSpacing,
  quarterWave,
  round,
  samples,
  speedOfSound,
  straightLine,
  towerDelay,
  wavelength,
  cardioidResponse,
  cardioidSpacing,
  CARDIOID_LAYOUT_LABELS,
  endFireResponse,
  RESPONSE_FREQUENCIES,
  minSpacing,
  physicalWidth,
  type CardioidLayout,
  type SubBox,
  type SubDelay,
} from './model'

const MODES = [
  { id: 'align', label: 'Topy ↔ suby' },
  { id: 'tower', label: 'Delay veža' },
  { id: 'cardioid', label: 'Cardioid' },
  { id: 'endfire', label: 'End-fire' },
  { id: 'line', label: 'Rovný rad' },
  { id: 'arc', label: 'Arc delay' },
] as const
type Mode = (typeof MODES)[number]['id']

const fmt = (value: number, digits = 2) => round(value, digits).toLocaleString('sk-SK', { maximumFractionDigits: digits })

/** Číselné pole, ktoré si drží rozpísaný text (aj „1,“) a von dáva číslo. */
function NumberInput({ label, value, onChange, step = 0.1, min = 0, max, unit, hint }: {
  label: string
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
  max?: number
  unit?: string
  hint?: string
}) {
  // Kým sa píše, drží sa rozpísaný text; inak sa ukazuje hodnota (môže ju zmeniť aj iné pole).
  const [text, setText] = useState<string | null>(null)
  return (
    <div>
      <Field
        label={unit ? `${label} (${unit})` : label}
        inputMode="decimal"
        value={text ?? String(round(value, 3)).replace('.', ',')}
        onFocus={(event) => setText(event.target.value)}
        onChange={(event) => {
          setText(event.target.value)
          const parsed = Number(event.target.value.replace(',', '.'))
          if (event.target.value.trim() !== '' && Number.isFinite(parsed) && parsed >= min && (max === undefined || parsed <= max)) onChange(parsed)
        }}
        onBlur={() => setText(null)}
        step={step}
      />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function Result({ title, ms, note }: { title: string; ms: number; note?: string }) {
  return (
    <div className="rounded-xl border bg-surface p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-3xl font-semibold tabular-nums">{fmt(ms)} ms</p>
      <p className="text-sm text-muted-foreground tabular-nums">
        {samples(ms)} vzoriek pri 48 kHz · {samples(ms, 96_000)} pri 96 kHz
      </p>
      {note && <p className="mt-2 text-sm">{note}</p>}
    </div>
  )
}

/** Nákres zhora: publikum je hore, štvorce sú suby s ich delay. */
function Diagram({ subs, box }: { subs: SubDelay[]; box: SubBox | null }) {
  // Box v reálnej veľkosti (šírka × hĺbka), bez rozmerov 70 × 70 cm.
  const w = box ? box.widthCm / 100 : 0.7
  const d = box ? box.depthCm / 100 : 0.7
  const size = Math.max(w, d)
  const font = Math.min(0.22, Math.max(w, 0.45) * 0.36)
  const xs = subs.map((sub) => sub.x)
  const ys = subs.map((sub) => sub.y)
  // Suby za sebou (end-fire): popis vpravo, inak pod subom.
  const column = new Set(xs).size === 1
  const minX = Math.min(...xs) - size - (column ? 1.2 : 0)
  const maxX = Math.max(...xs) + size + (column ? 1.2 : 0)
  const minY = Math.min(...ys) - size
  const maxY = Math.max(...ys) + size
  const width = Math.max(maxX - minX, 3)
  const height = Math.max(maxY - minY, 1.6) + 1.2
  const cx = (minX + maxX) / 2
  const toX = (x: number) => x - cx + width / 2
  const toY = (y: number) => maxY - y + 0.9
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mx-auto max-h-72 w-full" role="img" aria-label="Nákres rozmiestnenia subov zhora">
      <text x={width / 2} y={0.35} textAnchor="middle" fontSize={0.28} className="fill-muted-foreground">
        ↑ publikum
      </text>
      {subs.map((sub) => (
        <g key={sub.label}>
          <rect
            x={toX(sub.x) - w / 2}
            y={toY(sub.y) - d / 2}
            width={w}
            height={d}
            rx={0.06}
            className={sub.inverted ? 'fill-amber-200 stroke-amber-700 dark:fill-amber-900' : 'fill-pink-200 stroke-pink-700 dark:fill-pink-900'}
            strokeWidth={0.03}
          />
          {/* šípka: kam sub hrá */}
          <path
            d={sub.facingBack ? `M ${toX(sub.x)} ${toY(sub.y) + 0.12} l -0.12 -0.18 h 0.24 z` : `M ${toX(sub.x)} ${toY(sub.y) - 0.12} l -0.12 0.18 h 0.24 z`}
            className="fill-foreground"
          />
          <text
            x={column ? toX(sub.x) + w / 2 + 0.1 : toX(sub.x)}
            y={column ? toY(sub.y) + 0.08 : toY(sub.y) + d / 2 + 0.25}
            textAnchor={column ? 'start' : 'middle'}
            fontSize={font}
            className="fill-foreground"
          >
            {fmt(sub.ms)} ms{sub.inverted ? ' ⟲' : ''}
          </text>
        </g>
      ))}
    </svg>
  )
}

function Warning({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
      <p className="min-w-0 flex-1">{children}</p>
      {action}
    </div>
  )
}

const signedDb = (db: number) => (db <= -60 ? '−∞ (ticho)' : `${db > 0 ? '+' : db < 0 ? '−' : ''}${fmt(Math.abs(db), 1)} dB`)

/** Koľko to hrá dopredu a dozadu pri rôznych frekvenciách (ideálny odhad). */
function ResponseTable({ target, response }: { target: number; response: (frequency: number) => { frontDb: number; rearDb: number } }) {
  const frequencies = [...new Set([...RESPONSE_FREQUENCIES, target])].sort((a, b) => a - b)
  return (
    <CollapsibleSection id="delay.response" title="Dopredu a dozadu podľa frekvencie">
      <div className="overflow-x-auto rounded-xl border bg-surface">
        <table className="w-full text-sm tabular-nums">
          <thead className="text-muted-foreground">
            <tr className="border-b text-left">
              <th className="px-4 py-2 font-medium">Frekvencia</th>
              <th className="px-4 py-2 text-right font-medium">Dopredu</th>
              <th className="px-4 py-2 text-right font-medium">Dozadu (pódium)</th>
              <th className="px-4 py-2 text-right font-medium">Predok – zadok</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {frequencies.map((frequency) => {
              const { frontDb, rearDb } = response(frequency)
              return (
                <tr key={frequency} className={cn(frequency === target && 'bg-accent/10 font-medium')}>
                  <td className="px-4 py-2">
                    {fmt(frequency, 1)} Hz{frequency === target && ' (cieľ)'}
                  </td>
                  <td className="px-4 py-2 text-right">{signedDb(frontDb)}</td>
                  <td className="px-4 py-2 text-right">{signedDb(rearDb)}</td>
                  <td className="px-4 py-2 text-right">{rearDb <= -60 ? 'úplné' : `${fmt(frontDb - rearDb, 1)} dB`}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Ideálny odhad (bodové zdroje, rovnaký level, voľné pole), oproti predným subom bez zadných. V praxi dolaďte meraním – podlaha, steny a pódium
        to menia.
      </p>
    </CollapsibleSection>
  )
}

function SubTable({ subs, ownMs }: { subs: SubDelay[]; ownMs: number }) {
  // Vlastný delay jednotlivých subov (napr. pri mixe hornových a priamych); prázdne = podľa zvoleného subu.
  const [own, setOwn] = useState<Record<string, string>>({})
  const ownOf = (label: string) => {
    const typed = Number((own[label] ?? '').replace(',', '.'))
    return (own[label] ?? '').trim() !== '' && Number.isFinite(typed) && typed >= 0 ? typed : ownMs
  }
  const dsp = compensateOwnDelay(subs.map((sub) => ({ ms: sub.ms, ownMs: ownOf(sub.label) })))
  const mixed = subs.some((sub) => ownOf(sub.label) !== ownOf(subs[0].label))
  return (
    <div className="overflow-x-auto rounded-xl border bg-surface">
      <table className="w-full text-sm tabular-nums">
        <thead className="text-muted-foreground">
          <tr className="border-b text-left">
            <th className="px-4 py-2 font-medium">Sub</th>
            <th className="px-4 py-2 text-right font-medium">Delay z polohy</th>
            <th className="px-4 py-2 font-medium">Vlastný delay subu (ms)</th>
            <th className="px-4 py-2 text-right font-medium">Nastaviť v procesore</th>
            <th className="px-4 py-2 font-medium">Polarita</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {subs.map((sub, index) => (
            <tr key={sub.label}>
              <td className="px-4 py-2">{sub.label}</td>
              <td className="px-4 py-2 text-right">{fmt(sub.ms)} ms</td>
              <td className="px-4 py-1">
                <input
                  inputMode="decimal"
                  aria-label={`Vlastný delay: ${sub.label}`}
                  placeholder={fmt(ownMs)}
                  className="h-9 w-20 rounded-lg border bg-surface px-2 text-right"
                  value={own[sub.label] ?? ''}
                  onChange={(event) => setOwn((current) => ({ ...current, [sub.label]: event.target.value }))}
                />
              </td>
              <td className="px-4 py-2 text-right font-medium">
                {fmt(dsp[index])} ms
                <span className="block text-xs font-normal text-muted-foreground">{samples(dsp[index])} vz. @ 48 kHz</span>
              </td>
              <td className={cn('px-4 py-2', sub.inverted && 'font-medium text-amber-700 dark:text-amber-300')}>{sub.inverted ? 'otočená (−)' : 'normálna (+)'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t px-4 py-2 text-xs text-muted-foreground">
        {mixed
          ? 'Suby majú rôzny vlastný delay (napr. hornové a priame): v procesore nastavte stĺpec „Nastaviť v procesore“, aby zvuk prišiel naraz.'
          : 'Všetky suby majú rovnaký vlastný delay, takže sa vyruší. Pri mixe rôznych subov (napr. slimák a priamy) zadajte vlastný delay pri každom.'}
      </p>
    </div>
  )
}

/** Delay kalkulačka pre suby: zarovnanie, delay veža, cardioid, end-fire, rovný rad a arc delay. */
export function DelayPage() {
  const [params, setParams] = useSearchParams()
  const mode: Mode = MODES.find((item) => item.id === params.get('mode'))?.id ?? 'align'
  const [temp, setTemp] = useState(20)
  // zarovnanie / veža
  const [toTops, setToTops] = useState(20)
  const [toSubs, setToSubs] = useState(18.5)
  const [towerDistance, setTowerDistance] = useState(40)
  const [haas, setHaas] = useState(10)
  // cardioid / end-fire
  const [target, setTarget] = useState(80)
  const [followTarget, setFollowTarget] = useState(false)
  const [spacing, setSpacing] = useState(1)
  const companyId = useCompany().active?.companyId ?? ''
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId), enabled: companyId !== '' })
  // Suby z techniky: podľa typu Subwoofer, s rozmermi boxu navrchu.
  const subChoices = (equipment.data ?? [])
    .filter((item) => item.status !== 'retired' && item.attributes.audioType === 'subwoofer')
    .sort((a, b) => Number(b.attributes.boxWidthCm !== undefined) - Number(a.attributes.boxWidthCm !== undefined) || a.name.localeCompare(b.name, 'sk'))
  const [subId, setSubId] = useState('')
  const [boxW, setBoxW] = useState<number | null>(null)
  const [boxD, setBoxD] = useState<number | null>(null)
  const [boxH, setBoxH] = useState<number | null>(null)
  // Vlastné oneskorenie zvoleného subu (hornový / slimák), ms.
  const [ownMs, setOwnMs] = useState(0)
  const box: SubBox | null = boxW && boxD ? { name: subChoices.find((item) => item.id === subId)?.name ?? 'Vlastné rozmery', widthCm: boxW, depthCm: boxD, heightCm: boxH } : null
  const [layout, setLayout] = useState<CardioidLayout>('behind')
  const [gap, setGap] = useState(0)
  const [frontCount, setFrontCount] = useState(2)
  const [backCount, setBackCount] = useState(1)
  const [rows, setRows] = useState(3)
  // rad / arc
  const [count, setCount] = useState(6)
  const [lineSpacing, setLineSpacing] = useState(1.2)
  const [upper, setUpper] = useState(100)
  const [angle, setAngle] = useState(60)

  const c = speedOfSound(temp)
  const whole = (value: number) => Math.max(1, Math.round(value))

  return (
    <>
      <CalculatorTabs />
      <PageHeader title="Delay kalkulačka" description="Suby a zvuk: zarovnanie, delay veža, cardioid, end-fire, rad a arc" />
      <DevNotice className="mb-4 print:hidden" />

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Druh výpočtu">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={mode === item.id}
            onClick={() => setParams(item.id === 'align' ? {} : { mode: item.id }, { replace: true })}
            className={cn('shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium', mode === item.id ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted')}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-3">
        <NumberInput label="Teplota vzduchu" unit="°C" value={temp} onChange={setTemp} step={1} min={-30} max={50} hint={`Rýchlosť zvuku ${fmt(c, 1)} m/s`} />
        {mode === 'align' && (
          <>
            <NumberInput label="Vzdialenosť k topom" unit="m" value={toTops} onChange={setToTops} hint="Od miesta počúvania (napr. FOH)" />
            <NumberInput label="Vzdialenosť k subom" unit="m" value={toSubs} onChange={setToSubs} />
          </>
        )}
        {mode === 'tower' && (
          <>
            <NumberInput label="Vzdialenosť od hlavného PA" unit="m" value={towerDistance} onChange={setTowerDistance} />
            <NumberInput label="Predstih hlavného PA (Haas)" unit="ms" value={haas} onChange={setHaas} step={1} max={30} hint="Zvyčajne 5–15 ms, aby zvuk znel z pódia" />
          </>
        )}
        {(mode === 'cardioid' || mode === 'endfire') && (
          <>
            <NumberInput
              label="Rozostup (akustické stredy)"
              unit="m"
              value={spacing}
              onChange={(value) => {
                setSpacing(value)
                setFollowTarget(false)
              }}
              min={0.05}
              max={10}
            />
            <NumberInput
              label="Cieľová frekvencia"
              unit="Hz"
              value={target}
              onChange={(value) => {
                setTarget(value)
                if (followTarget) setSpacing(round(quarterWave(value, temp), 3))
              }}
              step={1}
              min={20}
              max={200}
              hint={`Odporúčaný rozostup λ/4 = ${fmt(quarterWave(target, temp))} m`}
            />
            <div className="flex flex-col justify-end gap-2 sm:col-span-3 sm:flex-row sm:items-center">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={followTarget}
                  onChange={(event) => {
                    setFollowTarget(event.target.checked)
                    if (event.target.checked) setSpacing(round(quarterWave(target, temp), 3))
                  }}
                />
                Rozostup podľa cieľovej frekvencie (λ/4)
              </label>
              {!followTarget && Math.abs(spacing - quarterWave(target, temp)) > 0.005 && (
                <Button variant="outline" size="sm" onClick={() => setSpacing(round(quarterWave(target, temp), 3))}>
                  Použiť λ/4 = {fmt(quarterWave(target, temp))} m
                </Button>
              )}
            </div>
            {mode === 'cardioid' ? (
              <>
                <NumberInput label="Predných subov" value={frontCount} onChange={(value) => setFrontCount(Math.min(whole(value), 12))} step={1} min={1} max={12} />
                <NumberInput
                  label="Zadných (otočených) subov"
                  value={backCount}
                  onChange={(value) => setBackCount(Math.min(whole(value), 12))}
                  step={1}
                  min={1}
                  max={12}
                  hint="Najčastejšie 2 predné : 1 zadný"
                />
                <SelectField
                  label="Uloženie"
                  value={layout}
                  onChange={(event) => {
                    const next = event.target.value as CardioidLayout
                    setLayout(next)
                    if (box) setSpacing(round(cardioidSpacing(box, next, gap), 3))
                  }}
                >
                  {(Object.keys(CARDIOID_LAYOUT_LABELS) as CardioidLayout[]).map((option) => (
                    <option key={option} value={option}>
                      {CARDIOID_LAYOUT_LABELS[option]}
                    </option>
                  ))}
                </SelectField>
                {layout === 'behind' && (
                  <NumberInput
                    label="Medzera medzi boxmi"
                    unit="m"
                    value={gap}
                    onChange={(value) => {
                      setGap(value)
                      if (box) setSpacing(round(cardioidSpacing(box, 'behind', value), 3))
                    }}
                    max={10}
                  />
                )}
              </>
            ) : (
              <NumberInput label="Počet radov" value={rows} onChange={(value) => setRows(Math.min(Math.max(whole(value), 2), 8))} step={1} min={2} max={8} />
            )}
          </>
        )}
        {(mode === 'line' || mode === 'arc') && (
          <>
            <NumberInput label="Počet subov" value={count} onChange={(value) => setCount(Math.min(Math.max(whole(value), 2), 32))} step={1} min={2} max={32} />
            <NumberInput label="Rozostup (stred–stred)" unit="m" value={lineSpacing} onChange={setLineSpacing} min={0.1} max={20} />
            <NumberInput
              label="Šírka radu (krajný – krajný sub)"
              unit="m"
              value={(count - 1) * lineSpacing}
              onChange={(width) => setLineSpacing(Math.max(width / (count - 1), 0.1))}
              min={0.1}
              max={200}
              hint="Zmeníte šírku a rozostup sa dopočíta (a naopak)"
            />
            {mode === 'line' ? (
              <NumberInput label="Najvyššia frekvencia subov" unit="Hz" value={upper} onChange={setUpper} step={1} min={30} max={200} hint="Zvyčajne crossover s topmi" />
            ) : (
              <NumberInput label="Uhol oblúka" unit="°" value={angle} onChange={setAngle} step={5} min={5} max={180} hint="Širší uhol = širšie pokrytie, menej basu v strede" />
            )}
          </>
        )}
      </div>

      {mode !== 'tower' && (
        <CollapsibleSection id="delay.sub" title="Sub" summary={box ? `${box.name} · ${fmt(box.widthCm, 0)}×${fmt(box.depthCm, 0)} cm` : 'bez rozmerov'}>
        <div className="grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-4">
          <SelectField
            label="Sub"
            className="sm:col-span-4"
            value={subId}
            onChange={(event) => {
              const item = subChoices.find((candidate) => candidate.id === event.target.value)
              setSubId(event.target.value)
              const width = item?.attributes.boxWidthCm ?? null
              const depth = item?.attributes.boxDepthCm ?? null
              setBoxW(width)
              setBoxD(depth)
              setBoxH(item?.attributes.boxHeightCm ?? null)
              setOwnMs(item?.attributes.subDelayMs ?? 0)
              if (width && depth && mode === 'cardioid') setSpacing(round(cardioidSpacing({ depthCm: depth }, layout, gap), 3))
            }}
          >
            <option value="">— vlastné rozmery / bez rozmerov —</option>
            {subChoices.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.attributes.boxWidthCm !== undefined && item.attributes.boxDepthCm !== undefined
                  ? ` · ${item.attributes.boxWidthCm}×${item.attributes.boxDepthCm} cm`
                  : ' · bez rozmerov'}
              </option>
            ))}
          </SelectField>
          <NumberInput key={`w-${subId}`} label="Šírka boxu" unit="cm" value={boxW ?? 0} onChange={(value) => setBoxW(value || null)} step={1} max={500} />
          <NumberInput key={`d-${subId}`} label="Hĺbka boxu" unit="cm" value={boxD ?? 0} onChange={(value) => setBoxD(value || null)} step={1} max={500} />
          <NumberInput key={`h-${subId}`} label="Výška boxu" unit="cm" value={boxH ?? 0} onChange={(value) => setBoxH(value || null)} step={1} max={500} />
          <NumberInput
            key={`o-${subId}`}
            label="Vlastný delay subu"
            unit="ms"
            value={ownMs}
            onChange={setOwnMs}
            step={0.1}
            max={200}
            hint="Hornový sub / slimák hrá neskôr (dlhšia cesta zvuku). Údaj výrobcu alebo z merania."
          />
          <p className="self-end text-xs text-muted-foreground sm:pb-3">
            {subChoices.length === 0
              ? 'Suby z techniky sa ukážu, keď majú typ Subwoofer. Rozmery boxu sa zadávajú pri technike.'
              : 'Rozmery sa dajú prepísať. Akustický stred berieme na čele boxu.'}
          </p>
        </div>
        </CollapsibleSection>
      )}

      {mode === 'align' &&
        (() => {
          const result = alignWithSubDelay(toTops, toSubs, ownMs, temp)
          return (
            <Result
              title={result.delayed === null ? 'Topy a suby prídu naraz' : result.delayed === 'tops' ? 'Oneskorte TOPY o' : 'Oneskorte SUBY o'}
              ms={result.ms}
              note={`${ownMs > 0 ? `Započítaný vlastný delay subu ${fmt(ownMs)} ms. ` : ''}Výpočet platí pre zvolené miesto počúvania. Doladiť sa dá meraním (napr. Smaart) okolo crossoveru; pri zmene teploty sa čas mierne mení.`}
            />
          )
        })()}

      {mode === 'tower' && (
        <Result
          title="Delay pre vežu"
          ms={towerDelay(towerDistance, temp, haas)}
          note={`${fmt(towerDelay(towerDistance, temp))} ms za vzdialenosť + ${fmt(haas, 0)} ms predstih hlavného PA.`}
        />
      )}

      {mode === 'cardioid' &&
        (() => {
          const subs = cardioid(spacing, temp, frontCount, backCount, layout, box ? box.widthCm / 100 : 1)
          return (
            <div className="flex flex-col gap-4">
              {box && Math.abs(spacing - cardioidSpacing(box, layout, gap)) > 0.005 && (
                <Warning
                  action={
                    <Button variant="outline" size="sm" onClick={() => setSpacing(round(cardioidSpacing(box, layout, gap), 3))}>
                      Použiť {fmt(cardioidSpacing(box, layout, gap))} m
                    </Button>
                  }
                >
                  Pri uložení „{CARDIOID_LAYOUT_LABELS[layout].toLowerCase()}“ a hĺbke boxu {fmt(box.depthCm, 0)} cm vychádza rozostup čiel{' '}
                  {fmt(cardioidSpacing(box, layout, gap))} m, zadaný je {fmt(spacing)} m.
                </Warning>
              )}
              {layout !== 'behind' && (
                <p className="text-sm text-muted-foreground">
                  V nákrese stoja suby v jednom rade{layout === 'stack' ? ' (v skutočnosti na sebe)' : ''}; otočený hrá dozadu.
                </p>
              )}
              <Diagram subs={subs} box={box} />
              <SubTable subs={subs} ownMs={ownMs} />
              <ResponseTable target={target} response={(frequency) => cardioidResponse(frontCount, backCount, spacing, frequency, temp)} />
              <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">
                Pri tomto rozostupe pomáhajú zadné suby dopredu najviac okolo {fmt(speedOfSound(temp) / (4 * spacing), 0)} Hz a nad{' '}
                {fmt(speedOfSound(temp) / (2 * spacing), 0)} Hz už dopredu ubíjajú – crossover s topmi držte pod touto hranicou.{' '}
              </p>
              <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">
                Zadné suby sú otočené dozadu, všetky majú rovnaký delay a otočenú polaritu a delay o čas, za ktorý zvuk prejde rozostup. Dopredu sa suby sčítajú, dozadu na pódium
                sa vyrušia (najviac okolo {fmt(speedOfSound(temp) / (4 * spacing), 0)} Hz). Rozostup merajte medzi akustickými stredmi (zvyčajne čelá
                reproduktorov). Pomer predných a zadných a level zadných doladíte meraním za stackom (na pódiu).
              </p>
            </div>
          )
        })()}

      {mode === 'endfire' &&
        (() => {
          const subs = endFire(rows, spacing, temp)
          return (
            <div className="flex flex-col gap-4">
              {box && spacing < minSpacing(box, 'row') - 0.005 && (
                <Warning
                  action={
                    <Button variant="outline" size="sm" onClick={() => setSpacing(minSpacing(box, 'row'))}>
                      Tesne za sebou ({fmt(minSpacing(box, 'row'))} m)
                    </Button>
                  }
                >
                  Box je hlboký {fmt(box.depthCm, 0)} cm – rady sa pri rozostupe {fmt(spacing)} m nezmestia za seba.
                </Warning>
              )}
              <Diagram subs={subs} box={box} />
              <SubTable subs={subs} ownMs={ownMs} />
              <ResponseTable target={target} response={(frequency) => endFireResponse(rows, spacing, frequency, temp)} />
              <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">
                Všetky rady hrajú dopredu. Zadný rad hrá bez delay, každý rad pred ním sa oneskorí o rozostup od zadného radu. Dopredu sa sčítajú,
                dozadu sa rušia. Najlepšie funguje pri rozostupe λ/4 cieľovej frekvencie.
              </p>
            </div>
          )
        })()}

      {mode === 'line' &&
        (() => {
          const subs = straightLine(count, lineSpacing)
          const limit = maxLineSpacing(upper, temp)
          return (
            <div className="flex flex-col gap-4">
              {box && lineSpacing < minSpacing(box, 'side') - 0.005 && (
                <Warning
                  action={
                    <Button variant="outline" size="sm" onClick={() => setLineSpacing(minSpacing(box, 'side'))}>
                      Tesne vedľa seba ({fmt(minSpacing(box, 'side'))} m)
                    </Button>
                  }
                >
                  Box je široký {fmt(box.widthCm, 0)} cm – suby sa pri rozostupe {fmt(lineSpacing)} m nezmestia vedľa seba.
                </Warning>
              )}
              {box && (
                <p className="text-sm text-muted-foreground">
                  Rad zaberie {fmt(physicalWidth(count, lineSpacing, box))} m od kraja po kraj (medzi boxmi {fmt(Math.max(lineSpacing - box.widthCm / 100, 0))} m).
                </p>
              )}
              <Diagram subs={subs} box={box} />
              <div className={cn('rounded-xl border p-4 text-sm', lineSpacing > limit ? 'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40' : 'bg-surface')}>
                <p className="font-medium">
                  Šírka radu {fmt((count - 1) * lineSpacing)} m · rozostup {fmt(lineSpacing)} m · najviac odporúčané {fmt(limit)} m (λ/2 pri {fmt(upper, 0)} Hz)
                </p>
                <p className="mt-1 text-muted-foreground">
                  {lineSpacing > limit
                    ? 'Rozostup je väčší ako pol vlnovej dĺžky: suby sa nesčítajú ako jeden zdroj a vzniknú diery a „power alley“. Posuňte ich bližšie alebo použite arc delay.'
                    : 'Suby sa správajú ako jeden zdroj. Rovný rad je však v strede veľmi silný a do strán úzky – na širšie pokrytie použite arc delay.'}
                </p>
                <p className="mt-1 text-muted-foreground">Vlnová dĺžka pri {fmt(upper, 0)} Hz: {fmt(wavelength(upper, temp))} m.</p>
              </div>
            </div>
          )
        })()}

      {mode === 'arc' &&
        (() => {
          const { radius, subs } = arcDelay(count, lineSpacing, angle, temp)
          return (
            <div className="flex flex-col gap-4">
              {box && lineSpacing < minSpacing(box, 'side') - 0.005 && (
                <Warning
                  action={
                    <Button variant="outline" size="sm" onClick={() => setLineSpacing(minSpacing(box, 'side'))}>
                      Tesne vedľa seba ({fmt(minSpacing(box, 'side'))} m)
                    </Button>
                  }
                >
                  Box je široký {fmt(box.widthCm, 0)} cm – suby sa pri rozostupe {fmt(lineSpacing)} m nezmestia vedľa seba.
                </Warning>
              )}
              {box && (
                <p className="text-sm text-muted-foreground">
                  Rad zaberie {fmt(physicalWidth(count, lineSpacing, box))} m od kraja po kraj (medzi boxmi {fmt(Math.max(lineSpacing - box.widthCm / 100, 0))} m).
                </p>
              )}
              <Diagram subs={subs} box={box} />
              <SubTable subs={subs} ownMs={ownMs} />
              <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">
                Suby stoja v rovnom rade; delay ich „ohne“ do oblúka s polomerom {fmt(radius)} m a uhlom {fmt(angle, 0)}°. Stred hrá bez delay, ku krajom
                delay rastie, akoby boli suby fyzicky vzadu na oblúku (nákres ukazuje tento virtuálny oblúk). Rovnaké čísla zadajte symetricky vľavo aj
                vpravo.
              </p>
            </div>
          )
        })()}
    </>
  )
}
