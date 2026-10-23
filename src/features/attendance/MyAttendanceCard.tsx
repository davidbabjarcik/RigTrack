import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LocateFixed, MapPin, UserCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { CompanyEvent } from '@/features/events/model'
import { checkIn, currentPosition, finish, setPause } from './api'
import { distanceM, formatDistance, PLACE_KIND_LABELS, timeOf, type Attendance, type Meeting, type PauseKind } from './model'
import { RunningCard } from './RunningCard'

type Props = { companyId: string; event: Pick<CompanyEvent, 'id' | 'name'>; meeting: Meeting | null; open: Attendance | null; showEvent?: boolean }

/** Moja dochádzka na evente: „Som tu“ na mieste stretávky, prestávka / čakanie a koniec. */
export function MyAttendanceCard({ companyId, event, meeting, open, showEvent }: Props) {
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['company', companyId] })
  const hasPoint = meeting?.lat != null && meeting?.lon != null

  // Pred príchodom sa poloha zistí hneď (nikam sa neukladá, len sa porovná s miestom stretávky).
  const position = useQuery({ queryKey: ['position', meeting?.id], queryFn: currentPosition, enabled: !open && hasPoint, retry: false, staleTime: 30_000, gcTime: 0 })
  const where =
    position.isFetching
      ? ({ state: 'locating' } as const)
      : position.isError
        ? ({ state: 'denied' } as const)
        : position.data && hasPoint
          ? ({ state: 'found', distance: distanceM(position.data, { lat: meeting!.lat!, lon: meeting!.lon! }) } as const)
          : ({ state: 'idle' } as const)

  const arrive = useMutation({
    mutationFn: () => {
      const distance = where.state === 'found' ? where.distance : null
      return checkIn(companyId, event.id, meeting?.id ?? null, distance !== null && distance <= meeting!.radiusM, distance)
    },
    onSettled: refresh,
  })
  const pause = useMutation({ mutationFn: (kind: PauseKind | null) => setPause(open!.id, kind), onSettled: refresh })
  const leave = useMutation({ mutationFn: () => finish(open!.id), onSettled: refresh })
  const busy = arrive.isPending || pause.isPending || leave.isPending
  const failed = arrive.isError || pause.isError || leave.isError

  const title = showEvent ? (
    <Link to={`/events/${event.id}`} className="font-medium hover:underline">
      {event.name}
    </Link>
  ) : (
    <span className="font-medium">Moja dochádzka</span>
  )

  if (open) {
    return (
      <RunningCard
        title={title}
        record={open}
        busy={busy}
        failed={failed}
        confirm="Skončiť dochádzku? Zapíše sa do výkazu času."
        onPause={(kind) => pause.mutate(kind)}
        onFinish={() => leave.mutate()}
      />
    )
  }

  if (!meeting) return null
  const inside = where.state === 'found' && where.distance <= meeting.radiusM
  const canArrive = hasPoint ? inside : true
  return (
    <div className="rounded-xl border bg-surface p-4">
      <p className="flex items-center gap-2">
        <MapPin className="size-5 shrink-0 text-accent" aria-hidden />
        {title}
      </p>
      <p className="mt-1 text-sm">
        Stretávka <span className="font-semibold">{timeOf(meeting.meetAt)}</span> · {PLACE_KIND_LABELS[meeting.placeKind]}
        {meeting.address && (
          <>
            {' · '}
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meeting.address)}`} target="_blank" rel="noreferrer noopener" className="text-accent hover:underline">
              {meeting.address}
            </a>
          </>
        )}
      </p>
      {meeting.note && <p className="text-sm text-muted-foreground">{meeting.note}</p>}
      <p className="mt-2 text-sm" aria-live="polite">
        {!hasPoint
          ? 'Miesto nemá polohu na mape – príchod sa neoverí polohou.'
          : where.state === 'locating'
            ? 'Zisťujem polohu…'
            : where.state === 'denied'
              ? 'Polohu sa nepodarilo zistiť. Povoľte appke polohu v prehliadači a skúste znova.'
              : where.state === 'found'
                ? inside
                  ? `Si na mieste (${formatDistance(where.distance)}).`
                  : `Si ${formatDistance(where.distance)} od miesta stretávky – „Som tu“ sa odomkne do ${formatDistance(meeting.radiusM)}.`
                : ''}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button disabled={busy || !canArrive} onClick={() => arrive.mutate()}>
          <UserCheck className="size-4" aria-hidden />
          Som tu
        </Button>
        {hasPoint && where.state !== 'locating' && (
          <Button variant="outline" disabled={busy} onClick={() => void position.refetch()}>
            <LocateFixed className="size-4" aria-hidden />
            Zistiť polohu znova
          </Button>
        )}
      </div>
      {failed && <p className="mt-2 text-sm text-destructive">Nepodarilo sa uložiť. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie.</p>}
    </div>
  )
}
