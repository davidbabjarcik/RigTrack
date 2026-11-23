// HF frekvenčný plán: kontrola odstupov, intermodulácií 3. rádu (2 aj 3 vysielače), voliteľne 5. rádu (2 vysielače),
// TV kanály (DVB-T2, 8 MHz, UHF 21–48 = 470–694 MHz) a návrh frekvencií. Všetko v kHz (celé čísla – bez chýb
// zaokrúhlenia), na obrazovke v MHz s tromi desatinnými miestami.

export type RfKind = 'mic' | 'iem' | 'other'
export type RfChannel = { id: string; name: string; kind: RfKind; equipment_id: string | null; min_mhz: number; max_mhz: number; freq_mhz: number | null; locked: boolean }
export type RfSettings = { spacing_khz: number; imd3_khz: number; imd5_khz: number; fifth: boolean; step_khz: number }

export const DEFAULT_SETTINGS: RfSettings = { spacing_khz: 350, imd3_khz: 100, imd5_khz: 50, fifth: false, step_khz: 25 }
export const RF_KIND_LABELS: Record<RfKind, string> = { mic: 'Mikrofón', iem: 'IEM', other: 'Iné' }

export const TV_FIRST = 21
export const TV_LAST = 48
/** UHF TV kanál n (8 MHz): dolná a horná hranica v kHz. Kanál 21 = 470–478 MHz. */
export const tvRange = (channel: number) => ({ lo: (302 + 8 * channel) * 1000, hi: (310 + 8 * channel) * 1000 })
export const tvChannelOf = (khz: number) => {
  const channel = Math.floor((khz / 1000 - 302) / 8)
  return channel >= TV_FIRST && channel <= TV_LAST ? channel : null
}

export const toKhz = (mhz: number) => Math.round(mhz * 1000)
export const toMhz = (khz: number) => khz / 1000
export const formatMhz = (khz: number) => (khz / 1000).toFixed(3)

export type Product = { khz: number; order: 3 | 5; sources: string[] }

/** Intermodulačné produkty: 2f1−f2 (3. rád, 2 vysielače), f1+f2−f3 (3. rád, 3 vysielače), 3f1−2f2 (5. rád). */
export function products(carriers: { id: string; khz: number }[], fifth: boolean): Product[] {
  const result: Product[] = []
  for (const a of carriers) {
    for (const b of carriers) {
      if (a.id === b.id) continue
      result.push({ khz: 2 * a.khz - b.khz, order: 3, sources: [a.id, b.id] })
      if (fifth) result.push({ khz: 3 * a.khz - 2 * b.khz, order: 5, sources: [a.id, b.id] })
    }
  }
  for (let i = 0; i < carriers.length; i++) {
    for (let j = i + 1; j < carriers.length; j++) {
      for (const c of carriers) {
        if (c.id === carriers[i].id || c.id === carriers[j].id) continue
        result.push({ khz: carriers[i].khz + carriers[j].khz - c.khz, order: 3, sources: [carriers[i].id, carriers[j].id, c.id] })
      }
    }
  }
  return result
}

export type Issue = { kind: 'spacing' | 'imd3' | 'imd5' | 'tv' | 'band' | 'missing'; text: string }

/** Problémy každého kanála: blízko iného vysielača, na intermodulácii, v zakázanom TV kanáli, mimo pásma. */
export function analyze(channels: RfChannel[], settings: RfSettings, excludedTv: number[]): Map<string, Issue[]> {
  const issues = new Map<string, Issue[]>(channels.map((channel) => [channel.id, []]))
  const add = (id: string, issue: Issue) => issues.get(id)!.push(issue)
  const name = (id: string) => channels.find((channel) => channel.id === id)?.name || '?'
  const carriers = channels.filter((channel) => channel.freq_mhz !== null).map((channel) => ({ id: channel.id, khz: toKhz(channel.freq_mhz!) }))
  for (const channel of channels) {
    if (channel.freq_mhz === null) add(channel.id, { kind: 'missing', text: 'Bez frekvencie' })
  }
  for (const carrier of carriers) {
    const channel = channels.find((item) => item.id === carrier.id)!
    if (carrier.khz < toKhz(channel.min_mhz) || carrier.khz > toKhz(channel.max_mhz)) add(carrier.id, { kind: 'band', text: `Mimo pásma ${channel.min_mhz}–${channel.max_mhz} MHz` })
    const tv = tvChannelOf(carrier.khz)
    if (tv !== null && excludedTv.includes(tv)) add(carrier.id, { kind: 'tv', text: `V TV kanáli ${tv} (vysiela sa v mieste akcie)` })
    for (const other of carriers) {
      if (other.id !== carrier.id && Math.abs(other.khz - carrier.khz) < settings.spacing_khz) add(carrier.id, { kind: 'spacing', text: `Blízko „${name(other.id)}“ (${Math.abs(other.khz - carrier.khz)} kHz)` })
    }
  }
  for (const product of products(carriers, settings.fifth)) {
    const window = product.order === 3 ? settings.imd3_khz : settings.imd5_khz
    for (const carrier of carriers) {
      if (product.sources.includes(carrier.id) || Math.abs(product.khz - carrier.khz) > window) continue
      const kind = product.order === 3 ? 'imd3' : 'imd5'
      const list = issues.get(carrier.id)!
      const text = `IM ${product.order}. rádu z ${product.sources.map(name).join(' + ')} (${formatMhz(product.khz)} MHz)`
      if (!list.some((issue) => issue.text === text)) list.push({ kind, text })
    }
  }
  return issues
}

