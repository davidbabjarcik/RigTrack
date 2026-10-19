import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { can } from '@/lib/permissions'
import { usePartners, type Partner } from './api'
import { PartnerCard } from './PartnerCard'
import { PartnerForm } from './PartnerForm'

const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function matches(partner: Partner, query: string) {
  const q = fold(query.trim())
  if (!q) return true
  return fold([partner.name, partner.ico, partner.address, ...partner.contacts.flatMap((contact) => [contact.name, contact.phone, contact.email])].join(' ')).includes(q)
}

/** Firmy a kontakty: organizátori, partneri a ľudia z nich – na eventy aj do budúcna. */
export function PartnersPage() {
  const company = useCompany().active!
  const canEdit = can(company, 'events.edit')
  const partners = usePartners(company.companyId)
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [query, setQuery] = useState('')

  if (partners.isPending) return <LoadingBlock />
  if (partners.isError) return <ErrorBlock message="Firmy sa nepodarilo načítať. Ak ste ešte nespustili migráciu 0059, urobte to." onRetry={() => void partners.refetch()} />
  const visible = partners.data.filter((partner) => matches(partner, query))

  return (
    <>
      <PageHeader
        title="Firmy a kontakty"
        description="Organizátori, partneri a ľudia z nich"
        action={
          canEdit && editing !== 'new' ? (
            <Button onClick={() => setEditing('new')}>
              <Plus className="size-4" aria-hidden />
              Pridať firmu
            </Button>
          ) : undefined
        }
      />
      {editing === 'new' && (
        <div className="mb-4">
          <PartnerForm companyId={company.companyId} current={null} onDone={() => setEditing(null)} />
        </div>
      )}
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" aria-hidden />
        <Field label="Hľadať" hideLabel type="search" placeholder="Firma, IČO, meno, telefón" className="[&_input]:pl-9" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-surface p-8 text-center text-sm text-muted-foreground">
          {partners.data.length === 0 ? 'Zatiaľ žiadne firmy. Pridajte organizátora (napr. obec, agentúru) a ľudí s číslami.' : 'Nikto nezodpovedá hľadaniu.'}
        </p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {visible.map((partner) => (
            <li key={partner.id}>
              {editing === partner.id ? (
                <PartnerForm companyId={company.companyId} current={partner} onDone={() => setEditing(null)} />
              ) : (
                <PartnerCard companyId={company.companyId} partner={partner} canEdit={canEdit} onEdit={() => setEditing(partner.id)} />
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
