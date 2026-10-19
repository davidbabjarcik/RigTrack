import { ScanLine } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

/** Prečíta QR kód z obrázka (na mobile rovno z fotoaparátu). Vráti text, alebo null, keď QR nenájde. */
async function readQr(file: File) {
  const [{ default: jsQR }, bitmap] = await Promise.all([import('jsqr'), createImageBitmap(file)])
  // Veľké fotky sa zmenšia – QR sa nájde rýchlejšie a stačí to.
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')!
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
  return jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'attemptBoth' })?.data ?? null
}

/** Tlačidlo „Naskenovať QR kód“: odfotí alebo vyberie obrázok s QR kódom a vráti jeho text. */
export function QrScanButton({ onText, label = 'Naskenovať QR kód' }: { onText: (text: string) => void; label?: string }) {
  const input = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<'idle' | 'reading' | 'missing'>('idle')
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" disabled={state === 'reading'} onClick={() => input.current?.click()}>
        <ScanLine className="size-4" aria-hidden />
        {state === 'reading' ? 'Čítam QR…' : label}
      </Button>
      {state === 'missing' && <span className="text-sm text-destructive">QR kód som na obrázku nenašiel. Skúste ho odfotiť zblízka a ostro.</span>}
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        onChange={async (event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          setState('reading')
          try {
            const text = await readQr(file)
            if (text) {
              setState('idle')
              onText(text)
            } else {
              setState('missing')
            }
          } catch {
            setState('missing')
          }
        }}
      />
    </span>
  )
}
