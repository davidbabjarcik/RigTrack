import type { StoredLink } from './links'

// Racky 19" po jednotkách U: návrh racku (rack_designs) a jeho osadenie (rack_slots). 1 U = 44,45 mm.

export const RACK_TYPES = ['shock', 'open', 'desk'] as const
export type RackType = (typeof RACK_TYPES)[number]
export const RACK_TYPE_LABELS: Record<RackType, string> = { shock: 'Shock-mount flightcase', open: 'Otvorený rack', desk: 'Stolový / slant' }

export const RACK_RAILS = ['front', 'both'] as const
export type RackRails = (typeof RACK_RAILS)[number]
export const RACK_RAIL_LABELS: Record<RackRails, string> = { front: 'Len predné lišty', both: 'Predné aj zadné lišty' }

export const SLOT_WIDTHS = ['full', 'half', 'third'] as const
export type SlotWidth = (typeof SLOT_WIDTHS)[number]
export const SLOT_WIDTH_LABELS: Record<SlotWidth, string> = { full: 'Celá šírka', half: '1/2 šírky', third: '1/3 šírky' }

export const ACCESSORIES = ['blank', 'shelf', 'vent', 'patch', 'pdu', 'drawer', 'lamp'] as const
export type Accessory = (typeof ACCESSORIES)[number]
export const ACCESSORY_LABELS: Record<Accessory, string> = {
  blank: 'Záslepka',
  shelf: 'Polička',
  vent: 'Ventilačný panel',
  patch: 'Patch panel',
  pdu: 'PDU (napájanie)',
  drawer: 'Šuflík',
  lamp: 'Lampa',
}

export type RackDesign = {
  id: string
  name: string
  rackType: RackType
  units: number
  depthMm: number | null
  rails: RackRails
  maxLoadKg: number | null
  ownWeightKg: number | null
  note: string
  caseId: string | null
  eventId: string | null
  isTemplate: boolean
  version: number
  updatedAt: string
  /** Prepojenia (12.14) – menia sa len pri uložení osadenia. */
  links: StoredLink[]
}

export type RackFields = Omit<RackDesign, 'id' | 'version' | 'updatedAt' | 'links'>

export const EMPTY_RACK: RackFields = {
  name: '',
  rackType: 'shock',
  units: 12,
  depthMm: null,
  rails: 'both',
  maxLoadKg: null,
  ownWeightKg: null,
  note: '',
  caseId: null,
  eventId: null,
  isTemplate: false,
}

/** Údaje racku na úpravu (bez id a verzie). */
export const rackFields = (rack: RackDesign): RackFields => ({
  name: rack.name,
  rackType: rack.rackType,
  units: rack.units,
  depthMm: rack.depthMm,
  rails: rack.rails,
  maxLoadKg: rack.maxLoadKg,
  ownWeightKg: rack.ownWeightKg,
  note: rack.note,
  caseId: rack.caseId,
  eventId: rack.eventId,
  isTemplate: rack.isTemplate,
})

export type RackSlot = {
  id: string
  side: 'front' | 'rear'
  bottomU: number
  heightU: number
  width: SlotWidth
  col: number
  equipmentId: string | null
  unit: number | null
  catalogId: string | null
  accessory: Accessory | null
  label: string
  depthMm: number | null
  weightKg: number | null
  powerW: number | null
  rearSupport: boolean | null
}

/** Výška racku v mm (len lišty, 1 U = 44,45 mm). */
export const rackHeightMm = (units: number) => Math.round(units * 44.45)
