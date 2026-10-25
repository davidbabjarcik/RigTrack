import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { LogoStyle } from './branding'
import type { LogoTone } from './logoImage'
import { useCompanyLogo } from './useCompanyLogo'

type Props = { companyId: string; className?: string; fallback?: ReactNode }

// Na podklade aplikácie (svetlom alebo tmavom podľa zvoleného režimu):
// tmavé logo sa v tmavom režime zmení na biele, svetlé v svetlom na čierne.
// Farebné logo sa neprefarbuje; v tmavom režime dostane bielu podložku.
const TONE_CLASSES: Record<LogoTone, string> = {
  dark: 'dark:brightness-0 dark:invert',
  light: 'brightness-0 dark:brightness-100',
  mixed: 'dark:rounded-md dark:bg-white dark:p-0.5',
}

// Ručne zvolené zobrazenie loga (Nastavenia → Štítky a logo) prebije automatiku.
const STYLE_CLASSES: Record<Exclude<LogoStyle, 'auto'>, string> = {
  original: '',
  plate: TONE_CLASSES.mixed,
  white: 'brightness-0 invert',
  black: 'brightness-0',
}

/** Triedy loga podľa zvoleného zobrazenia, pri „auto“ podľa farieb loga. */
export const logoClasses = (style: LogoStyle, tone: LogoTone) => (style === 'auto' ? TONE_CLASSES[tone] : STYLE_CLASSES[style])

/** Logo firmy, prispôsobené svetlému aj tmavému režimu. */
export function CompanyLogo({ companyId, className, fallback = null }: Props) {
  const { url, tone, style } = useCompanyLogo(companyId)
  if (!url) return fallback
  return <img src={url} alt="" className={cn('shrink-0 object-contain', logoClasses(style, tone), className)} />
}
