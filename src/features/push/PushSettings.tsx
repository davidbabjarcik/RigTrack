import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, BellOff, Send } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { currentSubscription, disablePush, enablePush, pushSupport, sendTestPush } from './push'

const MESSAGES: Record<string, string> = {
  denied: 'Upozornenia sú v prehliadači zakázané. Povoľte ich v nastaveniach stránky (ikona zámku pri adrese) a skúste znova.',
  'not-configured': 'Upozornenia ešte nie sú na serveri nastavené – kontaktujte vývojára aplikácie.',
}

/** Push upozornenia na tomto zariadení: zapnúť / vypnúť a poslať skúšobné. */
export function PushSettings({ userId }: { userId: string }) {
  const queryClient = useQueryClient()
  const [support] = useState(pushSupport)
  const [message, setMessage] = useState('')
  const subscription = useQuery({ queryKey: ['push-subscription'], queryFn: async () => Boolean(await currentSubscription()), enabled: support === 'ok', retry: false })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['push-subscription'] })
  const toggle = useMutation({
    mutationFn: (on: boolean) => (on ? enablePush() : disablePush()),
    onMutate: () => setMessage(''),
    onError: (error) => setMessage(MESSAGES[(error as Error).message] ?? 'Upozornenia sa nepodarilo zapnúť. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie.'),
    onSettled: refresh,
  })
  const test = useMutation({
    mutationFn: () => sendTestPush(userId),
    onSuccess: () => setMessage('Skúšobné upozornenie je na ceste – o pár sekúnd by malo prísť.'),
    onError: () => setMessage('Skúšobné upozornenie sa nepodarilo poslať.'),
  })

  if (support === 'ios-home-screen') {
    return (
      <p className="rounded-xl border bg-surface p-4 text-sm">
        Na iPhone a iPade fungujú upozornenia len z appky pridanej na plochu (iOS 16.4 a novší): v Safari ťuknite na Zdieľať → Pridať na plochu,
        otvorte RigTrack z plochy a zapnite upozornenia tu.
      </p>
    )
  }
  if (support === 'unsupported') return <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">Tento prehliadač upozornenia nepodporuje.</p>

  const on = subscription.data === true
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-surface p-4">
      <p className="text-sm text-muted-foreground">
        Upozornenie príde, keď vás niekto pridá do posádky eventu alebo vám priradí úlohu – aj keď appku práve nemáte otvorenú. Platí pre toto
        zariadenie; na každom mobile ich zapnite zvlášť.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant={on ? 'outline' : 'default'} disabled={toggle.isPending || subscription.isPending} onClick={() => toggle.mutate(!on)}>
          {on ? <BellOff className="size-4" aria-hidden /> : <Bell className="size-4" aria-hidden />}
          {toggle.isPending ? 'Chvíľu…' : on ? 'Vypnúť upozornenia' : 'Zapnúť upozornenia'}
        </Button>
        {on && (
          <Button variant="outline" disabled={test.isPending} onClick={() => test.mutate()}>
            <Send className="size-4" aria-hidden />
            Poslať skúšobné
          </Button>
        )}
      </div>
      {message && <p className="text-sm">{message}</p>}
    </div>
  )
}
