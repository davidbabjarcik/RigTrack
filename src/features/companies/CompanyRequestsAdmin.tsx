import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { creationKeys, decideCompanyRequest, fetchPendingRequests } from './creation'

/** Vývojár: žiadosti o založenie novej firmy – schváliť (povolí zakladanie) alebo zamietnuť. */
export function CompanyRequestsAdmin() {
  const queryClient = useQueryClient()
  const pending = useQuery({ queryKey: creationKeys.pending, queryFn: fetchPendingRequests, retry: false })
  const decide = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) => decideCompanyRequest(id, approve),
    onSettled: () => queryClient.invalidateQueries({ queryKey: creationKeys.pending }),
  })

  if (pending.isError) return <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">Žiadosti zatiaľ nie sú dostupné – treba spustiť migráciu 0094.</p>
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        Novú firmu smie založiť len vývojár alebo človek, ktorému to povolíte. Schválením žiadosti mu založenie povolíte a príde mu upozornenie.
      </p>
      {(pending.data ?? []).length === 0 ? (
        <p className="rounded-xl border border-dashed bg-surface p-4 text-center text-sm text-muted-foreground">Žiadne čakajúce žiadosti.</p>
      ) : (
        <ul className="divide-y rounded-xl border bg-surface">
          {pending.data!.map((request) => (
            <li key={request.id} className="flex flex-wrap items-start gap-3 p-3 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{request.companyName}</span>
                <span className="block text-muted-foreground">
                  {[request.fullName, request.email, formatDate(request.createdAt.slice(0, 10))].filter(Boolean).join(' · ')}
                </span>
                {request.note && <span className="block">{request.note}</span>}
              </span>
              <Button size="sm" disabled={decide.isPending} onClick={() => decide.mutate({ id: request.id, approve: true })}>
                <Check className="size-4" aria-hidden />
                Schváliť
              </Button>
              <Button size="sm" variant="ghost" disabled={decide.isPending} onClick={() => decide.mutate({ id: request.id, approve: false })}>
                <X className="size-4" aria-hidden />
                Zamietnuť
              </Button>
            </li>
          ))}
        </ul>
      )}
      {decide.isError && <p className="text-sm text-destructive">Nepodarilo sa.</p>}
    </div>
  )
}
