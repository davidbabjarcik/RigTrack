// Právna forma firmy / organizácie (0102): s.r.o., a.s., živnosť, občianske združenie… a ako sa volá jej štatutár.

export const LEGAL_FORMS = ['sro', 'as', 'zivnost', 'oz', 'nadacia', 'obec', 'ine'] as const
export type LegalForm = (typeof LEGAL_FORMS)[number]

export const LEGAL_FORM_LABELS: Record<LegalForm, string> = {
  sro: 's.r.o.',
  as: 'a.s.',
  zivnost: 'Živnosť (SZČO)',
  oz: 'Občianske združenie (OZ)',
  nadacia: 'Nadácia / nezisková organizácia',
  obec: 'Obec / mesto / úrad',
  ine: 'Iná',
}

/** Ako sa volá hlavná (štatutárna) osoba pri danej forme. */
export function statutoryLabel(form: string | undefined) {
  switch (form) {
    case 'sro':
      return 'Konateľ'
    case 'as':
      return 'Predseda predstavenstva'
    case 'zivnost':
      return 'Majiteľ'
    case 'oz':
      return 'Štatutár / predseda'
    case 'nadacia':
      return 'Správca / štatutár'
    case 'obec':
      return 'Starosta / primátor'
    default:
      return 'Štatutár / konateľ'
  }
}

export const isLegalForm = (value: string | undefined): value is LegalForm => LEGAL_FORMS.includes(value as LegalForm)
