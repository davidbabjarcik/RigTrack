import { useCompany } from '@/features/companies/company-context'
import { can } from '@/lib/permissions'
import { SectionTabs } from './SectionTabs'

/** Objednávky | Wantlist – podľa oprávnení. */
export function OrdersTabs() {
  const company = useCompany().active
  return (
    <SectionTabs
      tabs={[
        { to: '/orders', label: 'Objednávky', shown: !company || can(company, 'orders.view') },
        { to: '/shopping', label: 'Wantlist', shown: !company || can(company, 'shopping.view') },
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
        { to: '/service', label: 'Záznamy', shown: service },
        { to: '/service/requests', label: 'Žiadosti' },
        { to: '/technicians', label: 'Technici', shown: service },
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
        { to: '/calculators', label: 'Všetky' },
        { to: '/stage', label: 'Pódium Nivtec', shown: !company || can(company, 'events.view') },
        { to: '/delay', label: 'Delay' },
        { to: '/led', label: 'LED' },
        { to: '/dmx', label: 'DMX' },
      ]}
    />
  )
}
