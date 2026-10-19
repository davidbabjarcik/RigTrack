import { Copy, ExternalLink, Eye, EyeOff, Pencil, QrCode as QrIcon, Router, Wifi } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { Equipment } from '@/features/equipment/model'
import { managementUrl, wifiQrText, type RouterLogin, type WifiNetwork } from './model'
import { QrCode } from './QrCode'

function Secret({ label, value }: { label: string; value: string }) {
  const [shown, setShown] = useState(false)
  const [copied, setCopied] = useState(false)
  if (!value) return null
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono break-all">{shown ? value : '••••••••'}</code>
      <button type="button" className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={shown ? 'Skryť' : 'Ukázať'} onClick={() => setShown(!shown)}>
        {shown ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={`Skopírovať: ${label}`}
        onClick={() => {
          void navigator.clipboard?.writeText(value).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          })
        }}
      >
        <Copy className="size-4" aria-hidden />
        {copied && <span className="text-xs">skopírované</span>}
      </button>
    </div>
  )
}

/** Karta Wi-Fi siete: heslo, QR kód na pripojenie, router a jeho správa. */
export function WifiCard({ network, login, equipment, onEdit }: { network: WifiNetwork; login: RouterLogin | undefined; equipment: Equipment | undefined; onEdit?: () => void }) {
  const [qr, setQr] = useState(false)
  const admin = managementUrl(network)
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-surface p-4">
      <div className="flex items-start gap-3">
        <Wifi className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-medium break-words">{network.ssid}</p>
          <p className="text-sm text-muted-foreground">
            {[network.place, network.hidden && 'skrytá sieť', network.security === 'nopass' && 'bez hesla'].filter(Boolean).join(' · ') || 'Wi-Fi'}
          </p>
        </div>
        {onEdit && (
          <Button variant="ghost" size="sm" aria-label={`Upraviť ${network.ssid}`} onClick={onEdit}>
            <Pencil className="size-4" aria-hidden />
          </Button>
        )}
      </div>

      {network.security !== 'nopass' && <Secret label="Heslo" value={network.password} />}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setQr(!qr)} aria-expanded={qr}>
          <QrIcon className="size-4" aria-hidden />
          {qr ? 'Skryť QR' : 'Pripojiť (QR kód)'}
        </Button>
      </div>
      {qr && (
        <div className="flex flex-col items-center gap-2 rounded-lg border p-3">
          <QrCode text={wifiQrText(network)} label={`QR kód na pripojenie k sieti ${network.ssid}`} className="w-56 max-w-full" />
          <p className="text-center text-xs text-muted-foreground">
            Namierte fotoaparát druhého telefónu na QR kód a ťuknite na „Pripojiť“. Na tomto zariadení sa pripojíte v nastaveniach Wi-Fi s heslom vyššie
            (prehliadač sa sám pripojiť nevie).
          </p>
        </div>
      )}

      {(network.routerModel || network.subnet || network.routerIp || equipment || admin) && (
        <dl className="mt-1 flex flex-col gap-1 border-t pt-2 text-sm">
          {network.routerModel && (
            <div className="flex flex-wrap gap-x-1">
              <dt className="text-muted-foreground">Router:</dt>
              <dd className="inline-flex items-center gap-1">
                <Router className="size-3.5" aria-hidden />
                {network.routerModel}
              </dd>
            </div>
          )}
          {equipment && (
            <div className="flex flex-wrap gap-x-1">
              <dt className="text-muted-foreground">Technika:</dt>
              <dd>
                <Link to={`/equipment/${equipment.id}`} className="text-accent hover:underline">
                  {equipment.name}
                </Link>
              </dd>
            </div>
          )}
          {network.subnet && (
            <div className="flex flex-wrap gap-x-1">
              <dt className="text-muted-foreground">Rozsah:</dt>
              <dd className="font-mono">{network.subnet}</dd>
            </div>
          )}
          <div className="flex flex-wrap gap-x-1">
            <dt className="text-muted-foreground">DHCP:</dt>
            <dd className={network.dhcp ? 'font-mono' : undefined}>
              {network.dhcp ? (network.dhcpStart && network.dhcpEnd ? `${network.dhcpStart} – ${network.dhcpEnd}` : 'zapnuté') : 'vypnuté (len pevné IP)'}
            </dd>
          </div>
          {network.routerIp && (
            <div className="flex flex-wrap gap-x-1">
              <dt className="text-muted-foreground">Gateway:</dt>
              <dd className="font-mono">{network.routerIp}</dd>
            </div>
          )}
          {admin && (
            <div className="flex flex-wrap gap-x-1">
              <dt className="text-muted-foreground">Správa:</dt>
              <dd>
                <a href={admin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-accent hover:underline">
                  {network.managementIp || network.routerIp}
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              </dd>
            </div>
          )}
        </dl>
      )}
      {login && (login.username || login.password) && (
        <div className="flex flex-col gap-1 rounded-lg bg-muted/60 p-2">
          {login.username && <Secret label="Meno do správy" value={login.username} />}
          <Secret label="Heslo do správy" value={login.password} />
        </div>
      )}
      {network.note && <p className="text-sm whitespace-pre-wrap text-muted-foreground">{network.note}</p>}
    </div>
  )
}
