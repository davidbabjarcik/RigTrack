import { PageHeader } from '@/components/layout/PageHeader'
import { useCompany } from '@/features/companies/company-context'
import { SideWidgets } from './SideWidgets'

/** Karta „Môj panel“ (hlavne pre mobil): moje úlohy, kalendár, čísla – s vlastným rozložením pre mobil. */
export function PanelPage() {
  const company = useCompany().active!
  return (
    <>
      <PageHeader title="Môj panel" description="Moje úlohy, kalendár a čísla – čo tu chcete mať, nastavíte dole" />
      <SideWidgets company={company} layout="mobile" />
    </>
  )
}
