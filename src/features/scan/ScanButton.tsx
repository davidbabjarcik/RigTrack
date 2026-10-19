import { ScanLine } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { LiveScanner } from './LiveScanner'
import { parseQr, qrPath } from './qr'

/** „Skenovať“: QR zo štítku otvorí detail techniky alebo case. */
export function ScanButton({ label = 'Skenovať' }: { label?: string }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <ScanLine className="size-4" aria-hidden />
        {label}
      </Button>
      {open && (
        <LiveScanner
          title="Skenovať štítok"
          onClose={() => setOpen(false)}
          onResult={(text) => {
            const target = parseQr(text)
            if (!target) return 'Tento QR kód nie je z RigTracku.'
            setOpen(false)
            navigate(qrPath(target))
          }}
        />
      )}
    </>
  )
}
