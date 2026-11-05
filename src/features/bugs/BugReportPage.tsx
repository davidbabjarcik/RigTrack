import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Bug, Camera, CheckCircle2, List, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, LinkButton } from '@/components/ui/button'
import { Field, TextareaField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { APP_VERSION } from '@/lib/version'
import { bugKeys, createBugReport } from './api'
import { bugSchema } from './model'
import { tx } from '@/lib/i18n'

/** Formulár na nahlásenie chyby. Stránku, verziu a prehliadač doplní sám. */
export function BugReportPage() {
  const company = useCompany().active!
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const pageUrl = params.get('from') ?? ''
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [screenshot, setScreenshot] = useState<{ file: File; url: string } | null>(null)
  const input = useRef<HTMLInputElement>(null)

  const choose = (file: File | null) => {
    if (screenshot) URL.revokeObjectURL(screenshot.url)
    setScreenshot(file ? { file, url: URL.createObjectURL(file) } : null)
  }
  // Screenshot sa dá vložiť aj cez Ctrl+V.
  useEffect(() => {
    function paste(event: ClipboardEvent) {
      const image = [...(event.clipboardData?.files ?? [])].find((file) => file.type.startsWith('image/'))
      if (!image) return
      event.preventDefault()
      setScreenshot((current) => {
        if (current) URL.revokeObjectURL(current.url)
        return { file: image, url: URL.createObjectURL(image) }
      })
    }
    window.addEventListener('paste', paste)
    return () => window.removeEventListener('paste', paste)
  }, [])

  const send = useMutation({
    mutationFn: () => createBugReport(company.companyId, bugSchema.parse({ title, description, pageUrl }), screenshot?.file ?? null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bugKeys.list(company.companyId) }),
  })
  const valid = bugSchema.safeParse({ title, description, pageUrl }).success
  function submit(event: FormEvent) {
    event.preventDefault()
    if (valid) send.mutate()
  }

  if (send.isSuccess) {
    return (
      <>
        <PageHeader title={tx('Nahlásiť chybu')} />
        <div className="rounded-xl border bg-surface p-6 text-center">
          <CheckCircle2 className="mx-auto size-10 text-emerald-600" aria-hidden />
          <p className="mt-2 font-medium">{tx('Ďakujeme, chyba je nahlásená.')}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {send.data.notified ? tx('Vývojár a admin firmy dostali e-mail.') : tx('Hlásenie uvidí vývojár a admin firmy v aplikácii.')}{' '}{tx('Stav sledujete v Hláseniach chýb.')}</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link to="/bugs" className="text-sm font-medium text-accent hover:underline">{tx('Moje hlásenia')}</Link>
            {pageUrl && (
              <Link to={pageUrl} className="text-sm font-medium text-accent hover:underline">{tx('Späť, kde som bol')}</Link>
            )}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={tx('Nahlásiť chybu')}
        description={tx('Čo nefunguje alebo čo by malo fungovať inak')}
        action={
          <LinkButton to="/bugs" variant="outline">
            <List className="size-4" aria-hidden />{tx('Hlásenia chýb')}</LinkButton>
        }
      />
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label={tx('Čo sa stalo? *')} placeholder={tx('napr. Po uložení eventu sa nezobrazí technika')} maxLength={160} autoFocus value={title} onChange={(event) => setTitle(event.target.value)} />
        <TextareaField
          label={tx('Podrobnosti')}
          rows={6}
          placeholder={tx('Čo ste robili, čo ste čakali a čo sa stalo namiesto toho.')}
          maxLength={4000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <div className="flex flex-wrap items-center gap-3">
          {screenshot ? (
            <span className="relative">
              <img src={screenshot.url} alt={tx('Priložený screenshot')} className="h-24 rounded-lg border object-cover" />
              <button type="button" aria-label={tx('Odobrať screenshot')} onClick={() => choose(null)} className="absolute -top-2 -right-2 rounded-full border bg-surface p-1">
                <X className="size-3.5" aria-hidden />
              </button>
            </span>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => input.current?.click()}>
            <Camera className="size-4" aria-hidden />
            {screenshot ? tx('Zmeniť screenshot') : tx('Priložiť screenshot')}
          </Button>
          <span className="text-xs text-muted-foreground">{tx('alebo ho vložte cez Ctrl+V')}</span>
          <input
            ref={input}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) choose(file)
            }}
          />
        </div>
        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">{tx('Automaticky sa priloží: stránka')}{' '}{pageUrl || tx('(neznáma)')}{tx(', verzia')}{' '}{APP_VERSION}{tx(', firma')}{' '}{company.companyName}{' '}{tx('a typ prehliadača.')}</p>
        {send.isError && (
          <p role="alert" className="text-sm text-destructive">{tx('Hlásenie sa nepodarilo odoslať. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie.')}</p>
        )}
        <Button type="submit" className="self-start" disabled={!valid || send.isPending}>
          <Bug className="size-4" aria-hidden />
          {send.isPending ? 'Odosielam…' : tx('Odoslať hlásenie')}
        </Button>
      </form>
    </>
  )
}
