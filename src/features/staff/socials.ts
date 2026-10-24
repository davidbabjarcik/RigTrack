// Sociálne siete na karte zamestnanca a v osobnom profile.

export const SOCIAL_NETWORKS = [
  { key: 'instagram', label: 'Instagram', base: 'https://instagram.com/' },
  { key: 'facebook', label: 'Facebook', base: 'https://facebook.com/' },
  { key: 'tiktok', label: 'TikTok', base: 'https://tiktok.com/@' },
  { key: 'linkedin', label: 'LinkedIn', base: 'https://linkedin.com/in/' },
  { key: 'youtube', label: 'YouTube', base: 'https://youtube.com/@' },
  { key: 'web', label: 'Web', base: 'https://' },
] as const
export type Socials = Partial<Record<(typeof SOCIAL_NETWORKS)[number]['key'], string>>

/** „jano“ alebo „@jano“ alebo celý odkaz → odkaz na profil. */
export function socialUrl(base: string, value: string) {
  const text = value.trim()
  if (/^https?:\/\//i.test(text)) return text
  return base + text.replace(/^@/, '').replace(/^https?:\/\//i, '')
}
