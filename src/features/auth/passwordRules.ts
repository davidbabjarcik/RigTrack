// Pravidlá hesla – rovnaké ako v Supabase Auth (Authentication → Email): aspoň 10 znakov a malé písmeno, veľké
// písmeno, číslica a symbol. Kontrola v appke len vysvetlí, čo chýba; rozhoduje server.

export const PASSWORD_MIN = 10
/** Symboly, ktoré Supabase uznáva. */
const SYMBOLS = /[!@#$%^&*()_+\-=[\]{};'\\:"|<>?,./`~]/

export type PasswordRule = { key: 'length' | 'lower' | 'upper' | 'digit' | 'symbol'; sk: string; en: string; ok: boolean }

export function passwordRules(password: string): PasswordRule[] {
  return [
    { key: 'length', sk: `aspoň ${PASSWORD_MIN} znakov`, en: `at least ${PASSWORD_MIN} characters`, ok: password.length >= PASSWORD_MIN },
    { key: 'lower', sk: 'malé písmeno', en: 'a lowercase letter', ok: /[a-z]/.test(password) },
    { key: 'upper', sk: 'veľké písmeno', en: 'an uppercase letter', ok: /[A-Z]/.test(password) },
    { key: 'digit', sk: 'číslica', en: 'a digit', ok: /\d/.test(password) },
    { key: 'symbol', sk: 'symbol (napr. ! ? # -)', en: 'a symbol (e.g. ! ? # -)', ok: SYMBOLS.test(password) },
  ]
}

export const passwordOk = (password: string) => passwordRules(password).every((rule) => rule.ok)
