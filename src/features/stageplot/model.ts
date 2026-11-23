// Stage plán: pohľad zhora v mierke. Súradnice v metroch – x zľava doprava (ako to vidí publikum), y od zadnej
// steny pódia k publiku (publikum je dole). Položka = stred, rozmer w × d a otočenie v stupňoch.

export const STAGE_KINDS = ['drums', 'riser', 'amp_guitar', 'amp_bass', 'keys', 'vocal', 'mic', 'wedge', 'sidefill', 'iem', 'di', 'stagebox', 'power', 'person', 'dj', 'label'] as const
export type StageKind = (typeof STAGE_KINDS)[number]

export type KindInfo = { label: string; code: string; w: number; d: number; shape: 'rect' | 'round' | 'wedge' | 'text' | 'hatch' }

export const KIND_INFO: Record<StageKind, KindInfo> = {
  drums: { label: 'Bicie', code: 'BICIE', w: 2, d: 1.8, shape: 'round' },
  riser: { label: 'Rizer', code: 'RIZER', w: 2, d: 2, shape: 'hatch' },
  amp_guitar: { label: 'Gitarový aparát', code: 'GIT', w: 0.7, d: 0.35, shape: 'rect' },
  amp_bass: { label: 'Basový aparát', code: 'BAS', w: 0.8, d: 0.5, shape: 'rect' },
  keys: { label: 'Klávesy', code: 'KEYS', w: 1.4, d: 0.6, shape: 'rect' },
  vocal: { label: 'Spevák / mikrofón', code: 'VOC', w: 0.45, d: 0.45, shape: 'round' },
  mic: { label: 'Mikrofón na stojane', code: 'MIC', w: 0.3, d: 0.3, shape: 'round' },
  wedge: { label: 'Monitor (wedge)', code: 'MON', w: 0.6, d: 0.45, shape: 'wedge' },
  sidefill: { label: 'Sidefill', code: 'SF', w: 0.8, d: 0.8, shape: 'rect' },
  iem: { label: 'IEM vysielač', code: 'IEM', w: 0.45, d: 0.3, shape: 'rect' },
  di: { label: 'DI box', code: 'DI', w: 0.25, d: 0.2, shape: 'rect' },
  stagebox: { label: 'Stagebox', code: 'SB', w: 0.6, d: 0.4, shape: 'rect' },
  power: { label: 'Elektrina 230 V', code: '230V', w: 0.35, d: 0.25, shape: 'rect' },
  person: { label: 'Hudobník', code: '', w: 0.5, d: 0.5, shape: 'round' },
  dj: { label: 'DJ stôl', code: 'DJ', w: 1.8, d: 0.8, shape: 'rect' },
  label: { label: 'Popis', code: '', w: 1.2, d: 0.3, shape: 'text' },
}

export type StageItem = { id: string; kind: StageKind; x: number; y: number; rot: number; w: number; d: number; label: string; channel: number | null }

export type StagePlot = { widthM: number; depthM: number; items: StageItem[]; note: string; version: number; updatedAt: string | null }

export const EMPTY_PLOT: StagePlot = { widthM: 10, depthM: 6, items: [], note: '', version: 0, updatedAt: null }

/** Zaokrúhlenie na 5 cm (pohodlné ťahanie, čitateľné rozmery). */
export const snap = (value: number) => Math.round(value * 20) / 20

export function newItem(kind: StageKind, plot: Pick<StagePlot, 'widthM' | 'depthM' | 'items'>): StageItem {
  const info = KIND_INFO[kind]
  // Nové položky idú doprostred, každá ďalšia kúsok vedľa (aby sa neprekryli úplne).
  const offset = (plot.items.length % 8) * 0.3
  return {
    id: `i${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    kind,
    x: snap(Math.min(plot.widthM - info.w / 2, plot.widthM / 2 + offset)),
    y: snap(Math.min(plot.depthM - info.d / 2, plot.depthM / 2 + offset / 2)),
    rot: 0,
    w: info.w,
    d: info.d,
    label: kind === 'label' ? 'Popis' : '',
    channel: null,
  }
}

/** Stred položky vo vnútri pódia (povolí presah do 1 m – napr. sidefill vedľa pódia). */
export function clampItem(item: StageItem, plot: Pick<StagePlot, 'widthM' | 'depthM'>): StageItem {
  return { ...item, x: snap(Math.max(-1, Math.min(plot.widthM + 1, item.x))), y: snap(Math.max(-1, Math.min(plot.depthM + 1, item.y))) }
}

/** Text na položke: popis, inak názov kanála z input listu, inak skratka druhu. */
export function itemText(item: StageItem, channelName: (channel: number) => string | undefined) {
  const name = item.channel ? channelName(item.channel) : undefined
  const main = item.label || name || KIND_INFO[item.kind].code
  return { main, channel: item.channel ? `CH ${item.channel}` : '' }
}

/** Mierka tlače: koľko metrov skutočnosti je 1 meter na papieri (napr. 1 : 50). */
export function printScale(pxPerMeter: number, canvasWidthPx: number, paperWidthMm: number) {
  const mmPerMeter = (pxPerMeter / canvasWidthPx) * paperWidthMm
  const exact = 1000 / mmPerMeter
  const nice = [10, 20, 25, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500].find((value) => value >= exact) ?? Math.ceil(exact / 100) * 100
  return { exact, nice }
}

/** Položky s kanálom z input listu – pre legendu (kanál, názov kanála, druh). */
export function channelLegend(items: StageItem[], channelName: (channel: number) => string | undefined) {
  return items
    .filter((item) => item.channel)
    .map((item) => ({ channel: item.channel!, name: channelName(item.channel!) ?? '', kind: KIND_INFO[item.kind].label, label: item.label }))
    .sort((a, b) => a.channel - b.channel)
}

type Row = { width_m: number | string; depth_m: number | string; items: StageItem[]; note: string; version: number; updated_at: string }
export const fromRow = (row: Row): StagePlot => ({ widthM: Number(row.width_m), depthM: Number(row.depth_m), items: row.items ?? [], note: row.note, version: row.version, updatedAt: row.updated_at })
