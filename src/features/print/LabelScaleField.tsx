import { useState } from 'react'
import { clampLabelScale, LABEL_SCALE_MAX, LABEL_SCALE_MIN, labelSizeCm } from './imposition'

/** Mierka štítku case v % (100 % = pôvodná veľkosť) s rozmerom v cm. */
export function LabelScaleField({ scale, onChange }: { scale: number; onChange: (scale: number) => void }) {
  const [draft, setDraft] = useState(String(scale))
  const commit = (value: string) => {
    const next = clampLabelScale(Number(value))
    setDraft(String(next))
    if (next !== scale) onChange(next)
  }
  return (
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor="label-scale">Veľkosť štítku case</label>
      <div className="flex items-center gap-2">
        <input
          type="range"
          aria-label="Mierka štítku (posuvník)"
          min={LABEL_SCALE_MIN}
          max={LABEL_SCALE_MAX}
          step={5}
          value={clampLabelScale(Number(draft))}
          onChange={(event) => setDraft(event.target.value)}
          onPointerUp={(event) => commit(event.currentTarget.value)}
          onKeyUp={(event) => commit(event.currentTarget.value)}
          className="w-32 accent-current"
        />
        <input
          id="label-scale"
          type="number"
          inputMode="numeric"
          min={LABEL_SCALE_MIN}
          max={LABEL_SCALE_MAX}
          className="h-10 w-20 rounded-lg border bg-background px-2"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => commit(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && commit(event.currentTarget.value)}
        />
        <span>%</span>
        <span className="text-muted-foreground" aria-live="polite">= {labelSizeCm(clampLabelScale(Number(draft)))}</span>
      </div>
    </div>
  )
}
