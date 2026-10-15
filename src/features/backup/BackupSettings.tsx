import { useMutation } from '@tanstack/react-query'
import { Archive } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { downloadBackup } from './backup'

/** Stiahnutie celej firmy ako ZIP s Excelmi (technika, cases, sklad, objednávky, nákupy, autá, výpožičky, eventy…). */
export function BackupSettings({ companyId, companyName }: { companyId: string; companyName: string }) {
  const [current, setCurrent] = useState('')
  const backup = useMutation({
    mutationFn: () => downloadBackup(companyId, companyName, setCurrent),
    onSettled: () => setCurrent(''),
  })

  return (
    <div className="rounded-xl border bg-surface p-4">
      <p className="text-sm text-muted-foreground">
        Stiahne ZIP, v ňom jeden Excel na modul: technika, cases, sklad, objednávky, nákupy, vozidlá, výpožičky, eventy (aj príjmy),
        servis, úlohy, odmeny, návrhy a prílohy. Fotky a dokumenty v ňom nie sú, len ich zoznam.
      </p>
      <Button className="mt-3" disabled={backup.isPending} onClick={() => backup.mutate()}>
        <Archive className="size-4" aria-hidden />
        {backup.isPending ? `Pripravujem${current ? ` ${current}` : ''}…` : 'Stiahnuť všetko (ZIP)'}
      </Button>
      {backup.isSuccess && (
        <p role="status" className="mt-2 text-sm">
          Hotovo: {backup.data.files} súborov v ZIP.
          {backup.data.skipped.length > 0 && ` Niektoré tabuľky sa načítať nedali (${backup.data.skipped.length}), zoznam je v ČÍTAJ.txt.`}
        </p>
      )}
      {backup.isError && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          Zálohu sa nepodarilo pripraviť.
        </p>
      )}
    </div>
  )
}
