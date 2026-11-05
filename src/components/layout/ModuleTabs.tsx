import { useCompany } from '@/features/companies/company-context'
import { can } from '@/lib/permissions'
import { SectionTabs } from './SectionTabs'
import { tx } from '@/lib/i18n'

/** Objednávky | Wantlist – podľa oprávnení. */
export function OrdersTabs() {
  const company = useCompany().active
  return (
    <SectionTabs
      tabs={[
        { to: '/orders', label: tx('Objednávky'), shown: !company || can(company, 'orders.view') },
        { to: '/shopping', label: tx('Wantlist'), shown: !company || can(company, 'shopping.view') },
      ]}
    />
  )
}

/** Servis | Žiadosti o servis | Servisní technici. Žiadosti vidí každý (svoje). */
export function ServiceTabs() {
  const company = useCompany().active
  const service = !company || can(company, 'service.view')
  return (
    <SectionTabs
      tabs={[
        { to: '/service', label: tx('Záznamy'), shown: service },
        { to: '/service/requests', label: tx('Žiadosti') },
        { to: '/technicians', label: tx('Technici'), shown: service },
      ]}
    />
  )
}

/** Pódium | Delay | LED. */
export function CalculatorTabs() {
  const company = useCompany().active
  return (
    <SectionTabs
      tabs={[
        { to: '/calculators', label: tx('Všetky') },
        { to: '/stage', label: tx('Pódium Nivtec'), shown: !company || can(company, 'events.view') },
        { to: '/delay', label: tx('Delay') },
        { to: '/led', label: tx('LED') },
        { to: '/dmx', label: tx('DMX') },
      ]}
    />
  )
}
