export function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('sk-SK', { style: 'currency', currency }).format(amount)
}

/** Dátum z databázy (YYYY-MM-DD) bez posunu časovým pásmom. */
export function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('sk-SK', { dateStyle: 'medium' })
}

export function todayIso() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('sk-SK', { dateStyle: 'medium', timeStyle: 'short' })
}
