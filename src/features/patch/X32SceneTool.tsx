import { SlidersHorizontal } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { tf, tx } from '@/lib/i18n'
import type { PatchLine } from './model'
import type { OutputLine } from './outputs'
import { applyToScene, X32_MAX_SCENE_BYTES, type SceneResult } from './x32Scene'

function saveFile(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/octet-stream' }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Názov súboru bez diakritiky a znakov, ktoré USB kľúč v pulte nemusí zobraziť. */
const fileBase = (name: string) => name.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^A-Za-z0-9 _-]/g, '').trim().replace(/\s+/g, '_').slice(0, 40) || 'scena'

/**
 * Scéna Behringer X32 / M32: používateľ vyberie scénu uloženú z pultu (.scn), RigTrack do nej zapíše mená a farby
 * kanálov, phantom a mená busov a ponúkne ju na stiahnutie. Súbor sa spracuje len v prehliadači, nikam sa neposiela.
 */
export function X32SceneTool({ eventName, lines, outputs }: { eventName: string; lines: PatchLine[]; outputs: OutputLine[] }) {
  const input = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<(SceneResult & { source: string }) | null>(null)
  const [error, setError] = useState('')

  const read = async (file: File) => {
    setResult(null)
    if (file.size > X32_MAX_SCENE_BYTES) return setError(tx('Súbor je príliš veľký na scénu X32 / M32.'))
    try {
      setResult({ ...applyToScene(await file.text(), lines, outputs), source: file.name })
      setError('')
    } catch {
      setError(tx('Toto nie je scéna X32 / M32 (súbor .scn uložený z pultu).'))
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => input.current?.click()}>
        <SlidersHorizontal className="size-4" aria-hidden />
        {tx('Scéna X32 / M32')}
      </Button>
      <input ref={input} type="file" accept=".scn" className="sr-only" tabIndex={-1} aria-label={tx('Scéna X32 / M32')} onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void read(file) }} />
      {error && <p role="alert" className="basis-full text-sm text-destructive">{error}</p>}
      {result && (
        <div className="basis-full rounded-xl border border-accent/40 bg-accent/5 p-3 text-sm" role="dialog" aria-label={tx('Scéna X32 / M32')}>
          <p className="mb-1 font-medium">{tf('Scéna „{0}“ – zmenených riadkov: {1}.', result.source, result.changes.length)}</p>
          <p className="mb-2 text-muted-foreground">
            {tx('Zapíšu sa mená a farby kanálov 1–32, phantom podľa routingu vstupov a mená busov z výstupov („Mix 3“ → bus 3). Ostatné nastavenia scény ostanú bez zmeny. Mená majú na pulte max 12 znakov bez diakritiky.')}
          </p>
          {result.warnings.map((warning) => (
            <p key={warning} className="mb-1 text-amber-800 dark:text-amber-300">{warning}</p>
          ))}
          {result.changes.length > 0 && (
            <div className="max-h-72 overflow-auto rounded-lg border bg-surface p-2 font-mono text-xs">
              {result.changes.map((change, index) => (
                <div key={index} className="border-b py-1 last:border-0">
                  <div className="text-muted-foreground line-through">{change.before}</div>
                  <div>{change.after}</div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" disabled={result.changes.length === 0} onClick={() => saveFile(`${fileBase(eventName)}.scn`, result.text)}>
              {tx('Stiahnuť upravenú scénu')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setResult(null)}>{tx('Zavrieť')}</Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{tx('Na pulte: USB → načítať scénu. Pred koncertom skontrolujte zisk a routing – tie RigTrack nemení.')}</p>
        </div>
      )}
    </>
  )
}
