// Delay kalkulačka pre suby a zvuk: rýchlosť zvuku podľa teploty, zarovnanie, cardioid, end-fire, rad a arc.

/** Rýchlosť zvuku vo vzduchu v m/s pri teplote v °C. */
export function speedOfSound(tempC: number) {
  return 331.3 + 0.606 * tempC
}

/** Za koľko ms prejde zvuk danú vzdialenosť. */
export function delayMs(distanceM: number, tempC: number) {
  return (distanceM / speedOfSound(tempC)) * 1000
}

/** Vlnová dĺžka v metroch. */
export function wavelength(frequencyHz: number, tempC: number) {
  return speedOfSound(tempC) / frequencyHz
}

export function samples(ms: number, rate = 48_000) {
  return Math.round((ms * rate) / 1000)
}

export const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits

export type SubDelay = {
  label: string
  /** Poloha v metroch: x zľava doprava, y dopredu k publiku (pre nákres). */
  x: number
  y: number
  ms: number
  /** Otočená polarita (zadný sub v cardioide). */
  inverted?: boolean
  /** Otočený dozadu. */
  facingBack?: boolean
}

/**
 * Zarovnanie dvoch zdrojov (topy a suby, alebo hlavný PA a delay veža) na mieste počúvania:
 * oneskorí sa ten bližší o rozdiel vzdialeností.
 */
export function alignment(distanceA: number, distanceB: number, tempC: number) {
  const ms = delayMs(Math.abs(distanceA - distanceB), tempC)
  return { ms, delayed: distanceA === distanceB ? null : distanceA < distanceB ? ('a' as const) : ('b' as const) }
}

/**
 * Delay veža: oneskorenie o vzdialenosť od hlavného PA, plus `haasMs`,
 * aby hlavný PA prišiel o chlp skôr a zvuk sa stále zdal ísť z pódia.
 */
export function towerDelay(distanceM: number, tempC: number, haasMs = 0) {
  return delayMs(distanceM, tempC) + haasMs
}

/** Odporúčaná vzdialenosť pre cardioid / end-fire: štvrtina vlnovej dĺžky cieľovej frekvencie. */
export function quarterWave(frequencyHz: number, tempC: number) {
  return wavelength(frequencyHz, tempC) / 4
}

/**
 * Cardioid: predné suby hrajú normálne, zadný (otočený dozadu) je posunutý o `spacingM` dozadu,
 * má otočenú polaritu a oneskorenie o čas, za ktorý zvuk prejde túto vzdialenosť.
 * Dopredu sa sčítajú, dozadu (na pódium) sa vyrušia.
 */
export function cardioid(spacingM: number, tempC: number, frontCount = 2, backCount = 1, layout: CardioidLayout = 'behind', pitchM = 1): SubDelay[] {
  const backLabel = (index: number) => (backCount === 1 ? 'Otočený' : `Otočený ${index + 1}`)
  const ms = delayMs(spacingM, tempC)
  if (layout !== 'behind') {
    // Jeden rad (alebo stack): otočené suby rovnomerne medzi prednými, napr. P O P pri 2 : 1.
    const total = frontCount + backCount
    const backAt = new Set(Array.from({ length: backCount }, (_, index) => Math.min(total - 1, Math.round(((index + 0.5) * total) / backCount - 0.5))))
    let front = 0
    let back = 0
    return Array.from({ length: total }, (_, index) => {
      const x = (index - (total - 1) / 2) * pitchM
      if (backAt.has(index) && back < backCount) return { label: backLabel(back++), x, y: 0, ms, inverted: true, facingBack: true }
      return { label: `Predný ${++front}`, x, y: 0, ms: 0 }
    })
  }
  const front = Array.from({ length: frontCount }, (_, index) => ({ label: `Predný ${index + 1}`, x: (index - (frontCount - 1) / 2) * pitchM, y: spacingM, ms: 0 }))
  const back = Array.from({ length: backCount }, (_, index) => ({
    label: backLabel(index),
    x: (index - (backCount - 1) / 2) * pitchM,
    y: 0,
    ms,
    inverted: true,
    facingBack: true,
  }))
  return [...front, ...back]
}

