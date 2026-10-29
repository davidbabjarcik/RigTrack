import type { ReactNode } from 'react'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { PushSetupGuide } from '@/features/push/PushSetupGuide'
import { CompanyRequestsAdmin } from './CompanyRequestsAdmin'
import { DemoInvitesAdmin } from './DemoInvitesAdmin'
import { DeveloperUsers } from './DeveloperUsers'
import { MigrationStatus } from './MigrationStatus'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <CollapsibleSection id={`developer.${title}`} title={title} className="mb-8">
      {children}
    </CollapsibleSection>
  )
}

/** Vývojár (pri výbere firmy, nezávisle od firmy): stav databázy, push, pozvánky do dema a žiadosti o firmu. */
export function DeveloperPanel({ email }: { email: string }) {
  return (
    <>
      <Section title="Používatelia – účty, posledné prihlásenie, firmy a role">
        <DeveloperUsers />
      </Section>
      <Section title="Pozvať len do dema">
        <DemoInvitesAdmin />
      </Section>
      <Section title="Žiadosti o novú firmu">
        <CompanyRequestsAdmin />
      </Section>
      <Section title="Stav databázy">
        <MigrationStatus />
      </Section>
      <Section title="Push upozornenia – nastavenie (raz pre appku)">
        <PushSetupGuide email={email} />
      </Section>
    </>
  )
}
