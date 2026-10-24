import { History, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { formatDate, todayIso } from '@/lib/format'
import { useCompany } from '@/features/companies/company-context'
import { can } from '@/lib/permissions'
import { usePartners, type Partner } from './api'
import { PartnerCard } from './PartnerCard'
import { PartnerForm } from './PartnerForm'
import { clientSummary, eventsLabel } from './history'
import { useClientHistory } from './useClientHistory'
import { LinkedPartnersSection } from '@/features/links/LinkedPartnersSection'

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
  const [sort, setSort] = useState<'name' | 'count' | 'last'>('name')
  const history = useClientHistory(company.companyId)
  const today = todayIso()

  if (partners.isPending) return <LoadingBlock />
  if (partners.isError) return <ErrorBlock message="Firmy sa nepodarilo načítať. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie." onRetry={() => void partners.refetch()} />
  const summaries = new Map(partners.data.map((partner) => [partner.id, clientSummary(history.eventsOf(partner), today)]))
  const visible = partners.data
    .filter((partner) => matches(partner, query))
    .sort((a, b) => {
      const left = summaries.get(a.id)!
      const right = summaries.get(b.id)!
      if (sort === 'count') return right.count - left.count || a.name.localeCompare(b.name, 'sk')
      if (sort === 'last') return (right.last?.startsOn ?? '').localeCompare(left.last?.startsOn ?? '') || a.name.localeCompare(b.name, 'sk')
      return 0
    })

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
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" aria-hidden />
          <Field label="Hľadať" hideLabel type="search" placeholder="Firma, IČO, meno, telefón" className="[&_input]:pl-9" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <SelectField label="Zoradiť" hideLabel className="sm:w-56" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
          <option value="name">Podľa názvu</option>
          <option value="count">Najviac akcií</option>
          <option value="last">Naposledy na akcii</option>
        </SelectField>
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
                <PartnerCard
                  companyId={company.companyId}
                  partner={partner}
                  canEdit={canEdit}
                  onEdit={() => setEditing(partner.id)}
                  actions={
                    <Link
                      to={`/partners/${partner.id}`}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-sm text-accent hover:bg-muted"
                      title={summaries.get(partner.id)!.last ? `naposledy ${formatDate(summaries.get(partner.id)!.last!.startsOn)}` : undefined}
                    >
                      <History className="size-4" aria-hidden />
                      {summaries.get(partner.id)!.count > 0 ? eventsLabel(summaries.get(partner.id)!.count) : 'História'}
                    </Link>
                  }
                />
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6">
        <LinkedPartnersSection companyId={company.companyId} own={partners.data} canEdit={canEdit} />
      </div>
    </>
  )
}
