import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
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

/** Logo firmy, prispôsobené svetlému aj tmavému režimu. */
export function CompanyLogo({ companyId, className, fallback = null }: Props) {
  const { url, tone } = useCompanyLogo(companyId)
  if (!url) return fallback
  return <img src={url} alt="" className={cn('shrink-0 object-contain', TONE_CLASSES[tone], className)} />
}
