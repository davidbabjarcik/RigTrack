import { useQuery } from '@tanstack/react-query'
import { binKeys, purgeBin } from './api'

/**
 * Kôš sa čistí sám: keď aplikáciu otvorí admin, zmažú sa položky staršie než 30 dní.
 * Server na to nemá plánovač, preto to robí prvý admin, ktorý príde. Raz za otvorenie aplikácie;
 * zlyhanie nevadí, skúsi sa nabudúce. Nič nevykresľuje.
 */
export function BinAutoPurge({ companyId }: { companyId: string }) {
  useQuery({
    queryKey: binKeys.autoPurge(companyId),
    queryFn: () => purgeBin(companyId, 'expired'),
    staleTime: Infinity,
    retry: false,
  })
  return null
}
