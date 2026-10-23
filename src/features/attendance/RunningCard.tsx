import { Coffee, Hourglass, LogOut, Play, UserCheck } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { formatMinutes, PAUSE_LABELS, timeOf, workedMinutes, type Attendance, type PauseKind } from './model'

type Running = Pick<Attendance, 'startedAt' | 'endedAt' | 'pausedAt' | 'pauseKind' | 'breakMinutes' | 'waitMinutes'>

type Props = {
  title: ReactNode
  record: Running
  busy: boolean
  failed: boolean
  /** Text potvrdenia pri „Končím“. */
  confirm: string
  onPause: (kind: PauseKind | null) => void
  onFinish: () => void
}

/** Rozbehnutá dochádzka: odpracovaný čas, Prestávka / Čakám / Pokračovať a Končím. */
export function RunningCard({ title, record, busy, failed, confirm, onPause, onFinish }: Props) {
  const [now, setNow] = useState(() => Date.now())
  // Odpracovaný čas sa prepočíta každú minútu.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="rounded-xl border border-emerald-600/40 bg-emerald-600/10 p-4">
      <p className="flex items-center gap-2">
        <UserCheck className="size-5 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden />
        {title}
      </p>
      <p className="mt-1 text-sm">
        Od {timeOf(record.startedAt)} · odpracované <span className="font-semibold">{formatMinutes(workedMinutes(record, now))}</span>
        {record.breakMinutes + record.waitMinutes > 0 && <span className="text-muted-foreground"> · odpočítané {formatMinutes(record.breakMinutes + record.waitMinutes)}</span>}
      </p>
      {record.pausedAt && (
        <p className="mt-1 text-sm font-medium text-accent">
          {PAUSE_LABELS[record.pauseKind ?? 'break']} od {timeOf(record.pausedAt)} – čas sa nepočíta
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {record.pausedAt ? (
          <Button disabled={busy} onClick={() => onPause(null)}>
            <Play className="size-4" aria-hidden />
            Pokračovať
          </Button>
        ) : (
          <>
            <Button variant="outline" disabled={busy} onClick={() => onPause('break')}>
              <Coffee className="size-4" aria-hidden />
              Prestávka
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => onPause('wait')} title="Napr. čakám na niekoho – čas sa nepočíta">
              <Hourglass className="size-4" aria-hidden />
              Čakám
            </Button>
          </>
        )}
        <Button variant="destructive" disabled={busy} onClick={() => window.confirm(confirm) && onFinish()}>
          <LogOut className="size-4" aria-hidden />
          Končím
        </Button>
      </div>
      {failed && <p className="mt-2 text-sm text-destructive">Nepodarilo sa uložiť. Skúste znova.</p>}
    </div>
  )
}