/** Ako stojí cardioid: otočené suby za prednými, v jednom rade s nimi, alebo na nich (stack). */
export type CardioidLayout = 'behind' | 'side' | 'stack'

export const CARDIOID_LAYOUT_LABELS: Record<CardioidLayout, string> = {
  behind: 'Za sebou (otočený vzadu)',
  side: 'Vedľa seba v rade',
  stack: 'Na sebe (stack)',
}

/**
 * End-fire: rady subov za sebou (všetky otočené dopredu). Zadný rad hrá prvý, každý ďalší rad
 * dopredu sa oneskorí o čas, za ktorý k nemu zvuk zo zadného radu dorazí.
 */
export function endFire(rows: number, spacingM: number, tempC: number): SubDelay[] {
  return Array.from({ length: rows }, (_, index) => {
    const fromBack = rows - 1 - index
    return { label: index === 0 ? 'Rad 1 (predný)' : index === rows - 1 ? `Rad ${index + 1} (zadný)` : `Rad ${index + 1}`, x: 0, y: fromBack * spacingM, ms: delayMs(fromBack * spacingM, tempC) }
  })
}

/** Rovný rad subov vedľa seba, bez delay. */
export function straightLine(count: number, spacingM: number): SubDelay[] {
  return Array.from({ length: count }, (_, index) => ({ label: `Sub ${index + 1}`, x: index * spacingM, y: 0, ms: 0 }))
}

/**
 * Najväčšia rozumná medzera v rade, aby sa suby správali ako jeden zdroj: pol vlnovej dĺžky
 * najvyššej frekvencie subov. Väčšie medzery robia „power alley“ a diery v pokrytí.
 */
export function maxLineSpacing(upperHz: number, tempC: number) {
  return wavelength(upperHz, tempC) / 2
}

/**
 * Arc delay: rovný rad subov sa oneskorením „ohne“ do oblúka s celkovým uhlom `angleDeg`.
 * Krajné suby sa oneskoria, akoby boli fyzicky vzadu na oblúku; stred hrá bez delay.
 * Širší uhol = širšie pokrytie a menej basu do stredu.
 */
export function arcDelay(count: number, spacingM: number, angleDeg: number, tempC: number) {
  const length = (count - 1) * spacingM
  const half = (Math.min(Math.max(angleDeg, 1), 180) * Math.PI) / 360
  const radius = length > 0 ? length / 2 / Math.sin(half) : 0
  const subs: SubDelay[] = Array.from({ length: count }, (_, index) => {
    const x = (index - (count - 1) / 2) * spacingM
    const setBack = radius > 0 ? radius - Math.sqrt(Math.max(radius * radius - x * x, 0)) : 0
    return { label: `Sub ${index + 1}`, x, y: -setBack, ms: delayMs(setBack, tempC) }
  })
  return { radius, subs }
}

/** Rozmery subu v cm (šírka × hĺbka × výška). */
export type SubBox = { name: string; widthCm: number; depthCm: number; heightCm: number | null }

/**
 * Rozostup akustických stredov pri cardioide z rozmerov boxu. Akustický stred berieme na čele
 * (membráne): v jednom rade alebo v stacku (boxy zarovnané, otočený hrá dozadu) je to hĺbka boxu;
 * keď otočený stojí tesne za prednými, dve hĺbky. `gapM` je medzera medzi boxmi za sebou.
 */
export function cardioidSpacing(box: Pick<SubBox, 'depthCm'>, layout: CardioidLayout, gapM = 0) {
  const depth = box.depthCm / 100
  return layout === 'behind' ? 2 * depth + gapM : depth
}

/** Najmenší možný rozostup: suby tesne vedľa seba (rad) alebo za sebou (end-fire). */
export function minSpacing(box: Pick<SubBox, 'widthCm' | 'depthCm'>, layout: 'side' | 'row') {
  return (layout === 'side' ? box.widthCm : box.depthCm) / 100
}

