import { z } from 'zod'
import { isValidIp } from '@/features/equipment/model'

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
  /** MAC Wi-Fi karty, vždy v tvare AA:BB:CC:DD:EE:FF. */
  mac: string
  /** MAC ethernet (LAN) karty, napr. pri notebooku; prázdne = nemá. */
  ethernetMac: string
  note: string
  /** Wi-Fi siete, kde zariadenie chodí: IP adresa a MAC v tej sieti (súkromná adresa mobilu). */
  networks: DeviceNetwork[]
}

/** Sieť zariadenia: pevná IP, alebo `dhcp` (adresu pridelí router); `via` = pripojené cez Wi-Fi alebo kábel (LAN). */
export type DeviceNetwork = { ssid: string; ip: string; mac: string; dhcp?: boolean; via?: 'wifi' | 'ethernet' }

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
  ethernetMac: z
    .string()
    .refine((value) => value.trim() === '' || normalizeMac(value) !== null, 'MAC v tvare AA:BB:CC:DD:EE:FF')
    .transform((value) => (value.trim() === '' ? '' : normalizeMac(value)!)),
  note: text(200),
  networks: z
    .array(
      z.object({
        ssid: z.string().trim().min(1, 'Zadajte názov Wi-Fi').max(32, 'Najviac 32 znakov'),
        ip: z
          .string()
          .trim()
          .max(45)
          .refine((value) => value === '' || isValidIp(value), 'IP adresa má tvar 192.168.1.20'),
        mac: z
          .string()
          .refine((value) => value.trim() === '' || normalizeMac(value) !== null, 'MAC v tvare AA:BB:CC:DD:EE:FF')
          .transform((value) => (value.trim() === '' ? '' : normalizeMac(value)!)),
        dhcp: z.boolean().optional(),
        via: z.enum(['wifi', 'ethernet']).optional(),
      }),
    )
    .max(20, 'Najviac 20 sietí'),
})
export type DeviceFormInput = z.input<typeof deviceSchema>
export type DeviceFormValues = z.output<typeof deviceSchema>

/** Hodnoty z formulára → stĺpce tabuľky (ethernet MAC sa v databáze volá ethernet_mac). */
export function deviceRow(values: DeviceFormValues) {
  return { kind: values.kind, name: values.name, mac: values.mac, ethernet_mac: values.ethernetMac, note: values.note, networks: values.networks }
}

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
