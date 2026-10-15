import { describe, expect, it } from 'vitest'
import { crc32, createZip } from './zip'

/** Prečíta súbory späť z archívu podľa centrálneho adresára (len metóda store). */
function readZip(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const endAt = bytes.length - 22
  expect(view.getUint32(endAt, true)).toBe(0x06054b50)
  const count = view.getUint16(endAt + 10, true)
  let at = view.getUint32(endAt + 16, true)
  const files: Record<string, string> = {}
  for (let i = 0; i < count; i++) {
    expect(view.getUint32(at, true)).toBe(0x02014b50)
    const size = view.getUint32(at + 20, true)
    const nameLength = view.getUint16(at + 28, true)
    const local = view.getUint32(at + 42, true)
    const name = new TextDecoder().decode(bytes.slice(at + 46, at + 46 + nameLength))
    const start = local + 30 + view.getUint16(local + 26, true)
    const data = bytes.slice(start, start + size)
    expect(view.getUint32(local + 14, true)).toBe(crc32(data))
    files[name] = new TextDecoder().decode(data)
    at += 46 + nameLength
  }
  return files
}

describe('zip', () => {
  it('computes the standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
  })

  it('stores files with UTF-8 names that read back unchanged', () => {
    const encode = (text: string) => new TextEncoder().encode(text)
    const zip = createZip([
      { name: 'Výpožičky.xlsx', data: encode('obsah') },
      { name: 'ČÍTAJ.txt', data: encode('') },
    ])
    expect(readZip(zip)).toEqual({ 'Výpožičky.xlsx': 'obsah', 'ČÍTAJ.txt': '' })
  })
})
