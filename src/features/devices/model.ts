import { z } from 'zod'

export const DEVICE_KINDS = ['phone', 'laptop', 'tablet', 'other'] as const
export type DeviceKind = (typeof DEVICE_KINDS)[number]

export const DEVICE_KIND_LABELS: Record<DeviceKind, string> = {
  phone: 'Mobil',
  laptop: 'Notebook',
  tablet: 'Tablet / iPad',
  other: 'Iné',
}

export type MemberDevice = {
  id: string
  userId: string
  kind: DeviceKind
  name: string
  /** Vždy v tvare AA:BB:CC:DD:EE:FF. */
  mac: string
  note: string
}

/** „aa-bb-cc-dd-ee-ff“, „aabb.ccdd.eeff“ aj „AABBCCDDEEFF“ → „AA:BB:CC:DD:EE:FF“; neplatná MAC → null. */
export function normalizeMac(input: string) {
  const hex = input.toUpperCase().replace(/[^0-9A-F]/g, '')
  if (hex.length !== 12 || /[^0-9A-F:\-.\s]/i.test(input.trim())) return null
  return hex.match(/.{2}/g)!.join(':')
}

/**
 * Náhodná (súkromná) MAC, ktorú si mobil vymyslí pre každú Wi-Fi zvlášť: druhý znak je 2, 6, A alebo E.
 * Taká adresa sa môže meniť, preto na ňu upozorníme.
 */
export function isRandomMac(mac: string) {
  return /^.[26AE]/.test(mac)
}

const text = (max: number) => z.string().trim().max(max, `Najviac ${max} znakov`)

// Limity zodpovedajú check constraints v 0051_member_devices.sql.
export const deviceSchema = z.object({
  kind: z.enum(DEVICE_KINDS),
  name: text(80).min(1, 'Zadajte názov, napr. iPhone 15'),
  mac: z
    .string()
    .refine((value) => normalizeMac(value) !== null, 'Zadajte MAC v tvare AA:BB:CC:DD:EE:FF')
    .transform((value) => normalizeMac(value)!),
  note: text(200),
})
export type DeviceFormInput = z.input<typeof deviceSchema>
export type DeviceFormValues = z.output<typeof deviceSchema>

const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const macKey = (value: string) => value.toUpperCase().replace(/[^0-9A-F]/g, '')

/** Hľadá v názve, majiteľovi aj MAC v ľubovoľnom zápise. */
export function matchesDevice(device: MemberDevice, owner: string, query: string) {
  const q = query.trim()
  if (!q) return true
  const mac = macKey(q)
  if (mac.length >= 2 && /^[0-9a-f:\-.\s]+$/i.test(q) && macKey(device.mac).includes(mac)) return true
  return fold(`${device.name} ${owner} ${device.note}`).includes(fold(q))
}
