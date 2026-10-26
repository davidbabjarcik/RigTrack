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

/**
 * Čo všetko môže byť na štítku – každý si zapne / vypne (uloží sa k účtu). Skupina = druh štítku
 * (case = štítok case / racku).
 */
export const TAPE_FIELDS = {
  qr: {
    'qr.code': 'QR kód',
    'qr.name': 'Názov',
    'qr.unit': 'Číslo kusu (#3)',
    'qr.category': 'Kategória',
    'qr.company': 'Názov firmy',
  },
  address: {
    'address.line': 'Linka',
    'address.address': 'Adresa',
    'address.name': 'Názov s číslom kusu',
    'address.mode': 'Mód',
    'address.channels': 'Počet kanálov',
    'address.power': 'Odber (W / A)',
  },
  modes: {
    'modes.name': 'Názov s číslom kusu',
    'modes.list': 'Zoznam módov',
  },
  power: {
    'power.name': 'Názov s číslom kusu',
    'power.watts': 'Príkon (W)',
    'power.amps': 'Prúd (A pri 230 V)',
    'power.weight': 'Váha (kg)',
  },
  case: {
    'case.code': 'QR kód',
    'case.name': 'Názov s číslom',
    'case.category': 'Kategória na štítku',
    'case.rack': 'Druh (rack v U, taška)',
    'case.company': 'Názov firmy',
  },
} as const
export type TapeFieldGroup = keyof typeof TAPE_FIELDS
export type TapeField = { [G in TapeFieldGroup]: keyof (typeof TAPE_FIELDS)[G] }[TapeFieldGroup]

/** Predvolene vypnuté (kategória a firma); všetko ostatné zapnuté. */
const DEFAULT_OFF: TapeField[] = ['qr.category', 'qr.company', 'case.category', 'case.company', 'address.power']

/** Je pole na štítku zapnuté? Neuložené pole má predvolenú hodnotu. */
export const fieldOn = (fields: Partial<Record<string, boolean>> | undefined, key: TapeField) => fields?.[key] ?? !DEFAULT_OFF.includes(key)

/** Prúd pri 230 V z príkonu (A), zaokrúhlený na desatiny. */
export const ampsAt230 = (watts: number) => Math.round((watts / 230) * 10) / 10

const num = (value: number) => String(value).replace('.', ',')
const join = (parts: (string | false | undefined | null | 0)[]) => parts.filter(Boolean).join(' · ')

export type TapeLabel = { key: string; kind: LabelKind; title: string; lines: string[]; qr?: { kind: 'equipment' | 'case'; id: string; unit?: number } }
type Options = { fields?: Partial<Record<string, boolean>>; company?: string; category?: (categoryId: string | null) => string }

/** Štítok case / racku podľa zapnutých polí: QR, názov s číslom, kategória, rack v U, firma. */
export function caseTapeLabel(item: Case, options: Options = {}): TapeLabel {
  const on = (key: TapeField) => fieldOn(options.fields, key)
  const title = on('case.name') ? caseTitle(item) : ''
  const line = join([on('case.category') && item.labelCategory, on('case.rack') && item.kind && item.kind !== 'case' && kindLabel(item), on('case.company') && options.company])
  return {
    key: `case-${item.id}`,
    kind: 'qr',
    title: title || line,
    lines: title && line ? [line] : [],
    ...(on('case.code') ? { qr: { kind: 'case' as const, id: item.id } } : {}),
  }
}

/** Štítky jednej techniky (pri evidencii po kusoch pre každý kus). Prázdne druhy (napr. svetlo bez DMX) sa vynechajú. */
export function tapeLabels(item: Equipment, kinds: LabelKind[], options: Options = {}): TapeLabel[] {
  const on = (key: TapeField) => fieldOn(options.fields, key)
  const units: (number | null)[] = item.trackUnits && item.quantity > 1 ? unitIdsOf(item) : item.trackUnits && item.unitIds.length === 1 ? [item.unitIds[0]] : [null]
  const modes = item.attributes.dmxModes ?? []
  const labels: TapeLabel[] = []
  // Prvý riadok má byť nadpis; keď je nadpis vypnutý, stane sa ním prvý riadok.
  const push = (label: Omit<TapeLabel, 'title' | 'lines'>, title: string, lines: string[]) => {
    const rest = lines.filter(Boolean)
    if (!title && rest.length === 0 && !label.qr) return
    labels.push({ ...label, title: title || rest.shift() || '', lines: rest })
  }
  for (const unit of units) {
    const fullName = unit !== null ? `${item.name} #${unit}` : item.name
    const info = unit !== null ? item.unitInfo?.[String(unit)] : undefined
    for (const kind of kinds) {
      const key = `${item.id}-${unit ?? 0}-${kind}`
      if (kind === 'qr') {
        const name = join([on('qr.name') && item.name, on('qr.unit') && unit !== null && `#${unit}`]).replace(' · #', ' #')
        push({ key, kind, ...(on('qr.code') ? { qr: { kind: 'equipment', id: item.id, ...(unit !== null ? { unit } : {}) } } : {}) }, name, [
          join([on('qr.category') && options.category?.(item.categoryId), on('qr.company') && options.company]),
        ])
      }
      if (kind === 'address' && (info?.dmxAddress || info?.dmxMode)) {
        const mode = modes.find((value) => (value.name || `${value.channels} ch`) === info?.dmxMode)
        push(
          { key, kind },
          join([on('address.line') && info?.dmxLine && `L${info.dmxLine}`, on('address.address') && info?.dmxAddress && `A${String(info.dmxAddress).padStart(3, '0')}`]),
          [
            join([on('address.name') && fullName, on('address.mode') && info?.dmxMode, on('address.channels') && mode && `${mode.channels} ch`]),
            on('address.power') && item.attributes.powerW ? `${num(item.attributes.powerW)} W · ${num(ampsAt230(item.attributes.powerW))} A` : '',
          ],
        )
      }
      if (kind === 'modes' && modes.length > 0) {
        push({ key, kind }, on('modes.name') ? fullName : '', [on('modes.list') ? modes.map((mode) => `${mode.name ? `${mode.name} ` : ''}${mode.channels} ch`).join(' · ') : ''])
      }
      const watts = item.attributes.powerW
      const kg = item.attributes.weightKg
      if (kind === 'power' && (watts || kg)) {
        push({ key, kind }, on('power.name') ? fullName : '', [
          join([on('power.watts') && watts && `${num(watts)} W`, on('power.amps') && watts && `${num(ampsAt230(watts))} A / 230 V`, on('power.weight') && kg && `${num(kg)} kg`]),
        ])
      }
    }
  }
  return labels
}