/** Skutočná šírka radu od kraja po kraj (vrátane polovíc krajných boxov). */
export function physicalWidth(count: number, spacingM: number, box: Pick<SubBox, 'widthCm'> | null) {
  return (count - 1) * spacingM + (box ? box.widthCm / 100 : 0)
}

/** Súčet zdrojov s danými časovými posunmi (s) a znamienkami pri frekvencii, ako násobok jedného zdroja. */
function sumMagnitude(sources: { seconds: number; sign: 1 | -1 }[], frequencyHz: number) {
  let re = 0
  let im = 0
  for (const source of sources) {
    const phase = -2 * Math.PI * frequencyHz * source.seconds
    re += source.sign * Math.cos(phase)
    im += source.sign * Math.sin(phase)
  }
  return Math.hypot(re, im)
}

const toDb = (ratio: number) => (ratio <= 1e-6 ? -60 : Math.max(-60, 20 * Math.log10(ratio)))

/**
 * Odhad pre cardioid (ideálne bodové zdroje, rovnaký level): koľko dB hrá dopredu a dozadu
 * oproti samotným predným subom. Dozadu sa zadné suby (otočená polarita, delay) odčítajú;
 * dopredu prídu o 2 × rozostup neskôr – najviac pomáhajú okolo c/(4d), nad c/(2d) dopredu rušia.
 */
export function cardioidResponse(frontCount: number, backCount: number, spacingM: number, frequencyHz: number, tempC: number) {
  const t = spacingM / speedOfSound(tempC)
  const front = Array.from({ length: frontCount }, () => ({ seconds: 0, sign: 1 as const }))
  const backForward = Array.from({ length: backCount }, () => ({ seconds: 2 * t, sign: -1 as const }))
  const backRear = Array.from({ length: backCount }, () => ({ seconds: 0, sign: -1 as const }))
  return {
    frontDb: toDb(sumMagnitude([...front, ...backForward], frequencyHz) / frontCount),
    rearDb: toDb(sumMagnitude([...front, ...backRear], frequencyHz) / frontCount),
  }
}

/**
 * Odhad pre end-fire: dopredu sa rady sčítajú vždy (+20·log N), dozadu sa každý ďalší rad
 * oneskorí o 2 × rozostup. Vracia dB oproti jednému radu.
 */
export function endFireResponse(rows: number, spacingM: number, frequencyHz: number, tempC: number) {
  const t = spacingM / speedOfSound(tempC)
  const rear = Array.from({ length: rows }, (_, index) => ({ seconds: 2 * index * t, sign: 1 as const }))
  return { frontDb: toDb(rows), rearDb: toDb(sumMagnitude(rear, frequencyHz)) }
}

/** Frekvencie, pre ktoré ukazujeme tabuľku odozvy. */
export const RESPONSE_FREQUENCIES = [31.5, 40, 50, 63, 80, 100, 125]

/**
 * Vlastné oneskorenie subov (hornový sub / „slimák“ hrá neskôr): čo nastaviť v procesore, aby zvuk
 * zo všetkých subov prišiel tak, ako vyšlo vo výpočte. Sub s väčším vlastným oneskorením dostane menej;
 * celé sa to posunie tak, aby nikde nevyšlo záporné číslo.
 */
export function compensateOwnDelay(subs: { ms: number; ownMs: number }[]) {
  if (subs.length === 0) return []
  const shift = Math.max(0, ...subs.map((sub) => sub.ownMs - sub.ms))
  return subs.map((sub) => sub.ms + shift - sub.ownMs)
}

/**
 * Zarovnanie topov a subov so započítaním vlastného oneskorenia subu.
 * Vráti, ktorý zdroj oneskoriť a o koľko ms (null = netreba).
 */
export function alignWithSubDelay(toTops: number, toSubs: number, subOwnMs: number, tempC: number) {
  // Kladné = suby prídu neskôr ako topy.
  const subsLate = delayMs(toSubs - toTops, tempC) + subOwnMs
  if (Math.abs(subsLate) < 0.005) return { delayed: null, ms: 0 }
  return subsLate > 0 ? { delayed: 'tops' as const, ms: subsLate } : { delayed: 'subs' as const, ms: -subsLate }
}
