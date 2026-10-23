import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Coffee, Hourglass, LocateFixed, LogOut, MapPin, Play, UserCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { CompanyEvent } from '@/features/events/model'
import { checkIn, currentPosition, finish, setPause } from './api'
import { distanceM, formatDistance, formatMinutes, PAUSE_LABELS, PLACE_KIND_LABELS, timeOf, workedMinutes, type Attendance, type Meeting, type PauseKind } from './model'

type Props = { companyId: string; event: Pick<CompanyEvent, 'id' | 'name'>; meeting: Meeting | null; open: Attendance | null; showEvent?: boolean }

/** Moja dochádzka na evente: „Som tu“ na mieste stretávky, prestávka / čakanie a koniec. */
export function MyAttendanceCard({ companyId, event, meeting, open, showEvent }: Props) {
  const queryClient = useQueryClient()
  const [now, setNow] = useState(() => Date.now())
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['company', companyId] })
  const hasPoint = meeting?.lat != null && meeting?.lon != null

  // Odpracovaný čas sa prepočíta každú minútu.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

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
      <div className="rounded-xl border border-emerald-600/40 bg-emerald-600/10 p-4">
        <p className="flex items-center gap-2">
          <UserCheck className="size-5 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden />
          {title}
        </p>
        <p className="mt-1 text-sm">
          Od {timeOf(open.startedAt)} · odpracované <span className="font-semibold">{formatMinutes(workedMinutes(open, now))}</span>
          {open.breakMinutes + open.waitMinutes > 0 && <span className="text-muted-foreground"> · odpočítané {formatMinutes(open.breakMinutes + open.waitMinutes)}</span>}
        </p>
        {open.pausedAt && (
          <p className="mt-1 text-sm font-medium text-accent">
            {PAUSE_LABELS[open.pauseKind ?? 'break']} od {timeOf(open.pausedAt)} – čas sa nepočíta
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {open.pausedAt ? (
            <Button disabled={busy} onClick={() => pause.mutate(null)}>
              <Play className="size-4" aria-hidden />
              Pokračovať
            </Button>
          ) : (
            <>
              <Button variant="outline" disabled={busy} onClick={() => pause.mutate('break')}>
                <Coffee className="size-4" aria-hidden />
                Prestávka
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => pause.mutate('wait')} title="Napr. čakám na niekoho – čas sa nepočíta">
                <Hourglass className="size-4" aria-hidden />
                Čakám
              </Button>
            </>
          )}
          <Button variant="destructive" disabled={busy} onClick={() => window.confirm('Skončiť dochádzku? Zapíše sa do výkazu času.') && leave.mutate()}>
            <LogOut className="size-4" aria-hidden />
            Končím
          </Button>
        </div>
        {failed && <p className="mt-2 text-sm text-destructive">Nepodarilo sa uložiť. Skúste znova.</p>}
      </div>
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
