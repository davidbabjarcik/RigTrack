import { describe, expect, it } from 'vitest'
import { compactRanges, freePlace, newSlot, overlaps, rackSummary, rackWarnings, type FitSlot, type Sources } from './fit'

const sources: Sources = {
  equipment: [
    { id: 'amp', name: 'Ukážkový zosilňovač', manufacturer: 'Ukážka', model: 'A1', kind: 'audio', attributes: { rackU: 2, weightKg: 20, powerW: 1500, depthMm: 400, rearSupport: true } },
    { id: 'rx', name: 'Ukážkový prijímač', manufacturer: '', model: '', kind: 'audio', attributes: { rackU: 1, rackWidth: 'half', weightKg: 2, powerW: 20, depthMm: 200 } },
  ],
  catalog: [],
}
const rack = { units: 6, depthMm: 450, rails: 'both' as const, maxLoadKg: 30, ownWeightKg: 15 }
const slot = (key: string, patch: Partial<FitSlot>): FitSlot => ({ ...newSlot(key, {}, {}, { side: 'front', bottomU: 1 }), ...patch })

describe('osadenie racku', () => {
  it('polovičné vedľa seba sa neprekrývajú, rovnaký stĺpec áno, iná strana nie', () => {
    const a = slot('a', { width: 'half', col: 0 })
    expect(overlaps(a, slot('b', { width: 'half', col: 1 }))).toBe(false)
    expect(overlaps(a, slot('c', { width: 'half', col: 0 }))).toBe(true)
    expect(overlaps(a, slot('d', { width: 'full' }))).toBe(true)
    expect(overlaps(a, slot('e', { side: 'rear' }))).toBe(false)
    expect(overlaps(slot('f', { heightU: 2 }), slot('g', { bottomU: 3 }))).toBe(false)
  })

  it('nový slot berie výšku a šírku z techniky; voľné miesto aj vedľa polovičného', () => {
    const rx = newSlot('rx1', { equipmentId: 'rx' }, sources.equipment[1].attributes, { side: 'front', bottomU: 1 })
    expect([rx.heightU, rx.width]).toEqual([1, 'half'])
    const second = newSlot('rx2', { equipmentId: 'rx' }, sources.equipment[1].attributes, { side: 'front', bottomU: 1 })
    expect(freePlace(second, [rx], 6)).toEqual({ bottomU: 1, col: 1 })
    expect(freePlace(slot('big', { heightU: 7 }), [], 6)).toBeNull()
  })

  it('varovania: prekrytie, presah, hĺbka, nosnosť, ťažisko, PDU, prázdne U', () => {
    const amp = slot('amp', { equipmentId: 'amp', heightU: 2, bottomU: 5 })
    const rear = slot('rear', { side: 'rear', equipmentId: 'amp', heightU: 2, bottomU: 5 })
    const clash = slot('x', { bottomU: 6, label: 'Ukážkový pult' })
    const texts = rackWarnings(rack, [amp, rear, clash], sources).map((warning) => warning.text)
    expect(texts).toContain('Prekrytie: Ukážkový zosilňovač a Ukážkový pult (predok, U 6)')
    expect(texts).toContain('Predok Ukážkový zosilňovač a zadok Ukážkový zosilňovač spolu 800 mm – nezmestia sa do hĺbky 450 mm')
    expect(texts).toContain('Obsah váži 40 kg, nosnosť racku je 30 kg')
    expect(texts.some((text) => text.startsWith('Ťažké kusy vysoko'))).toBe(true)
    expect(texts).toContain('Príkon 3000 W a v racku nie je PDU')
    expect(texts).toContain('Spredu 4 U bez záslepky (U 1–4)')
    expect(rackWarnings(rack, [slot('o', { bottomU: 6, heightU: 2 })], sources).map((warning) => warning.text)).toContain('Zariadenie presahuje mimo rack (6 U)')
    expect(rackWarnings({ ...rack, rails: 'front' }, [amp], sources).map((warning) => warning.text)).toContain('Ukážkový zosilňovač potrebuje zadné uchytenie, rack má len predné lišty')
  })

  it('súhrn a rozsahy', () => {
    const summary = rackSummary(rack, [slot('amp', { equipmentId: 'amp', heightU: 2 }), slot('b', { accessory: 'blank', bottomU: 3 })], sources)
    expect(summary).toEqual({ usedU: 3, freeU: 3, contentsKg: 20, totalKg: 35, powerW: 1500, items: 1 })
    expect(compactRanges([1, 2, 3, 7, 9, 10])).toBe('1–3, 7, 9–10')
  })
})
