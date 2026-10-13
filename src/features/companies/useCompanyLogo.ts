import { useQuery } from '@tanstack/react-query'
import { brandingKeys, fetchBranding, fetchLogoForDisplay } from './branding'
import type { LogoTone } from './logoImage'

/**
 * Logo firmy na zobrazenie: adresa (data URL; prázdna, kým sa načíta alebo keď firma logo nemá)
 * a tón, podľa ktorého sa logo prispôsobí svetlému či tmavému podkladu.
 */
export function useCompanyLogo(companyId: string): { url: string; tone: LogoTone } {
  const branding = useQuery({ queryKey: brandingKeys.branding(companyId), queryFn: () => fetchBranding(companyId) })
  const path = branding.data?.logoPath ?? ''
  const logo = useQuery({
    queryKey: [...brandingKeys.logo(companyId, path), 'display'],
    queryFn: () => fetchLogoForDisplay(path),
    enabled: Boolean(path),
    // Cesta loga sa pri každej zmene mení, takže obsah pod jednou cestou je nemenný.
    staleTime: Infinity,
  })
  return logo.data ?? { url: '', tone: 'mixed' }
}
