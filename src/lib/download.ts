/** Stiahne text ako súbor (na mobile ho systém zvyčajne rovno ponúkne otvoriť v príslušnej appke). */
export function downloadText(fileName: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Názov súboru bez znakov, ktoré systémy nemajú radi. */
export function safeFileName(name: string, fallback: string) {
  const cleaned = name
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
  return cleaned || fallback
}
