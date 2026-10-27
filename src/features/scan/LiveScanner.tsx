import { Flashlight, FlashlightOff, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { QrScanButton } from '@/features/networks/QrScanButton'

type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> }
type DetectorClass = { new (options: { formats: string[] }): Detector; getSupportedFormats?: () => Promise<string[]> }

/** Čítačka: zabudovaná v prehliadači (Android Chrome), inak jsQR zo snímky videa. */
async function createReader(): Promise<(video: HTMLVideoElement) => Promise<string | null>> {
  const Native = (window as unknown as { BarcodeDetector?: DetectorClass }).BarcodeDetector
  if (Native && (await Native.getSupportedFormats?.())?.includes('qr_code')) {
    const detector = new Native({ formats: ['qr_code'] })
    return async (video) => (await detector.detect(video))[0]?.rawValue ?? null
  }
  const { default: jsQR } = await import('jsqr')
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })!
  return async (video) => {
    const scale = Math.min(1, 800 / Math.max(video.videoWidth, video.videoHeight))
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    if (!canvas.width || !canvas.height) return null
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
    return jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'dontInvert' })?.data ?? null
  }
}

type Props = {
  title: string
  /** Spracuje prečítaný text; vrátená správa sa ukáže pod obrazom (pri skenovaní viacerých kódov za sebou). */
  onResult: (text: string) => string | void
  onClose: () => void
}

/** Celoobrazovkové skenovanie QR kódov zadnou kamerou. Ten istý kód sa znova spracuje až po chvíli. */
export function LiveScanner({ title, onResult, onClose }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const handler = useRef(onResult)
  // Blesk (baterka) zadnej kamery – len kde to prehliadač dovolí (hlavne Android Chrome).
  const track = useRef<MediaStreamTrack | null>(null)
  const [torchAvailable, setTorchAvailable] = useState(false)
  const [torch, setTorch] = useState(false)
  const toggleTorch = async () => {
    const next = !torch
    try {
      await track.current?.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] })
      setTorch(next)
    } catch {
      setTorchAvailable(false)
    }
  }
  useEffect(() => {
    handler.current = onResult
  }, [onResult])

  useEffect(() => {
    let stream: MediaStream | null = null
    let stopped = false
    let timer = 0
    const last = { text: '', at: 0 }
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        if (stopped || !video.current) return
        video.current.srcObject = stream
        track.current = stream.getVideoTracks()[0] ?? null
        const capabilities = (track.current?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean }
        if (capabilities.torch) setTorchAvailable(true)
        await video.current.play()
        const read = await createReader()
        const tick = async () => {
          if (stopped || !video.current) return
          try {
            const text = video.current.readyState >= 2 ? await read(video.current) : null
            const now = Date.now()
            if (text && (text !== last.text || now - last.at > 2500)) {
              last.text = text
              last.at = now
              navigator.vibrate?.(60)
              const result = handler.current(text)
              if (result) setMessage(result)
            }
          } catch {
            // Jedna nepodarená snímka nevadí, skúsi sa ďalšia.
          }
          timer = window.setTimeout(tick, 200)
        }
        void tick()
      } catch {
        if (!stopped) setFailed(true)
      }
    })()
    return () => {
      stopped = true
      window.clearTimeout(timer)
      stream?.getTracks().forEach((item) => item.stop())
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex items-center justify-between gap-3 p-3">
        <p className="font-medium">{title}</p>
        <div className="flex gap-2">
          {torchAvailable && !failed && (
            <Button variant="outline" size="sm" aria-pressed={torch} className={torch ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white'} onClick={() => void toggleTorch()}>
              {torch ? <FlashlightOff className="size-4" aria-hidden /> : <Flashlight className="size-4" aria-hidden />}
              {torch ? 'Vypnúť blesk' : 'Blesk'}
            </Button>
          )}
          <Button variant="outline" size="sm" className="bg-black text-white" onClick={onClose}>
            <X className="size-4" aria-hidden />
            Zavrieť
          </Button>
        </div>
      </div>
      {failed ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <p>Kamera sa nespustila (chýba povolenie alebo ju používa iná appka). QR kód môžete aj odfotiť:</p>
          <QrScanButton
            label="Odfotiť QR kód"
            onText={(text) => {
              const result = handler.current(text)
              if (result) setMessage(result)
            }}
          />
        </div>
      ) : (
        <div className="relative flex-1 overflow-hidden">
          <video ref={video} className="size-full object-cover" playsInline muted />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="aspect-square w-2/3 max-w-80 rounded-2xl border-4 border-white/80" />
          </div>
        </div>
      )}
      <p className="min-h-14 p-4 text-center text-lg" aria-live="polite">
        {message || 'Namierte kameru na QR kód na štítku.'}
      </p>
    </div>
  )
}
