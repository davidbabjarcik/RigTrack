import { z } from 'zod'
import { isValidIp, type Equipment } from '@/features/equipment/model'
import type { DeviceNetwork, MemberDevice } from '@/features/devices/model'

// ---------------------------------------------------------------------------
// Wi-Fi siete firmy
// ---------------------------------------------------------------------------

export const WIFI_SECURITIES = ['WPA', 'WEP', 'nopass'] as const
export type WifiSecurity = (typeof WIFI_SECURITIES)[number]

export const SECURITY_LABELS: Record<WifiSecurity, string> = {
  WPA: 'WPA / WPA2 / WPA3',
  WEP: 'WEP (staré)',
  nopass: 'Bez hesla',
}

export type WifiNetwork = {
  id: string
  ssid: string
  password: string
  security: WifiSecurity
  hidden: boolean
  /** IP rozsah, napr. 192.168.1.0/24. */
  subnet: string
  /** Gateway siete (zvyčajne router). */
  routerIp: string
  /** Adresa, na ktorej sa router spravuje (web rozhranie). */
  managementIp: string
  routerModel: string
  /** Router prideľuje adresy (DHCP) v rozsahu od–do. */
  dhcp: boolean
  dhcpStart: string
  dhcpEnd: string
  /** Technika, ku ktorej sieť patrí (mix, router). */
  equipmentId: string | null
  /** K technike, alebo sieť firmy (sídlo, kancelária) – 0103. */
  scope?: 'equipment' | 'company'
  /** Heslo existuje, ale používateľ ho nesmie vidieť (oprávnenie „Vidieť heslá Wi-Fi“). */
  passwordHidden?: boolean
  /** IP rozsah a adresy siete používateľ nesmie vidieť (oprávnenie „Vidieť IP a MAC adresy“). */
  addressesHidden?: boolean
  place: string
  note: string
}

const text = (max: number) => z.string().trim().max(max, `Najviac ${max} znakov`)
const optionalIp = text(45).refine((value) => value === '' || isValidIp(value), 'IP adresa má tvar 192.168.1.1')

// Limity zodpovedajú check constraints v 0055_wifi_networks.sql.
export const wifiSchema = z
  .object({
    ssid: z.string().min(1, 'Zadajte názov siete').max(32, 'Najviac 32 znakov'),
    password: z.string().max(63, 'Najviac 63 znakov'),
    security: z.enum(WIFI_SECURITIES),
    hidden: z.boolean(),
    subnet: text(43).refine((value) => value === '' || parseSubnet(value) !== null, 'Rozsah má tvar 192.168.1.0/24'),
    routerIp: optionalIp,
    managementIp: optionalIp,
    routerModel: text(80),
    dhcp: z.boolean(),
    dhcpStart: optionalIp,
    dhcpEnd: optionalIp,
    /** Prihlásenie do správy routera (uloží sa zvlášť, vidí ho len kto smie upravovať techniku). */
    loginUser: text(80),
    loginPassword: z.string().max(128, 'Najviac 128 znakov'),
    equipmentId: z.string(),
    /** K technike, alebo sieť firmy (sídlo, kancelária) – 0103. */
    scope: z.enum(['equipment', 'company']).optional(),
    /** Heslo existuje, ale používateľ ho nevidí – prázdne políčko ho nechá tak. */
    keepPassword: z.boolean().optional(),
    /** Adresy siete sa nemenia (používateľ ich nevidí). */
    keepAddresses: z.boolean().optional(),
    place: text(120),
    note: text(1000),
  })
  .refine((values) => values.security === 'nopass' || (values.keepPassword && values.password === '') || values.password.length >= (values.security === 'WEP' ? 5 : 8), {
    path: ['password'],
    message: 'Heslo Wi-Fi má aspoň 8 znakov',
  })
export type WifiFormValues = z.infer<typeof wifiSchema>

