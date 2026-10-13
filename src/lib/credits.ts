// Podpis autora v pätičke aplikácie. Odkaz bez adresy sa nezobrazí.
export type CreditIcon = 'instagram' | 'discord' | 'linkedin' | 'github'

export const CREDITS: { author: string; links: { label: string; icon: CreditIcon; url: string }[] } = {
  author: 'DejvoLD',
  links: [
    { label: 'Instagram', icon: 'instagram', url: 'https://www.instagram.com/david.babjarcik/' },
    // Discord nemá verejnú adresu profilu podľa mena, len podľa číselného ID.
    { label: 'Discord', icon: 'discord', url: 'https://discord.com/users/521259942204932096' },
    { label: 'LinkedIn', icon: 'linkedin', url: 'https://www.linkedin.com/in/d%C3%A1vid-babjar%C4%8D%C3%ADk-45814a387/' },
    { label: 'GitHub', icon: 'github', url: 'https://github.com/davidbabjarcik' },
  ],
}
