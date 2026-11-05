import type { ReactNode } from 'react'
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
