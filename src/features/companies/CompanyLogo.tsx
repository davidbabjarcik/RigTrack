import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { logoClasses } from './logoStyle'
import { useCompanyLogo } from './useCompanyLogo'

type Props = { companyId: string; className?: string; fallback?: ReactNode }

/** Logo firmy, prispôsobené svetlému aj tmavému režimu. */
export function CompanyLogo({ companyId, className, fallback = null }: Props) {
  const { url, tone, style } = useCompanyLogo(companyId)
  if (!url) return fallback
  return <img src={url} alt="" className={cn('shrink-0 object-contain', logoClasses(style, tone), className)} />
}
