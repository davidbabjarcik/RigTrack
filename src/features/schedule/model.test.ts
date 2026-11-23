import { describe, expect, it } from 'vitest'
import { eventDays, groupSchedule, scheduleWarnings, span, type ScheduleItem } from './model'

const item = (id: string, startsAt: string, endsAt: string, fields: Partial<ScheduleItem> = {}): ScheduleItem => ({ id, day: '2026-12-01', startsAt, endsAt, stage: '', kind: 'act', title: id.toUpperCase(), note: '', ...fields })

describe('harmonogram', () => {
  it('čas po polnoci patrí k začatému dňu', () => {
    expect(span(item('a', '23:30', '01:00'))).toEqual({ start: 1410, end: 1500 })
  })

  it('dni akcie a zoskupenie podľa dňa a pódia', () => {
    expect(eventDays({ startsOn: '2026-12-30', endsOn: '2027-01-01' })).toEqual(['2026-12-30', '2026-12-31', '2027-01-01'])
    const groups = groupSchedule([item('b', '21:00', '22:00', { stage: 'Malé' }), item('a', '20:00', '21:00', { stage: 'Hlavné' })])
    expect([...groups.get('2026-12-01')!.keys()]).toEqual(['Hlavné', 'Malé'])
  })

  it('prekryv na tom istom pódiu a krátka prestavba; iné pódium nevadí', () => {
    const warnings = scheduleWarnings([
      item('a', '20:00', '21:00', { stage: 'Hlavné' }),
      item('b', '21:10', '22:00', { stage: 'Hlavné' }),
      item('c', '21:50', '23:00', { stage: 'Hlavné', kind: 'changeover' }),
      item('d', '20:30', '21:30', { stage: 'Malé' }),
      item('e', '19:00', '', { stage: 'Hlavné', kind: 'doors' }),
    ])
    expect(warnings.map((warning) => warning.text)).toEqual([
      '1. 12. 2026 · Hlavné: „B“ a „C“ sa prekrývajú',
      '1. 12. 2026 · Hlavné: medzi „A“ a „B“ je len 10 min na prestavbu',
    ])
  })
})
