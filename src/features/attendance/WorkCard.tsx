import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Home as HomeIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useCompanyProfile } from '@/features/companies/profile'
import { geocode } from '@/features/events/geo'
import { currentPosition } from './api'
import { distanceM, formatDistance } from './model'
import { RunningCard } from './RunningCard'
import { fetchOpenSession, finishSession, pauseSession, startSession, useHome, WORK_PLACE_LABELS, workKeys, type WorkPlace } from './workApi'

/** Polomer, v ktorom sa práca na firme / doma uzná. */
const RADIUS_M = 300

/** Práca mimo eventu (na firme alebo doma): začať na mieste, prestávky a koniec. */
export function WorkCard({ companyId, userId }: { companyId: string; userId: string }) {
  const queryClient = useQueryClient()
  const open = useQuery({ queryKey: [...workKeys.sessions(companyId), 'open'], queryFn: () => fetchOpenSession(companyId, userId), retry: false, refetchInterval: 60_000 })
  const home = useHome(companyId, userId)
  const profile = useCompanyProfile(companyId)
  const firmAddress = profile.data?.warehouseAddress || profile.data?.address || ''
  // Adresa firmy sa prevedie na súradnice raz a appka si ich pamätá.
  const firm = useQuery({ queryKey: ['geocode', firmAddress], queryFn: () => geocode(firmAddress), enabled: Boolean(firmAddress), staleTime: Infinity, gcTime: Infinity, retry: false })
  const [message, setMessage] = useState('')
  const refresh = () => queryClient.invalidateQueries({ queryKey: workKeys.sessions(companyId) })

  const start = useMutation({
    mutationFn: async (place: WorkPlace) => {
      const target = place === 'company' ? (firm.data ?? null) : home.data?.lat != null && home.data.lon != null ? { lat: home.data.lat, lon: home.data.lon } : null
      if (!target) {
        await startSession(companyId, place, false, null)
        return true
      }
      const position = await currentPosition()
      const distance = distanceM(position, target)
      if (distance > RADIUS_M) {
        setMessage(`Si ${formatDistance(distance)} od miesta (${place === 'company' ? 'firma' : 'domov'}) – začať sa dá do ${formatDistance(RADIUS_M)}.`)
        return false
      }
      await startSession(companyId, place, true, distance)
      return true
    },
    onMutate: () => setMessage(''),
    // Chyba polohy má číselný kód (zamietnuté, nedostupné, vypršal čas), chyba databázy textový.
    onError: (error) =>
      setMessage(typeof (error as { code?: unknown }).code === 'number' ? 'Polohu sa nepodarilo zistiť. Povoľte appke polohu v prehliadači.' : 'Nepodarilo sa uložiť.'),
    onSettled: refresh,
  })
  const pause = useMutation({ mutationFn: (kind: Parameters<typeof pauseSession>[1]) => pauseSession(open.data!.id, kind), onSettled: refresh })
  const finish = useMutation({ mutationFn: () => finishSession(open.data!.id), onSettled: refresh })

  if (open.isError) return null
  if (open.data) {
    return (
      <RunningCard
        title={
          <Link to="/attendance" className="font-medium hover:underline">
            Práca – {WORK_PLACE_LABELS[open.data.place].toLowerCase()}
          </Link>
        }
        record={open.data}
        busy={pause.isPending || finish.isPending}
        failed={pause.isError || finish.isError}
        confirm="Skončiť prácu? Zapíše sa do dochádzky."
        onPause={(kind) => pause.mutate(kind)}
        onFinish={() => finish.mutate()}
      />
    )
  }

  const homeMissing = !home.data?.address
  return (
    <div className="rounded-xl border bg-surface p-4">
      <p className="font-medium">
        Pracujem mimo eventu{' '}
        <Link to="/attendance" className="text-sm font-normal text-accent hover:underline">
          moja dochádzka
        </Link>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" disabled={start.isPending || open.isPending} onClick={() => start.mutate('company')}>
          <Building2 className="size-4" aria-hidden />
          Začať na firme
        </Button>
        <Button variant="outline" disabled={start.isPending || open.isPending || homeMissing} onClick={() => start.mutate('home')}>
          <HomeIcon className="size-4" aria-hidden />
          Začať doma
        </Button>
      </div>
      {start.isPending && <p className="mt-2 text-sm text-muted-foreground">Zisťujem polohu…</p>}
      {message && <p className="mt-2 text-sm text-destructive">{message}</p>}
      {homeMissing && (
        <p className="mt-2 text-sm text-muted-foreground">
          Prácu doma začnete po zadaní adresy v{' '}
          <Link to="/settings?tab=account" className="text-accent hover:underline">
            Nastaveniach → Účet → Dochádzka
          </Link>
          .
        </p>
      )}
      {home.data?.address && home.data.lat == null && <p className="mt-2 text-sm text-muted-foreground">Adresa domov nie je na mape – práca doma sa neoverí polohou.</p>}
    </div>
  )
}
