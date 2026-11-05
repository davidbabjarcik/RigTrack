import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { AppErrorsPanel } from '@/features/bugs/AppErrorsPanel'
import { CatalogReviewPanel } from '@/features/equipment/CatalogReviewPanel'
import { PushSetupGuide } from '@/features/push/PushSetupGuide'
import { CompanyRequestsAdmin } from './CompanyRequestsAdmin'
import { DemoInvitesAdmin } from './DemoInvitesAdmin'
import { DeveloperUsers } from './DeveloperUsers'
import { MigrationStatus } from './MigrationStatus'
import { tx } from '@/lib/i18n'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <CollapsibleSection id={`developer.${title}`} title={title} className="mb-8">
      {children}
    </CollapsibleSection>
  )
}

/** Vývojár (pri výbere firmy, nezávisle od firmy): chyby v appke, stav databázy, push, pozvánky do dema a žiadosti o firmu. */
export function DeveloperPanel({ email }: { email: string }) {
  return (
    <>
      <Section title={tx('Chyby v appke')}>
        <AppErrorsPanel />
      </Section>
      <Section title={tx('Databáza techniky – návrhy na overenie')}>
        <Link to="/developer/catalog" className="mb-4 flex items-center justify-between gap-3 rounded-xl border bg-surface p-4 hover:bg-muted">
          <span>
            <span className="block font-medium">{tx('Celá databáza techniky')}</span>
            <span className="block text-sm text-muted-foreground">{tx('Filtre podľa druhu, značky a overenia, úprava modelov a ich údajov')}</span>
          </span>
          <span className="shrink-0 text-sm font-medium text-accent">{tx('Otvoriť')}</span>
        </Link>
        <CatalogReviewPanel />
      </Section>
      <Section title={tx('Používatelia – účty, posledné prihlásenie, firmy a role')}>
        <DeveloperUsers />
      </Section>
      <Section title={tx('Pozvať len do dema')}>
        <DemoInvitesAdmin />
      </Section>
      <Section title={tx('Žiadosti o novú firmu')}>
        <CompanyRequestsAdmin />
      </Section>
      <Section title={tx('Stav databázy')}>
        <MigrationStatus />
      </Section>
      <Section title={tx('Push upozornenia – nastavenie (raz pre appku)')}>
        <PushSetupGuide email={email} />
      </Section>
    </>
  )
}
