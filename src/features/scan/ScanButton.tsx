import { ScanLine } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { LiveScanner } from './LiveScanner'
import { parseQr, qrPath } from './qr'
import { useT } from '@/lib/i18n'

/** „Skenovať“: QR zo štítku otvorí detail techniky alebo case. */
export function ScanButton({ label = 'Skenovať' }: { label?: string }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const t = useT()
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <ScanLine className="size-4" aria-hidden />
        {label}
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