/** Znaky, ktoré sa v QR kóde Wi-Fi musia escapovať. */
const escapeQr = (value: string) => value.replace(/([\\;,:"])/g, '\\$1')

/** Text QR kódu na pripojenie (rozumie mu fotoaparát na iPhone aj Androide). */
export function wifiQrText(network: Pick<WifiNetwork, 'ssid' | 'password' | 'security' | 'hidden'>) {
  const password = network.security === 'nopass' ? '' : `P:${escapeQr(network.password)};`
  return `WIFI:T:${network.security};S:${escapeQr(network.ssid)};${password}${network.hidden ? 'H:true;' : ''};`
}

/** Prečíta QR kód Wi-Fi („WIFI:T:WPA;S:…;P:…;;“). Iný text → null. */
export function parseWifiQr(raw: string): Pick<WifiNetwork, 'ssid' | 'password' | 'security' | 'hidden'> | null {
  const text = raw.trim()
  if (!/^WIFI:/i.test(text)) return null
  const fields: Record<string, string> = {}
  let key = ''
  let value = ''
  let readingKey = true
  for (let index = 5; index < text.length; index++) {
    const char = text[index]
    if (char === '\\' && index + 1 < text.length) {
      value += text[++index]
    } else if (readingKey && char === ':') {
      readingKey = false
    } else if (readingKey) {
      key += char
    } else if (char === ';') {
      fields[key.toUpperCase()] = value
      key = ''
      value = ''
      readingKey = true
    } else {
      value += char
    }
  }
  if (!fields.S) return null
  const type = (fields.T ?? '').toUpperCase()
  const security: WifiSecurity = type === 'WEP' ? 'WEP' : type === '' || type === 'NOPASS' ? (fields.P ? 'WPA' : 'nopass') : 'WPA'
  return { ssid: fields.S, password: fields.P ?? '', security, hidden: (fields.H ?? '').toLowerCase() === 'true' }
}

export type RouterLogin = { networkId: string; username: string; password: string }

/** Adresa správy routera ako odkaz (http:// doplní, keď chýba). */
export function managementUrl(network: Pick<WifiNetwork, 'managementIp' | 'routerIp'>) {
  const host = (network.managementIp || network.routerIp).trim()
  if (!host) return null
  return /^https?:\/\//i.test(host) ? host : `http://${host}`
}

// ---------------------------------------------------------------------------
// IP adresy a rozsahy
// ---------------------------------------------------------------------------

/** IP ako číslo na zoradenie: 192.168.1.9 pred 192.168.1.10; neplatná IP na koniec. */
export function ipValue(ip: string) {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return Number.POSITIVE_INFINITY
  return ((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3]
}

/** „192.168.1.0/24“ → začiatok a počet bitov; bez „/“ sa berie /24. */
export function parseSubnet(subnet: string) {
  const [ip, bitsText] = subnet.trim().split('/')
  const bits = bitsText === undefined ? 24 : Number(bitsText)
  const value = ipValue(ip)
  if (!Number.isFinite(value) || !Number.isInteger(bits) || bits < 0 || bits > 32) return null
  return { value, bits }
}

/** Patrí IP do siete? Podľa rozsahu, a keď chýba, podľa IP routera (/24). */
export function inNetwork(ip: string, network: Pick<WifiNetwork, 'subnet' | 'routerIp'>) {
  const range = parseSubnet(network.subnet || network.routerIp)
  const value = ipValue(ip)
  if (!range || !Number.isFinite(value)) return false
  const size = 2 ** (32 - range.bits)
  return Math.floor(value / size) === Math.floor(range.value / size)
}

/** MAC bez oddeľovačov a veľkými písmenami, aby sa dala hľadať v akomkoľvek zápise. */
export const macKey = (mac: string) => mac.toUpperCase().replace(/[^0-9A-F]/g, '')

// ---------------------------------------------------------------------------
// Všetky adresy: technika aj zariadenia členov
// ---------------------------------------------------------------------------

/** Zariadenie hosťa (napr. hosťujúci zvukár) – 0086. */
export type GuestDevice = {
  id: string
  personName: string
  contact: string
  deviceName: string
  mac: string
  ip: string
  networkId: string | null
  note: string
  validUntil: string | null
}

export type AddressRow = {
  key: string
  source: 'equipment' | 'device' | 'guest'
  /** Pri zariadení hosťa jeho id (na úpravu a zmazanie). */
  guestId?: string
  name: string
  /** Výrobca a model / majiteľ a druh zariadenia. */
  detail: string
  ip: string
  /** Adresu prideľuje DHCP (nemá pevnú IP). */
  dhcp: boolean
  /** Prefix siete pri IP (24 = /24), ak je zadaný. */
  prefix: number | null
  mac: string
  /** Pri zariadení člena: MAC Wi-Fi karty alebo ethernetovej (LAN) karty. */
  iface?: 'wifi' | 'lan'
  /** Sieť, do ktorej adresa patrí (podľa SSID pri zariadení alebo podľa rozsahu IP). */
  networkId: string | null
  /** Kam vedie klik (technika); pri zariadení karta majiteľa. */
  to: string | null
  duplicateIp: boolean
  duplicateMac: boolean
}

type Owner = (userId: string) => { name: string; to: string | null }

export function addressRows(equipment: Equipment[], devices: MemberDevice[], networks: WifiNetwork[], owner: Owner, guests: GuestDevice[] = []): AddressRow[] {
  const byIp = (ip: string) => (ip ? (networks.find((network) => inNetwork(ip, network))?.id ?? null) : null)
  const rows: Omit<AddressRow, 'duplicateIp' | 'duplicateMac'>[] = []
  for (const item of equipment) {
    if (item.status === 'retired' || (!item.ipAddress && !item.macAddress && !item.attributes?.ipDhcp)) continue
    rows.push({
      key: `e-${item.id}`,
      source: 'equipment',
      name: item.name,
      detail: [item.manufacturer, item.model].filter(Boolean).join(' '),
      ip: item.ipAddress,
      dhcp: Boolean(item.attributes?.ipDhcp) && !item.ipAddress,
      prefix: item.attributes?.ipPrefix ?? null,
      mac: item.macAddress,
      networkId: byIp(item.ipAddress),
      to: `/equipment/${item.id}`,
    })
  }
  for (const device of devices) {
    const who = owner(device.userId)
    // Bez zapísaných sietí aspoň MAC adresy zariadenia (Wi-Fi a prípadne LAN).
    const entries: DeviceNetwork[] =
      device.networks.length > 0
        ? device.networks
        : [{ ssid: '', ip: '', mac: '' }, ...(device.ethernetMac ? [{ ssid: '', ip: '', mac: '', via: 'ethernet' as const }] : [])]
    entries.forEach((entry, index) => {
      const bySsid = entry.ssid ? networks.find((network) => network.ssid === entry.ssid)?.id : undefined
      rows.push({
        key: `d-${device.id}-${index}`,
        source: 'device',
        name: device.name,
        detail: [who.name, entry.ssid && !bySsid ? `Wi-Fi ${entry.ssid}` : ''].filter(Boolean).join(' · '),
        ip: entry.ip,
        dhcp: Boolean(entry.dhcp) && !entry.ip,
        prefix: null,
        mac: entry.mac || (entry.via === 'ethernet' && device.ethernetMac ? device.ethernetMac : device.mac),
        iface: entry.via === 'ethernet' ? 'lan' : 'wifi',
        networkId: bySsid ?? byIp(entry.ip),
        to: who.to,
      })
    })
  }
  for (const guest of guests) {
    rows.push({
      key: `g-${guest.id}`,
      source: 'guest',
      guestId: guest.id,
      name: guest.deviceName || guest.personName,
      detail: [guest.deviceName ? guest.personName : '', guest.contact, guest.validUntil ? `do ${guest.validUntil.split('-').reverse().join('. ')}` : ''].filter(Boolean).join(' · '),
      ip: guest.ip,
      dhcp: !guest.ip,
      prefix: null,
      mac: guest.mac,
      networkId: guest.networkId ?? byIp(guest.ip),
      to: null,
    })
  }
  // Rovnaká IP v tej istej sieti (alebo obe bez siete) by sa bila; rovnaká MAC na rôznych veciach je asi preklep.
  const ipKey = (row: (typeof rows)[number]) => `${row.networkId ?? '-'}|${row.ip}`
  const ipCounts = new Map<string, number>()
  const macCounts = new Map<string, Set<string>>()
  for (const row of rows) {
    if (row.ip) ipCounts.set(ipKey(row), (ipCounts.get(ipKey(row)) ?? 0) + 1)
    if (row.mac) {
      const owners = macCounts.get(macKey(row.mac)) ?? new Set()
      owners.add(row.key.replace(/-\d+$/, ''))
      macCounts.set(macKey(row.mac), owners)
    }
  }
  return rows
    .map((row) => ({
      ...row,
      duplicateIp: Boolean(row.ip) && (ipCounts.get(ipKey(row)) ?? 0) > 1,
      duplicateMac: Boolean(row.mac) && (macCounts.get(macKey(row.mac))?.size ?? 0) > 1,
    }))
    .sort((a, b) => ipValue(a.ip) - ipValue(b.ip) || a.name.localeCompare(b.name, 'sk'))
}

/** Hľadanie podľa IP (aj začiatku), MAC v ľubovoľnom zápise (aj časti) alebo podľa názvu. */
export function matchesAddress(row: Pick<AddressRow, 'ip' | 'mac' | 'name' | 'detail'>, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (row.ip.startsWith(q)) return true
  const mac = macKey(q)
  if (mac.length >= 2 && /^[0-9a-f:\-.\s]+$/i.test(q) && macKey(row.mac).includes(mac)) return true
  const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  return fold(`${row.name} ${row.detail}`).includes(fold(q))
}

/** Voľné IP v sieti od routera ďalej (na rýchle pridelenie novej veci). */
export function suggestFreeIp(network: Pick<WifiNetwork, 'subnet' | 'routerIp'> & Partial<Pick<WifiNetwork, 'dhcp' | 'dhcpStart' | 'dhcpEnd'>>, used: string[]) {
  const range = parseSubnet(network.subnet || network.routerIp)
  if (!range || range.bits < 16 || range.bits > 30) return null
  const size = 2 ** (32 - range.bits)
  const start = Math.floor(range.value / size) * size
  const taken = new Set(used.map(ipValue))
  if (network.routerIp) taken.add(ipValue(network.routerIp))
  // Pevná IP nepatrí do rozsahu, ktorý rozdáva DHCP.
  const dhcpFrom = network.dhcp && network.dhcpStart ? ipValue(network.dhcpStart) : Number.POSITIVE_INFINITY
  const dhcpTo = network.dhcp && network.dhcpEnd ? ipValue(network.dhcpEnd) : Number.NEGATIVE_INFINITY
  for (let offset = 10; offset < size - 1; offset++) {
    if (start + offset >= dhcpFrom && start + offset <= dhcpTo) continue
    if (!taken.has(start + offset)) return [24, 16, 8, 0].map((shift) => Math.floor((start + offset) / 2 ** shift) % 256).join('.')
  }
  return null
}
