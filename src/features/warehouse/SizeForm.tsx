import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { saveWarehouse, warehouseKeys } from './api'
import type { Warehouse } from './model'

/** Rozmery skladu v metroch (na stránke Sklad aj v Nastaveniach → Sklad). */
export function SizeForm({ companyId, current, onDone }: { companyId: string; current: Warehouse | null; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [length, setLength] = useState(current ? String(current.lengthCm / 100) : '')
  const [width, setWidth] = useState(current ? String(current.widthCm / 100) : '')
  const save = useMutation({
    mutationFn: (size: Warehouse) => saveWarehouse(companyId, size),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: warehouseKeys.plan(companyId) })
      onDone()
    },
  })
  const toCm = (value: string) => Math.round(Number(value.replace(',', '.')) * 100)
  const valid = [length, width].every((value) => toCm(value) >= 100 && toCm(value) <= 100000)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (valid) save.mutate({ lengthCm: toCm(length), widthCm: toCm(width) })
  }

  return (
    <form onSubmit={submit} className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border bg-surface p-4">
      <Field label="Dĺžka skladu (m)" inputMode="decimal" className="w-40" value={length} onChange={(e) => setLength(e.target.value)} />
      <Field label="Šírka skladu (m)" inputMode="decimal" className="w-40" value={width} onChange={(e) => setWidth(e.target.value)} />
      <Button type="submit" disabled={!valid || save.isPending}>
        {save.isPending ? 'Ukladám…' : 'Uložiť rozmery'}
      </Button>
      <p className="basis-full text-sm text-muted-foreground">
        Stačí približne – plán je pomôcka na orientáciu. Dĺžka je na pláne vodorovne, šírka zvislo; najmenej 1 m.
      </p>
      {save.isError && (
        <p role="alert" className="basis-full text-sm text-destructive">
          Rozmery sa nepodarilo uložiť.
        </p>
      )}
    </form>
  )
}
