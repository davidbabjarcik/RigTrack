import { CircleCheck, DatabaseZap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useMissingMigrations } from './migrationProbes'

const STEPS = 'V Supabase → SQL Editor spustite chýbajúce súbory podľa čísla od najnižšieho: 0020–0048 sú v supabase/upgrade/, 0049 a vyššie v supabase/migrations/ (0053 samostatne pred 0054).'

/** Stav databázy v Nastaveniach: ktoré migrácie chýbajú a čo s tým. */
export function MigrationStatus() {
  const missing = useMissingMigrations()
  if (missing.isPending) return <p className="text-sm text-muted-foreground">Kontrolujem databázu…</p>
  if (missing.isError) return <p className="text-sm text-destructive">Databázu sa nepodarilo skontrolovať.</p>
  if (missing.data.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-xl border bg-surface p-4 text-sm">
        <CircleCheck className="size-5 shrink-0 text-emerald-600" aria-hidden />
        Databáza má všetky migrácie, ktoré appka potrebuje.
      </p>
    )
  }
  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
      <p className="font-medium">V databáze chýbajú migrácie – niektoré časti appky preto nefungujú:</p>
      <ul className="mt-2 list-disc pl-5">
        {missing.data.map((probe) => (
          <li key={probe.migration}>
            <strong>{probe.migration}</strong> – {probe.label}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-muted-foreground">{STEPS} Presný zoznam vypíše supabase/check-migrations.sql.</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={() => void missing.refetch()}>
        Skontrolovať znova
      </Button>
    </div>
  )
}

/** Upozornenie pre admina na Prehľade, keď databáze chýbajú migrácie. */
export function MigrationBanner() {
  const missing = useMissingMigrations()
  if (!missing.data || missing.data.length === 0) return null
  return (
    <Link to="/settings" className="mb-4 flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 hover:bg-destructive/10">
      <DatabaseZap className="size-5 shrink-0 text-destructive" aria-hidden />
      <span className="min-w-0 flex-1 text-sm">
        <span className="block font-medium">Databáze chýbajú migrácie: {missing.data.map((probe) => probe.migration).join(', ')}</span>
        <span className="block text-muted-foreground">Niektoré časti appky (napr. {missing.data[0].label}) preto nefungujú. Postup nájdete v Nastaveniach → Stav databázy.</span>
      </span>
    </Link>
  )
}
