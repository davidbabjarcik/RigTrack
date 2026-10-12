import { Construction } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'

type PlaceholderPageProps = {
  title: string
  description: string
}

/** Dočasná obrazovka routy, kým jej modul nie je implementovaný. */
export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-surface px-6 py-16 text-center">
        <Construction className="size-8 text-muted-foreground" aria-hidden />
        <p className="font-medium">Modul sa pripravuje</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Táto obrazovka je zatiaľ iba kostra. Funkcie pribudnú po pripojení databázy.
        </p>
      </div>
    </>
  )
}
