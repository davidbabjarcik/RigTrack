import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Archive, FileSpreadsheet, FileUp } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { SelectField } from '@/components/ui/field'
import { BACKUP_FILES, downloadBackup, downloadRestoreReport, restoreBackup } from './backup'

/** Export celej firmy (ZIP) alebo jedného modulu (Excel), obnova zo zálohy a import techniky z Excelu. */
export function BackupSettings({ companyId, companyName }: { companyId: string; companyName: string }) {
  const queryClient = useQueryClient()
  const [current, setCurrent] = useState('')
  const [module, setModule] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const backup = useMutation({
    mutationFn: () => downloadBackup(companyId, companyName, setCurrent, module || undefined),
    onSettled: () => setCurrent(''),
  })
  const restore = useMutation({
    mutationFn: (file: File) => restoreBackup(companyId, file, setCurrent),
    onSettled: async () => {
      setCurrent('')
      await queryClient.invalidateQueries({ queryKey: ['company', companyId] })
    },
  })
  const failed = restore.data?.filter((item) => item.error) ?? []
  const added = restore.data?.reduce((sum, item) => sum + item.inserted, 0) ?? 0

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border bg-surface p-4">
        <p className="font-medium">Export</p>
        <p className="text-sm text-muted-foreground">
          Všetko ako ZIP (jeden Excel na modul) alebo len jeden modul ako Excel. Fotky a dokumenty v ňom nie sú, len ich zoznam.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <SelectField label="Čo exportovať" className="w-64" value={module} onChange={(e) => setModule(e.target.value)}>
            <option value="">Všetko (ZIP)</option>
            {BACKUP_FILES.map((item) => (
              <option key={item.file} value={item.file}>
                {item.file.replace(/\.xlsx$/, '')}
              </option>
            ))}
          </SelectField>
          <Button disabled={backup.isPending || restore.isPending} onClick={() => backup.mutate()}>
            <Archive className="size-4" aria-hidden />
            {backup.isPending ? `Pripravujem${current ? ` ${current}` : ''}…` : module ? 'Stiahnuť Excel' : 'Stiahnuť všetko (ZIP)'}
          </Button>
        </div>
        {backup.isSuccess && (
          <p role="status" className="mt-2 text-sm">
            Hotovo{backup.data.files > 1 ? `: ${backup.data.files} súborov v ZIP` : ''}.
            {backup.data.skipped.length > 0 && ` Niektoré tabuľky sa načítať nedali (${backup.data.skipped.length}).`}
          </p>
        )}
        {backup.isError && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            Export sa nepodarilo pripraviť.
          </p>
        )}
      </div>

      <div className="rounded-xl border bg-surface p-4">
        <p className="font-medium">Import</p>
        <p className="text-sm text-muted-foreground">
          <strong>Obnova zo zálohy:</strong> nahrajte ZIP alebo jeden Excel z exportu tejto firmy. Doplnia sa záznamy, ktoré vo firme chýbajú (napr. omylom
          zmazané); existujúce sa nezmenia.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" disabled={restore.isPending || backup.isPending} onClick={() => input.current?.click()}>
            <FileUp className="size-4" aria-hidden />
            {restore.isPending ? `Obnovujem${current ? ` ${current}` : ''}…` : 'Obnoviť zo zálohy (ZIP / Excel)'}
          </Button>
          <Link to="/equipment/excel" className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted">
            <FileSpreadsheet className="size-4" aria-hidden />
            Technika z Excelu (import / export)
          </Link>
        </div>
        <input
          ref={input}
          type="file"
          accept=".zip,.xlsx,application/zip,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file && window.confirm(`Obnoviť chýbajúce záznamy zo súboru ${file.name}?`)) restore.mutate(file)
          }}
        />
        {restore.isSuccess && (
          <div role="status" className="mt-2 text-sm">
            <p>
              Hotovo: doplnených {added} záznamov{failed.length > 0 && `, ${failed.length} tabuliek sa nedalo obnoviť`}.{' '}
              <button type="button" className="text-accent hover:underline" onClick={() => downloadRestoreReport(restore.data)}>
                Stiahnuť podrobnosti
              </button>
            </p>
            {failed.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                {failed.slice(0, 6).map((item) => (
                  <li key={item.table}>
                    {item.label}: {item.error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {restore.isError && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {restore.error instanceof Error ? restore.error.message : 'Obnova zlyhala.'}
          </p>
        )}
      </div>
    </div>
  )
}
