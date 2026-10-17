import { describe, expect, it } from 'vitest'
import type { Equipment } from '@/features/equipment/model'
import { eventReminders, readRules, type EventRule, type Matcher } from './rules'

const item = (id: string, patch: Partial<Equipment> = {}) =>
  ({ id, name: id, manufacturer: '', model: '', kind: 'general', categoryId: null, caseId: null, attributes: {}, ...patch }) as Equipment

const equipment = [
  item('repro', { name: 'Pasívny reprobox 15"', kind: 'audio', attributes: { audioType: 'speaker' } }),
  item('amp', { name: 'Zosilňovač', kind: 'audio', attributes: { audioType: 'amplifier' } }),
  item('nl4', { name: 'Kábel NL4 10 m', kind: 'cable' }),
  item('sharpy', { name: 'Sharpy', kind: 'light', categoryId: 'svetla' }),
  item('hak', { name: 'Hák', caseId: 'hooks' }),
]
const rule = (id: string, when: Matcher, need: Matcher, message = ''): EventRule => ({ id, when, need, message })
const rules = [
  rule('nl4', { type: 'audioType', value: 'amplifier' }, { type: 'name', value: 'nl4' }),
  rule('hooks', { type: 'category', value: 'svetla' }, { type: 'case', value: 'hooks' }, 'Svetlá bez hákov?'),
]
const describeMatcher = (matcher: Matcher) => `${matcher.type}:${matcher.value}`
const on = (lines: { equipmentId: string; caseId?: string | null }[]) => ({ equipment: lines.map((line) => ({ quantity: 1, caseId: null, ...line })) })

describe('event reminders', () => {
  it('reminds what is missing for what is on the event', () => {
    const reminders = eventReminders(on([{ equipmentId: 'amp' }, { equipmentId: 'sharpy' }]), rules, equipment, describeMatcher)
    expect(reminders.map((reminder) => reminder.text)).toEqual(['Na evente je audioType:amplifier – netreba aj name:nl4?', 'Svetlá bez hákov?'])
  })

  it('is quiet when the needed thing is there, also via its case, or when nothing triggers it', () => {
    expect(eventReminders(on([{ equipmentId: 'amp' }, { equipmentId: 'nl4' }]), rules, equipment, describeMatcher)).toEqual([])
    expect(eventReminders(on([{ equipmentId: 'sharpy' }, { equipmentId: 'hak', caseId: 'hooks' }]), rules, equipment, describeMatcher)).toEqual([])
    expect(eventReminders(on([{ equipmentId: 'repro' }]), rules, equipment, describeMatcher)).toEqual([])
  })

  it('drops broken stored rules', () => {
    expect(readRules([rules[0], { id: 'x' }, 'nonsense'])).toEqual([rules[0]])
    expect(readRules(null)).toEqual([])
  })
})
