import { Check, Copy, ExternalLink, KeyRound, RefreshCw, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { getSupabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import functionCode from '../../../supabase/functions/send-push/index.ts?raw'
import { generateVapidKeys, projectRef, type VapidKeys } from './vapid'
import { tx } from '@/lib/i18n'

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? ''

function CopyButton({ text, label = tx('Kopírovať') }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setDone(true)
          window.setTimeout(() => setDone(false), 1500)
        })
      }}
    >
      {done ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {done ? tx('Skopírované') : label}
    </Button>
  )
}

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent">{number}</span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <div className="mt-1 flex flex-col gap-2 text-sm text-muted-foreground">{children}</div>
      </div>
    </li>
  )
}

function DashboardLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 self-start font-medium text-accent hover:underline">
      {children}
      <ExternalLink className="size-3.5" aria-hidden />
    </a>
  )
}

type Status = { functionOk: boolean; hasPgNet: boolean; hasUrl: boolean; hasSecret: boolean }

/**
 * Sprievodca nastavením push upozornení bez príkazového riadku: kľúče sa vygenerujú tu v prehliadači,
 * kód funkcie sa skopíruje do editora v Supabase a namiesto Database Webhooku stačí jeden SQL príkaz.
 */
export function PushSetupGuide({ email }: { email: string }) {
  const ref = projectRef(SUPABASE_URL)
  const dashboard = `https://supabase.com/dashboard/project/${ref}`
  const functionUrl = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/send-push`
  const [keys, setKeys] = useState<VapidKeys | null>(null)
  const [status, setStatus] = useState<Status | null>(null)
  const [checking, setChecking] = useState(false)

  const secrets = keys
    ? [
        ['VAPID_PUBLIC_KEY', keys.publicKey],
        ['VAPID_PRIVATE_KEY', keys.privateKey],
        ['VAPID_SUBJECT', `mailto:${email}`],
        ['PUSH_WEBHOOK_SECRET', keys.webhookSecret],
      ]
    : []
  const sql = keys
    ? [
        `delete from vault.secrets where name in ('push_webhook_secret', 'push_function_url');`,
        `select vault.create_secret('${keys.webhookSecret}', 'push_webhook_secret');`,
        `select vault.create_secret('${functionUrl}', 'push_function_url');`,
      ].join('\n')
    : ''

  async function check() {
    setChecking(true)
    try {
      const db = getSupabase()
      const [fn, setup] = await Promise.all([db.functions.invoke('send-push', { method: 'GET' }), db.rpc('push_setup_status')])
      const row = ((setup.data as { has_pg_net: boolean; has_url: boolean; has_secret: boolean }[] | null) ?? [])[0]
      setStatus({
        functionOk: !fn.error && Boolean((fn.data as { publicKey?: string } | null)?.publicKey),
        hasPgNet: Boolean(row?.has_pg_net),
        hasUrl: Boolean(row?.has_url),
        hasSecret: Boolean(row?.has_secret),
      })
    } finally {
      setChecking(false)
    }
  }

  // Stav sa skontroluje sám pri otvorení; keď je všetko nastavené, kroky sa skryjú.
  const [redo, setRedo] = useState(false)
  useEffect(() => {
    if (!ref) return
    const timer = window.setTimeout(() => void check(), 0)
    return () => window.clearTimeout(timer)
  }, [ref])
  const ready = Boolean(status && status.functionOk && status.hasPgNet && status.hasUrl && status.hasSecret)

  if (!ref) return <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">{tx('Sprievodca funguje len s projektom na supabase.co.')}</p>

  if (!status && checking) return <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">{tx('Kontrolujem nastavenie push upozornení…')}</p>
  if (ready && !redo)
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-surface p-4">
        <Check className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <p className="flex-1 text-sm">
          <span className="font-medium">{tx('Push upozornenia sú nastavené.')}</span> <span className="text-muted-foreground">{tx('Funkcia send-push beží a databáza je s ňou prepojená.')}</span>
        </p>
        <Button size="sm" variant="outline" disabled={checking} onClick={() => void check()}>
          <RefreshCw className={cn('size-4', checking && 'animate-spin')} aria-hidden />{tx('Skontrolovať znova')}</Button>
        <Button size="sm" variant="ghost" onClick={() => setRedo(true)}>{tx('Nastaviť znova (nové kľúče)')}</Button>
      </div>
    )

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-surface p-4">
      <p className="text-sm text-muted-foreground">{tx('Robí sa raz pre celú appku (všetky firmy). Treba byť prihlásený v Supabase a mať spustenú migráciu')}{' '}<code>0088</code>{tx('. Príkazový riadok netreba.')}</p>
      <ol className="flex flex-col gap-5">
        <Step number={1} title={tx('Vygeneruj kľúče')}>
          <p>{tx('Kľúče vzniknú tu v prehliadači a nikam sa neukladajú – hneď ich vlož do Supabase (krok 2). Nikomu ich neposielaj.')}</p>
          <Button size="sm" className="self-start" onClick={() => void generateVapidKeys().then(setKeys)}>
            <KeyRound className="size-4" aria-hidden />
            {keys ? tx('Vygenerovať nové') : tx('Vygenerovať kľúče')}
          </Button>
        </Step>

        <Step number={2} title={tx('Ulož ich do tajomstiev funkcií')}>
          <DashboardLink href={`${dashboard}/functions/secrets`}>{tx('Otvoriť Edge Functions → Secrets')}</DashboardLink>
          <p>{tx('Pridaj tieto 4 tajomstvá (Name a Value) a ulož.')}</p>
          {keys ? (
            <ul className="flex flex-col gap-2">
              {secrets.map(([name, value]) => (
                <li key={name} className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
                  <code className="font-medium text-foreground">{name}</code>
                  <code className="min-w-0 flex-1 truncate text-xs">{name === 'VAPID_SUBJECT' ? value : '••••••••••••'}</code>
                  <CopyButton text={name} label={tx('Názov')} />
                  <CopyButton text={value} label={tx('Hodnota')} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="italic">{tx('Najprv krok 1.')}</p>
          )}
        </Step>

        <Step number={3} title={tx('Nasaď funkciu send-push')}>
          <DashboardLink href={`${dashboard}/functions`}>{tx('Otvoriť Edge Functions')}</DashboardLink>
          <p>
            <strong className="text-foreground">{tx('Deploy a new function → Via Editor')}</strong>{tx('. Názov funkcie')}{' '}<code className="text-foreground">{tx('send-push')}</code>{tx(', ukážkový kód zmaž, vlož tento a daj')}{' '}
            <strong className="text-foreground">{tx('Deploy')}</strong>.
          </p>
          <CopyButton text={functionCode} label={tx('Kopírovať kód funkcie')} />
          <p>{tx('Potom v detaile funkcie →')}{' '}<strong className="text-foreground">{tx('Details / Settings')}</strong>{' '}{tx('vypni')}{' '}<strong className="text-foreground">{tx('Verify JWT')}</strong>{' '}{tx('(overovanie JWT) a ulož.')}</p>
        </Step>

        <Step number={4} title={tx('Prepoj databázu s funkciou')}>
          <DashboardLink href={`${dashboard}/sql/new`}>{tx('Otvoriť SQL Editor')}</DashboardLink>
          <p>{tx('Vlož a spusti (Run). Ak si si predtým robil Database Webhook pre notifications, zmaž ho – inak príde upozornenie dvakrát.')}</p>
          {keys ? <CopyButton text={sql} label={tx('Kopírovať SQL')} /> : <p className="italic">{tx('Najprv krok 1 – SQL obsahuje tajomstvo z kroku 2.')}</p>}
        </Step>

        <Step number={5} title={tx('Skontroluj')}>
          <Button size="sm" variant="outline" className="self-start" disabled={checking} onClick={() => void check()}>
            <RefreshCw className={cn('size-4', checking && 'animate-spin')} aria-hidden />{tx('Skontrolovať nastavenie')}</Button>
          {status && (
            <ul className="flex flex-col gap-1">
              {[
                [status.functionOk, tx('Funkcia send-push beží a má kľúče (kroky 2 a 3)')],
                [status.hasPgNet, tx('Databáza vie volať funkciu (rozšírenie pg_net, migrácia 0088)')],
                [status.hasUrl && status.hasSecret, tx('Databáza pozná adresu funkcie a tajomstvo (krok 4)')],
              ].map(([ok, text]) => (
                <li key={String(text)} className={cn('flex items-center gap-2', ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
                  {ok ? <Check className="size-4" aria-hidden /> : <X className="size-4" aria-hidden />}
                  {text}
                </li>
              ))}
            </ul>
          )}
          <p>{tx('Keď je všetko zelené: vyššie v „Upozornenia na mobil“ zapni upozornenia a pošli si skúšobné.')}</p>
        </Step>
      </ol>
    </div>
  )
}
