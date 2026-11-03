import { ArrowLeft, Printer } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { useCompany } from '@/features/companies/company-context'
import { useNetworks } from './api'
import { wifiQrText } from './model'
import { QrCode } from './QrCode'

const PRINT_CSS = `
@page { size: A4; margin: 10mm; @top-left { content: ""; } @top-center { content: ""; } @top-right { content: ""; } @bottom-left { content: ""; } @bottom-center { content: ""; } @bottom-right { content: ""; } }
@media print { html, body { background: #fff !important; } }
`

/** QR kódy Wi-Fi sietí na A4 (naskenovaním sa mobil pripojí); heslo pod kódom sa dá skryť. /networks/qr */
export function WifiQrPrintPage() {
  const company = useCompany().active!
  const networks = useNetworks(company.companyId)
  const [hidden, setHidden] = useState<Set<string>>(() => new Set())
  const [showPassword, setShowPassword] = useState(false)

  if (networks.isPending) return <LoadingBlock />
  if (networks.isError) return <ErrorBlock message="Siete sa nepodarilo načítať." />
  // Bez hesla (nemáte oprávnenie ho vidieť) by QR nepripojil – takú sieť nie je čo tlačiť.
  const printable = networks.data.filter((network) => network.security === 'nopass' || network.password)
  const shown = printable.filter((network) => !hidden.has(network.id))

  return (
    <div className="min-h-dvh bg-background p-6 text-foreground print:bg-white print:p-0 print:text-black">
      <style>{PRINT_CSS}</style>
      <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
        <Link to="/networks" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden />
          Siete
        </Link>
        <span className="flex-1" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
          Heslo aj textom pod kódom
        </label>
        <Button disabled={shown.length === 0} onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden />
          Tlačiť / PDF
        </Button>
      </div>
      {printable.length < networks.data.length && (
        <p className="mb-3 text-sm text-muted-foreground print:hidden">Siete, ktorých heslo nevidíte (oprávnenie), sa nedajú vytlačiť ako QR.</p>
      )}
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm print:hidden">
        {printable.map((network) => (
          <label key={network.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              className="size-4"
              checked={!hidden.has(network.id)}
              onChange={() =>
                setHidden((current) => {
                  const next = new Set(current)
                  if (next.has(network.id)) next.delete(network.id)
                  else next.add(network.id)
                  return next
                })
              }
            />
            {network.ssid}
          </label>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nie je čo tlačiť.</p>
      ) : (
        <div className="mx-auto w-full max-w-[190mm] rounded-xl bg-white p-[6mm] text-black shadow-lg print:max-w-none print:rounded-none print:p-0 print:shadow-none">
          <ul className="grid grid-cols-2 gap-[6mm]">
            {shown.map((network) => (
              <li key={network.id} className="flex break-inside-avoid flex-col items-center rounded-lg border border-neutral-400 p-[5mm] text-center">
                <p className="mb-[2mm] text-[4mm] font-bold">Wi-Fi: {network.ssid}</p>
                <QrCode text={wifiQrText(network)} label={`QR kód siete ${network.ssid}`} className="w-[60mm] max-w-full" />
                {showPassword && network.security !== 'nopass' && <p className="mt-[2mm] font-mono text-[3.5mm]">Heslo: {network.password}</p>}
                <p className="mt-[1mm] text-[3mm] text-neutral-600">Naskenujte fotoaparátom mobilu · {company.companyName}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
