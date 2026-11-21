import { useMutation } from '@tanstack/react-query'
import { Check, Copy, Link2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { tx } from '@/lib/i18n'
import { crewInviteLink, shareCrewInvite } from './crewInviteApi'

/** Pri externistovi v posádke: odkaz, cez ktorý bez prihlásenia potvrdí termín alebo napíše, prečo nemôže. */
export function CrewInviteButton({ crewId }: { crewId: string }) {
  const [copied, setCopied] = useState(false)
  const share = useMutation({ mutationFn: () => shareCrewInvite(crewId) })
  const url = share.data ? crewInviteLink(share.data) : ''
  const copy = () =>
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    })
  if (!url) {
    return (
      <span className="mt-1 flex flex-wrap items-center gap-2 text-sm">
        <Button size="sm" variant="outline" disabled={share.isPending} onClick={() => share.mutate()}>
          <Link2 className="size-4" aria-hidden />{tx('Odkaz na potvrdenie termínu')}
        </Button>
        {share.isError && <span className="text-destructive">{tx('Odkaz sa nepodarilo vytvoriť (migrácia 0183).')}</span>}
      </span>
    )
  }
  return (
    <span className="mt-1 flex flex-wrap items-center gap-2 text-sm">
      <input aria-label={tx('Odkaz na potvrdenie termínu')} readOnly className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm" value={url} onFocus={(focused) => focused.target.select()} />
      <Button size="sm" variant="outline" onClick={copy}>
        {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        {copied ? tx('Skopírované') : tx('Kopírovať')}
      </Button>
    </span>
  )
}
