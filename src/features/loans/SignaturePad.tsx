import { Eraser, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'

const WIDTH = 900
const HEIGHT = 360

type Props = {
  title: string
  /** Text nad plochou, napr. čo podpisom potvrdzuje. */
  statement: string
  defaultName: string
  saving: boolean
  error: boolean
  onSave: (name: string, image: string) => void
  onClose: () => void
}

/** Celoobrazovkový podpis prstom alebo perom; uloží sa ako PNG. */
export function SignaturePad({ title, statement, defaultName, saving, error, onSave, onClose }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const drawing = useRef<{ x: number; y: number } | null>(null)
  const [empty, setEmpty] = useState(true)
  const [name, setName] = useState(defaultName)

  useEffect(() => {
    const context = canvas.current!.getContext('2d')!
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, WIDTH, HEIGHT)
    context.lineWidth = 4
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.strokeStyle = '#111111'
  }, [])

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: ((event.clientX - rect.left) / rect.width) * WIDTH, y: ((event.clientY - rect.top) / rect.height) * HEIGHT }
  }
  const clear = () => {
    const context = canvas.current!.getContext('2d')!
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, WIDTH, HEIGHT)
    setEmpty(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col gap-3 overflow-y-auto bg-background p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="size-4" aria-hidden />
          Zavrieť
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{statement}</p>
      <Field label="Meno podpisujúceho" maxLength={120} value={name} onChange={(event) => setName(event.target.value)} />
      <div className="relative">
        <canvas
          ref={canvas}
          width={WIDTH}
          height={HEIGHT}
          aria-label="Plocha na podpis"
          className="block w-full touch-none rounded-xl border-2 border-dashed bg-white"
          style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            drawing.current = point(event)
          }}
          onPointerMove={(event) => {
            if (!drawing.current) return
            const next = point(event)
            const context = event.currentTarget.getContext('2d')!
            context.beginPath()
            context.moveTo(drawing.current.x, drawing.current.y)
            context.lineTo(next.x, next.y)
            context.stroke()
            drawing.current = next
            if (empty) setEmpty(false)
          }}
          onPointerUp={() => (drawing.current = null)}
          onPointerCancel={() => (drawing.current = null)}
        />
        {empty && <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-muted-foreground/60">Podpíšte sa sem prstom</p>}
      </div>
      {error && <p className="text-sm text-destructive">Podpis sa nepodarilo uložiť. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie.</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={clear} disabled={empty || saving}>
          <Eraser className="size-4" aria-hidden />
          Vymazať
        </Button>
        <Button disabled={empty || !name.trim() || saving} onClick={() => onSave(name, canvas.current!.toDataURL('image/png'))}>
          {saving ? 'Ukladám…' : 'Uložiť podpis'}
        </Button>
      </div>
    </div>
  )
}