/** Je kandidátna frekvencia kompatibilná s už pridelenými (odstup, intermodulácie oboma smermi, TV kanály)? */
function fits(khz: number, assigned: number[], products3: number[], products5: number[], settings: RfSettings, excludedTv: number[]) {
  const tv = tvChannelOf(khz)
  if (tv !== null && excludedTv.includes(tv)) return false
  if (assigned.some((other) => Math.abs(other - khz) < settings.spacing_khz)) return false
  if (products3.some((product) => Math.abs(product - khz) <= settings.imd3_khz)) return false
  if (settings.fifth && products5.some((product) => Math.abs(product - khz) <= settings.imd5_khz)) return false
  // Nové produkty s kandidátom nesmú trafiť už pridelené frekvencie.
  const hits = (product: number, window: number, skip: number[]) => assigned.some((other, index) => !skip.includes(index) && Math.abs(other - product) <= window)
  for (let i = 0; i < assigned.length; i++) {
    if (hits(2 * khz - assigned[i], settings.imd3_khz, [i]) || hits(2 * assigned[i] - khz, settings.imd3_khz, [i])) return false
    if (settings.fifth && (hits(3 * khz - 2 * assigned[i], settings.imd5_khz, [i]) || hits(3 * assigned[i] - 2 * khz, settings.imd5_khz, [i]))) return false
    for (let j = 0; j < assigned.length; j++) {
      if (j === i) continue
      if (j > i && hits(assigned[i] + assigned[j] - khz, settings.imd3_khz, [i, j])) return false
      if (hits(khz + assigned[i] - assigned[j], settings.imd3_khz, [i, j])) return false
    }
  }
  return true
}

/**
 * Návrh frekvencií pre kanály bez frekvencie (zamknuté a zadané ostanú). Kanály s najužším pásmom idú prvé,
 * v pásme sa hľadá od spodku po krokoch (25 kHz). Vráti nové kanály a zoznam tých, pre ktoré sa nič nenašlo.
 */
export function suggest(channels: RfChannel[], settings: RfSettings, excludedTv: number[]): { channels: RfChannel[]; failed: string[] } {
  const fixed = channels.filter((channel) => channel.freq_mhz !== null)
  const assigned = fixed.map((channel) => toKhz(channel.freq_mhz!))
  const carriers = () => assigned.map((khz, index) => ({ id: String(index), khz }))
  let all = products(carriers(), settings.fifth)
  const result = new Map(channels.map((channel) => [channel.id, channel]))
  const failed: string[] = []
  const open = channels.filter((channel) => channel.freq_mhz === null).sort((a, b) => a.max_mhz - a.min_mhz - (b.max_mhz - b.min_mhz))
  for (const channel of open) {
    const step = Math.max(5, settings.step_khz)
    const lo = Math.ceil(toKhz(channel.min_mhz) / step) * step
    const hi = toKhz(channel.max_mhz)
    const p3 = all.filter((product) => product.order === 3).map((product) => product.khz)
    const p5 = all.filter((product) => product.order === 5).map((product) => product.khz)
    let found: number | null = null
    for (let khz = lo; khz <= hi; khz += step) {
      if (fits(khz, assigned, p3, p5, settings, excludedTv)) {
        found = khz
        break
      }
    }
    if (found === null) {
      failed.push(channel.id)
      continue
    }
    assigned.push(found)
    all = products(carriers(), settings.fifth)
    result.set(channel.id, { ...channel, freq_mhz: toMhz(found) })
  }
  return { channels: channels.map((channel) => result.get(channel.id)!), failed }
}

/** CSV frekvenčného plánu (všeobecný formát RigTracku, bodkočiarka, UTF-8 s BOM). */
export function rfCsv(channels: RfChannel[], equipmentName: (id: string) => string | undefined) {
  const cell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`
  const rows = [['Názov', 'Druh', 'Technika', 'Frekvencia (MHz)', 'Pásmo od (MHz)', 'Pásmo do (MHz)', 'TV kanál']]
  for (const channel of channels) {
    const khz = channel.freq_mhz === null ? null : toKhz(channel.freq_mhz)
    rows.push([channel.name, RF_KIND_LABELS[channel.kind], channel.equipment_id ? (equipmentName(channel.equipment_id) ?? '') : '', khz === null ? '' : formatMhz(khz), String(channel.min_mhz), String(channel.max_mhz), khz === null ? '' : String(tvChannelOf(khz) ?? '')])
  }
  return '﻿' + rows.map((row) => row.map(cell).join(';')).join('\r\n')
}
