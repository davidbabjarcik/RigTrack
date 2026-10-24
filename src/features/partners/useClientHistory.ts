import { useQuery } from '@tanstack/react-query'
import { useCompany } from '@/features/companies/company-context'
import { bothBases, fetchCompanyIncome } from '@/features/events/income'
import { useEvents } from '@/features/events/useEvents'
import { useLoans } from '@/features/loans/useLoans'
import { can } from '@/lib/permissions'
import { fetchAllEventPartners, partnerKeys, type Partner } from './api'
import { clientEvents, loanMatches } from './history'

/** Podklady pre históriu klientov: eventy, väzby, výpožičky a (s oprávnením) príjmy z akcií. */
export function useClientHistory(companyId: string) {
  const company = useCompany().active!
  const seesIncome = can(company, 'payouts.manage')
  const events = useEvents(companyId)
  const links = useQuery({ queryKey: partnerKeys.links(companyId), queryFn: () => fetchAllEventPartners(companyId), retry: false })
  const loans = useLoans(companyId)
  const income = useQuery({ queryKey: ['company', companyId, 'income'], queryFn: () => fetchCompanyIncome(companyId), enabled: seesIncome, retry: false })
  const revenue = new Map<string, number>()
  for (const payment of income.data ?? []) revenue.set(payment.eventId, (revenue.get(payment.eventId) ?? 0) + (bothBases(payment).gross ?? payment.amount))

  return {
    ready: Boolean(events.data),
    seesIncome,
    eventsOf: (partner: Partner) => clientEvents(partner, events.data ?? [], links.data ?? [], (id) => revenue.get(id) ?? 0),
    loansOf: (partner: Partner) => (loans.data ?? []).filter((loan) => loanMatches(loan, partner)).sort((a, b) => b.startsOn.localeCompare(a.startsOn)),
  }
}
