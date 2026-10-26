// Štítky na pásku (Brother P-touch, napr. PT-D460BT: pásky TZe 3,5–18 mm, 180 dpi).
import { caseTitle, kindLabel, type Case } from '@/features/cases/model'
import { unitIdsOf, type Equipment } from '@/features/equipment/model'

export const TAPES = [9, 12, 18] as const
export type TapeMm = (typeof TAPES)[number]

export const LABEL_KINDS = ['qr', 'address', 'modes', 'power'] as const
export type LabelKind = (typeof LABEL_KINDS)[number]
export const LABEL_KIND_LABELS: Record<LabelKind, string> = {
  qr: 'QR + názov',
  address: 'Moja DMX adresa',
  modes: 'DMX módy',
  power: 'Odber a váha',
}

/** Prúd pri 230 V z príkonu (A), zaokrúhlený na desatiny. */
export const ampsAt230 = (watts: number) => Math.round((watts / 230) * 10) / 10

const num = (value: number) => String(value).replace('.', ',')

export type TapeLabel = { key: string; kind: LabelKind; title: string; lines: string[]; qr?: { kind: 'equipment' | 'case'; id: string; unit?: number } }

/** Štítok case / racku: QR, názov s číslom, kategória a rack v U. */
export function caseTapeLabel(item: Case): TapeLabel {
  return {
    key: `case-${item.id}`,
    kind: 'qr',
    title: caseTitle(item),
    lines: [[item.labelCategory, item.kind === 'rack' ? kindLabel(item) : ''].filter(Boolean).join(' · ')].filter(Boolean),
    qr: { kind: 'case', id: item.id },
  }
}

/** Štítky jednej techniky (pri evidencii po kusoch pre každý kus). Prázdne druhy (napr. svetlo bez DMX) sa vynechajú. */
export function tapeLabels(item: Equipment, kinds: LabelKind[]): TapeLabel[] {
  const units: (number | null)[] = item.trackUnits && item.quantity > 1 ? unitIdsOf(item) : item.trackUnits && item.unitIds.length === 1 ? [item.unitIds[0]] : [null]
  const modes = item.attributes.dmxModes ?? []
  const labels: TapeLabel[] = []
  for (const unit of units) {
    const name = unit !== null ? `${item.name} #${unit}` : item.name
    const info = unit !== null ? item.unitInfo?.[String(unit)] : undefined
    for (const kind of kinds) {
      const key = `${item.id}-${unit ?? 0}-${kind}`
      if (kind === 'qr') labels.push({ key, kind, title: name, lines: [], qr: { kind: 'equipment', id: item.id, ...(unit !== null ? { unit } : {}) } })
      if (kind === 'address' && (info?.dmxAddress || info?.dmxMode)) {
        const mode = modes.find((value) => (value.name || `${value.channels} ch`) === info?.dmxMode)
        labels.push({
          key,
          kind,
          title: [info?.dmxLine && `L${info.dmxLine}`, info?.dmxAddress && `A${String(info.dmxAddress).padStart(3, '0')}`].filter(Boolean).join(' · ') || name,
          lines: [[name, info?.dmxMode, mode && `${mode.channels} ch`].filter(Boolean).join(' · ')],
        })
      }
      if (kind === 'modes' && modes.length > 0) {
        labels.push({ key, kind, title: name, lines: [modes.map((mode) => `${mode.name ? `${mode.name} ` : ''}${mode.channels} ch`).join(' · ')] })
      }
      const watts = item.attributes.powerW
      const kg = item.attributes.weightKg
      if (kind === 'power' && (watts || kg)) {
        labels.push({ key, kind, title: name, lines: [[watts && `${num(watts)} W`, watts && `${num(ampsAt230(watts))} A / 230 V`, kg && `${num(kg)} kg`].filter(Boolean).join(' · ')] })
      }
    }
  }
  return labels
}
