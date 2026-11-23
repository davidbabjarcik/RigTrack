import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchLogoForDisplay, type LogoStyle } from '@/features/companies/branding'
import { logoClasses } from '@/features/companies/logoStyle'
import { formatDate, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { answerRental, fetchPublicRental, type PublicRental } from './api'

const LOGO_STYLES: LogoStyle[] = ['auto', 'original', 'plate', 'white', 'black']
type Answer = { available: string; price: string; note: string }

function Form({ token, data, onSaved }: { token: string; data: PublicRental; onSaved: () => void }) {
  const [answers, setAnswers] = useState<Record<string, Answer>>(() =>
    Object.fromEntries(data.items.map((item) => [item.id, { available: item.available === null ? '' : String(item.available), price: item.price === null ? '' : String(item.price), note: item.answer }])),
  )
  const [message, setMessage] = useState(data.message)
  const set = (id: string, patch: Partial<Answer>) => setAnswers((value) => ({ ...value, [id]: { ...value[id], ...patch } }))
  const save = useMutation({
    mutationFn: () =>
      answerRental(
        token,
        data.items.map((item) => ({ item_id: item.id, available: Math.max(0, Math.min(10000, Number(answers[item.id].available) || 0)), price: answers[item.id].price.replace(',', '.').trim(), note: answers[item.id].note })),
        message,
      ),
    onSuccess: onSaved,
  })
  const input = 'h-9 w-full rounded-lg border bg-background px-2 text-sm'
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        save.mutate()
      }}
    >
      <div className="overflow-x-auto rounded-xl border bg-surface">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="bg-muted text-xs text-muted-foreground">
            <tr>
              <th className="px-2 py-1.5">Položka</th>
              <th className="px-2 py-1.5">Treba ks</th>
              <th className="px-2 py-1.5">Máte ks</th>
              <th className="px-2 py-1.5">Cena za kus za obdobie (€)</th>
              <th className="px-2 py-1.5">Poznámka</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id} className="border-t align-top">
                <td className="px-2 py-1.5">{item.name}{item.note && <span className="block text-xs text-muted-foreground">{item.note}</span>}</td>
                <td className="px-2 py-1.5 font-semibold">{item.quantity}</td>
                <td className="px-2 py-1.5"><input aria-label={`Máte ks – ${item.name}`} type="number" min={0} max={10000} inputMode="numeric" disabled={!data.open} className={cn(input, 'w-20')} value={answers[item.id].available} onChange={(e) => set(item.id, { available: e.target.value })} /></td>
                <td className="px-2 py-1.5"><input aria-label={`Cena – ${item.name}`} inputMode="decimal" disabled={!data.open} pattern="\d{1,7}([.,]\d{1,2})?" className={cn(input, 'w-28')} value={answers[item.id].price} onChange={(e) => set(item.id, { price: e.target.value })} /></td>
                <td className="px-2 py-1.5"><input aria-label={`Poznámka – ${item.name}`} maxLength={200} disabled={!data.open} className={input} value={answers[item.id].note} onChange={(e) => set(item.id, { note: e.target.value })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Správa pre {data.companyName} (nepovinné)
        <textarea maxLength={1000} rows={3} disabled={!data.open} className="rounded-lg border bg-background p-2 font-normal" value={message} onChange={(e) => setMessage(e.target.value)} />
      </label>
      {data.open ? (
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={save.isPending} className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60">
            {data.respondedAt ? 'Uložiť zmenu odpovede' : 'Odoslať odpoveď'}
          </button>
          {save.isSuccess && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">Ďakujeme, odpoveď je uložená.</p>}
          {save.isError && <p role="alert" className="text-sm text-destructive">Odpoveď sa nepodarilo uložiť – skontrolujte čísla a skúste znova.</p>}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Dopyt je už uzavretý – odpoveď sa nedá meniť.</p>
      )}
    </form>
  )
}

/**
 * Dopyt na prenájom pre dodávateľa (r/:token, bez prihlásenia): kto sa pýta, termín, položky a formulár na dostupnosť
 * a cenu po riadkoch. Dodávateľ nevidí klienta ani ostatných dodávateľov. Stránka je len po slovensky.
 */
export function RentalAnswerPage() {
  const { token = '' } = useParams()
  const request = useQuery({ queryKey: ['rental-request', token], queryFn: () => fetchPublicRental(token), retry: false, refetchOnWindowFocus: false })
  const logoPath = request.data?.logoPath ?? ''
  const logo = useQuery({ queryKey: ['rental-request-logo', logoPath], queryFn: () => fetchLogoForDisplay(logoPath), enabled: Boolean(logoPath), retry: false, staleTime: Infinity })
  if (request.isPending) return <p className="min-h-dvh bg-background p-8 text-center text-sm text-muted-foreground">Načítavam…</p>
  if (request.isError || !request.data) {
    return <p className="min-h-dvh bg-background p-8 text-center text-sm text-muted-foreground">Odkaz sa nenašiel alebo už neplatí. Kontaktujte toho, kto vám ho poslal.</p>
  }
  const data = request.data
  const style = LOGO_STYLES.includes(data.logoStyle as LogoStyle) ? (data.logoStyle as LogoStyle) : 'auto'
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-8">
        <header className="border-b pb-4">
          {logo.data?.url ? (
            <img src={logo.data.url} alt={data.companyName} className={cn('mb-2 h-12 max-w-56 object-contain object-left', logoClasses(style, logo.data.tone))} />
          ) : (
            <p className="font-medium">{data.companyName}</p>
          )}
          {data.contact && <p className="text-xs whitespace-pre-line text-muted-foreground">{data.contact}</p>}
        </header>
        <div>
          <p className="text-sm text-muted-foreground">Dopyt na prenájom pre {data.supplier}</p>
          <h1 className="text-2xl font-semibold break-words">{data.title}</h1>
          <p className="mt-1 text-muted-foreground">{[`${formatDate(data.from)} – ${formatDate(data.to)}`, data.venue].filter(Boolean).join(' · ')}</p>
          {data.note && <p className="mt-2 whitespace-pre-line">{data.note}</p>}
          {data.respondedAt && <p className="mt-2 text-sm text-muted-foreground">Vaša odpoveď z {formatDateTime(data.respondedAt)} – môžete ju upraviť, kým je dopyt otvorený.</p>}
        </div>
        <Form key={data.respondedAt ?? 'new'} token={token} data={data} onSaved={() => void request.refetch()} />
      </main>
    </div>
  )
}
