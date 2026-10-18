import { z } from 'zod'
import type { Contact } from '@/lib/vcard'

export const TECHNICIAN_SCOPES = ['equipment', 'vehicles', 'both'] as const
export type TechnicianScope = (typeof TECHNICIAN_SCOPES)[number]

export const SCOPE_LABELS: Record<TechnicianScope, string> = {
  equipment: 'Technika',
  vehicles: 'Autá',
  both: 'Technika aj autá',
}

export type Technician = {
  id: string
  name: string
  /** Firma / servis, pre ktorý technik robí. */
  firm: string
  phone: string
  email: string
  address: string
  scope: TechnicianScope
  /** Na čo je, napr. „Yamaha mixy, Robe svetlá“ alebo „Ford Transit, pneuservis“. */
  specialization: string
  note: string
}

const text = (max: number) => z.string().trim().max(max, `Najviac ${max} znakov`)

// Limity zodpovedajú check constraints v 0049_service_technicians.sql.
export const technicianSchema = z.object({
  name: text(80).min(1, 'Zadajte meno'),
  firm: text(80),
  phone: text(40),
  email: text(120).refine((value) => value === '' || /^\S+@\S+\.\S+$/.test(value), 'Neplatný e-mail'),
  address: text(200),
  scope: z.enum(TECHNICIAN_SCOPES),
  specialization: text(200),
  note: text(1000),
})
export type TechnicianFormValues = z.infer<typeof technicianSchema>

/** Hodí sa technik na techniku / na autá? */
export function servesFor(technician: Pick<Technician, 'scope'>, kind: 'equipment' | 'vehicles') {
  return technician.scope === 'both' || technician.scope === kind
}

const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function matchesTechnician(technician: Technician, search: string) {
  const needle = fold(search.trim())
  if (!needle) return true
  return fold([technician.name, technician.firm, technician.phone, technician.email, technician.specialization, technician.address].join(' ')).includes(needle)
}

export function sortTechnicians(list: Technician[]) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, 'sk'))
}

/** „Peter Opravár (AV Servis)“ */
export function technicianLabel(technician: Pick<Technician, 'name' | 'firm'>) {
  return technician.firm ? `${technician.name} (${technician.firm})` : technician.name
}

export function technicianContact(technician: Technician): Contact {
  return {
    name: technician.name,
    org: technician.firm,
    title: technician.specialization ? `Servis: ${technician.specialization}` : 'Servis',
    phone: technician.phone,
    email: technician.email,
    address: technician.address,
    note: technician.note,
  }
}
