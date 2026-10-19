import type { EquipmentFilter } from '@/features/equipment/model'
import type { LinkedEquipment } from './api'

const plain = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/** Technika prepojených firiem podľa filtra (hľadanie, druh, typ zvuku, výrobca, firma). */
export function filterLinkedEquipment(items: LinkedEquipment[], filter: EquipmentFilter) {
  if (!filter.company) return []
  const words = plain(filter.search).split(/\s+/).filter(Boolean)
  return items.filter((item) => {
    if (filter.company !== 'all' && item.companyId !== filter.company) return false
    if (filter.kind && item.kind !== filter.kind) return false
    if (filter.audioType && item.attributes.audioType !== filter.audioType) return false
    if (filter.manufacturer && plain(item.manufacturer) !== plain(filter.manufacturer)) return false
    const haystack = plain([item.name, item.manufacturer, item.model, item.category, item.companyName].join(' '))
    return words.every((word) => haystack.includes(word))
  })
}
