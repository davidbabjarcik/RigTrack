import { ScanLine } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { LiveScanner } from './LiveScanner'
import { parseQr, qrPath } from './qr'
import { useT, tx } from '@/lib/i18n'

/** „Skenovať“: QR zo štítku otvorí detail techniky alebo case. */
export function ScanButton({ label = tx('Skenovať'), compact = false }: { label?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const t = useT()
  return (
    <>
      <Button variant="outline" className={compact ? 'max-sm:px-3' : undefined} onClick={() => setOpen(true)}>
        <ScanLine className="size-4" aria-hidden />
        {/* compact: na mobile len ikona (text ostane pre čítačky), aby sa tlačidlá zmestili do riadku. */}
        <span className={compact ? 'max-sm:sr-only' : undefined}>{label}</span>
      </Button>
      {open && (
        <LiveScanner
          title={t('Skenovať štítok', 'Scan a label')}
          onClose={() => setOpen(false)}
          onResult={(text) => {
            const target = parseQr(text)
            if (!target) return t('Tento QR kód nie je z RigTracku.', 'This QR code is not from RigTrack.')
            setOpen(false)
            navigate(qrPath(target))
          }}
        />
      )}
    </>
  )
}
