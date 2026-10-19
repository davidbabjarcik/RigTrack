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
        <PageHeader title="Nahlásiť chybu" />
        <div className="rounded-xl border bg-surface p-6 text-center">
          <CheckCircle2 className="mx-auto size-10 text-emerald-600" aria-hidden />
          <p className="mt-2 font-medium">Ďakujeme, chyba je nahlásená.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {send.data.notified ? 'Vývojár a admin firmy dostali e-mail.' : 'Hlásenie uvidí vývojár a admin firmy v aplikácii.'} Stav sledujete v Hláseniach chýb.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link to="/bugs" className="text-sm font-medium text-accent hover:underline">
              Moje hlásenia
            </Link>
            {pageUrl && (
              <Link to={pageUrl} className="text-sm font-medium text-accent hover:underline">
                Späť, kde som bol
              </Link>
            )}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Nahlásiť chybu"
        description="Čo nefunguje alebo čo by malo fungovať inak"
        action={
          <LinkButton to="/bugs" variant="outline">
            <List className="size-4" aria-hidden />
            Hlásenia chýb
          </LinkButton>
        }
      />
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Čo sa stalo? *" placeholder="napr. Po uložení eventu sa nezobrazí technika" maxLength={160} autoFocus value={title} onChange={(event) => setTitle(event.target.value)} />
        <TextareaField
          label="Podrobnosti"
          rows={6}
          placeholder="Čo ste robili, čo ste čakali a čo sa stalo namiesto toho."
          maxLength={4000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <div className="flex flex-wrap items-center gap-3">
          {screenshot ? (
            <span className="relative">
              <img src={screenshot.url} alt="Priložený screenshot" className="h-24 rounded-lg border object-cover" />
              <button type="button" aria-label="Odobrať screenshot" onClick={() => choose(null)} className="absolute -top-2 -right-2 rounded-full border bg-surface p-1">
                <X className="size-3.5" aria-hidden />
              </button>
            </span>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => input.current?.click()}>
            <Camera className="size-4" aria-hidden />
            {screenshot ? 'Zmeniť screenshot' : 'Priložiť screenshot'}
          </Button>
          <span className="text-xs text-muted-foreground">alebo ho vložte cez Ctrl+V</span>
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
        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          Automaticky sa priloží: stránka {pageUrl || '(neznáma)'}, verzia {APP_VERSION}, firma {company.companyName} a typ prehliadača.
        </p>
        {send.isError && (
          <p role="alert" className="text-sm text-destructive">
            Hlásenie sa nepodarilo odoslať. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie.
          </p>
        )}
        <Button type="submit" className="self-start" disabled={!valid || send.isPending}>
          <Bug className="size-4" aria-hidden />
          {send.isPending ? 'Odosielam…' : 'Odoslať hlásenie'}
        </Button>
      </form>
    </>
  )
}
