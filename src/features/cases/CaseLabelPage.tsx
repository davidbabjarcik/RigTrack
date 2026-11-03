import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Download } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AddToPrintButton } from '@/features/print/AddToPrintButton'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { brandingKeys, fetchBranding, fetchLogoBlob, logoForLightBackground } from '@/features/companies/branding'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { fetchPhotoBlob } from '@/features/equipment/photo'
import { can } from '@/lib/permissions'
import { caseKeys } from './api'
import { downloadCanvas, fileSlug } from './canvas'
import { CustomLabelContent } from './CustomLabelContent'
import { LABEL_HEIGHT, LABEL_WIDTH } from './label'
import { caseLabelContent, drawCaseLabelFor } from './renderSheets'
import { useCases } from './useCases'

export function CaseLabelPage() {
  const { id = '' } = useParams()
  const [backParams] = useSearchParams()
  const company = useCompany().active!
  const companyId = company.companyId
  const canvas = useRef<HTMLCanvasElement>(null)
  const [drawn, setDrawn] = useState(false)
  const [withQr, setWithQr] = useState(() => {
    try {
      return localStorage.getItem('rigtrack.label.qr') !== 'off'
    } catch {
      return true
    }
  })

  const cases = useCases(companyId)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const branding = useQuery({ queryKey: brandingKeys.branding(companyId), queryFn: () => fetchBranding(companyId) })

  const current = cases.data?.find((c) => c.id === id)
  // Na štítok ide iba technika, ktorú používateľ v case označil: jeden hlavný prvok a vedľajšie.
  const content = useMemo(() => (current && equipment.data ? caseLabelContent(current, equipment.data) : null), [current, equipment.data])
  const main = content?.main ?? null
  const secondary = content?.secondary ?? []

  const logoPath = branding.data?.logoPath ?? ''
  const logo = useQuery({
    queryKey: brandingKeys.logo(companyId, logoPath),
    // Štítok aj hárok sú biele: svetlé logo sa na ne prefarbí na čierno.
    queryFn: async () => logoForLightBackground(await fetchLogoBlob(logoPath)),
    enabled: Boolean(logoPath),
    staleTime: Infinity,
  })
  // Bez označeného hlavného prvku sa použije vlastný názov a fotka zadané k case.
  const photoPath = content?.photoPath ?? ''
  const photo = useQuery({
    queryKey: [...caseKeys.list(companyId), 'label-photo', photoPath],
    queryFn: () => fetchPhotoBlob(photoPath),
    enabled: Boolean(photoPath),
    staleTime: Infinity,
  })

  // Štítok sa dá vytvoriť aj bez obrázkov; čaká sa len dovtedy, kým sa načítajú alebo zlyhajú.
  const imagesSettled = (!logoPath || logo.isSuccess || logo.isError) && (!photoPath || photo.isSuccess || photo.isError)
  const ready = Boolean(current && equipment.data && branding.data && imagesSettled)
  const hasMain = content?.hasMain ?? false

  useEffect(() => {
    if (!ready || !current || !canvas.current) return
    let cancelled = false
    const target = canvas.current
    void (async () => {
      // Kreslí sa do pomocného plátna, aby sa po zrušení (zmena voľby) neprekreslilo staré.
      const scratch = document.createElement('canvas')
      await drawCaseLabelFor(
        scratch,
        current,
        { equipment: equipment.data ?? [], footer: branding.data?.labelFooter ?? '', logo: logo.data ?? null, companyName: company.companyName, withQr, origin: window.location.origin },
        photo.data ?? null,
      )
      if (cancelled) return
      target.width = scratch.width
      target.height = scratch.height
      target.getContext('2d')!.drawImage(scratch, 0, 0)
      setDrawn(true)
    })()
    return () => {
      cancelled = true
    }
  }, [ready, current, equipment.data, branding.data, logo.data, photo.data, company.companyName, withQr])

  // Z tlačovej fronty (?back=/print) sa vráti do nej, inak na case.
  const backTo = backParams.get('back') ?? `/cases/${id}`
  const back = (
    <Link to={backTo} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden />
      {backTo === '/print' ? 'Späť do tlače' : 'Späť na case'}
    </Link>
  )

  if (cases.isPending || equipment.isPending || branding.isPending) return <LoadingBlock />
  if (cases.isError || equipment.isError || branding.isError) {
    return <ErrorBlock message="Údaje pre štítok sa nepodarilo načítať." onRetry={() => void cases.refetch()} />
  }
  if (!current) {
    return (
      <>
        {back}
        <ErrorBlock message="Tento case neexistuje alebo k nemu nemáte prístup." />
      </>
    )
  }

  const fileName = `flight-case-label-${fileSlug([current.name, current.labelNumber].filter(Boolean).join('-'))}.png`

  return (
    <>
      {back}
      <PageHeader
        title="Flight case štítok"
        description={`${current.name} · ${LABEL_WIDTH} × ${LABEL_HEIGHT} px`}
        action={
          <div className="flex flex-wrap gap-2">
            <AddToPrintButton companyId={companyId} kind="case" targetIds={[current.id]} label="case_label" />
            <Button disabled={!drawn} onClick={() => canvas.current && downloadCanvas(canvas.current, fileName)}>
              <Download className="size-4" aria-hidden />
              Stiahnuť PNG
            </Button>
          </div>
        }
      />
      {(logo.isError || photo.isError) && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          Niektorý obrázok sa nepodarilo načítať, štítok je bez neho.
        </p>
      )}
      <label className="mb-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4"
          checked={withQr}
          onChange={(event) => {
            setWithQr(event.target.checked)
            try {
              localStorage.setItem('rigtrack.label.qr', event.target.checked ? 'on' : 'off')
            } catch {
              // Bez úložiska sa voľba len nezapamätá.
            }
          }}
        />
        QR kód na štítku (naskenovaním sa otvorí case v appke, v pack liste sa odškrtne)
      </label>
      <canvas
        ref={canvas}
        width={LABEL_WIDTH}
        height={LABEL_HEIGHT}
        aria-label={`Náhľad štítku pre ${current.name}`}
        className="h-auto w-full rounded-lg border bg-white"
      />
      {!hasMain && secondary.length === 0 && (
        <p role="status" className="mt-3 rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm">
          Obsah je prázdny. V detaile case označte hviezdičkou hlavný prvok (napr. pult) a tlačidlom plus vedľajšie prvky,
          alebo nižšie zadajte vlastný názov.
        </p>
      )}
      {!main && <CustomLabelContent companyId={companyId} current={current} canEdit={can(company, 'cases.edit')} />}
      {main && !main.photoPath && (
        <p role="status" className="mt-3 rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm">
          Hlavný prvok nemá fotku.{' '}
          <Link to={`/equipment/${main.id}`} className="font-medium text-accent hover:underline">
            Pridať fotku k „{main.name}“
          </Link>
        </p>
      )}
      <p className="mt-3 text-sm text-muted-foreground">
        Číslo, kategória a hmotnosť sa berú z úpravy case, logo a kontaktný riadok z Nastavení. Dátum kontroly ostáva
        prázdny na dopísanie fixkou.
      </p>
    </>
  )
}
