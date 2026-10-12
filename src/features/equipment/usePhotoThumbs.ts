import { useQuery } from '@tanstack/react-query'
import { fetchThumbUrls, PHOTO_URL_STALE_MS } from './photo'

const NONE: Record<string, string> = {}

/**
 * Odkazy na náhľady fotiek pre zoznam techniky: mapa cesta fotky → adresa obrázka.
 * Všetky sa vypýtajú jedným dotazom; kým sa načítajú (alebo pri chybe) je mapa prázdna.
 */
export function usePhotoThumbs(companyId: string, photoPaths: string[]) {
  const paths = [...new Set(photoPaths.filter(Boolean))].sort()
  const thumbs = useQuery({
    queryKey: ['company', companyId, 'photo-thumbs', paths],
    queryFn: () => fetchThumbUrls(paths),
    enabled: paths.length > 0,
    staleTime: PHOTO_URL_STALE_MS,
    // Pri zmene zoznamu nech doterajšie obrázky neprebliknú na prázdne miesto.
    placeholderData: (previous) => previous,
  })
  return thumbs.data ?? NONE
}
