import { PageHeader } from '@/components/layout/PageHeader'
import { useCompany } from '@/features/companies/company-context'
import { SideWidgets } from './SideWidgets'
import { tx } from '@/lib/i18n'

/** Karta „Môj panel“ (hlavne pre mobil): moje úlohy, kalendár, čísla – s vlastným rozložením pre mobil. */
export function PanelPage() {
  const company = useCompany().active!
  return (
    <>
      <PageHeader title={tx('Môj panel')} description={tx('Moje úlohy, kalendár a čísla – čo tu chcete mať, nastavíte dole')} />
      <SideWidgets company={company} layout="mobile" />
    </>
  )
}
