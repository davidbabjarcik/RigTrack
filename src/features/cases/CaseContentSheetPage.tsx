import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Download } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { brandingKeys, fetchBranding, fetchLogoBlob, logoForLightBackground } from '@/features/companies/branding'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { cableColorKeys, fetchCableColors } from '@/features/equipment/cableColors'
import { downloadCanvas, fileSlug } from './canvas'
import { fetchPhotoBlob } from '@/features/equipment/photo'
import { buildCableMatrix, drawContentSheet, SHEET_HEIGHT, SHEET_WIDTH } from './contentSheet'
import { useCases } from './useCases'

export function CaseContentSheetPage() {
  const { id = '' } = useParams()
  const company = useCompany().active!
  const companyId = company.companyId
  const canvas = useRef<HTMLCanvasElement>(null)
  const [drawn, setDrawn] = useState(false)

  const cases = useCases(companyId)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const colors = useQuery({ queryKey: cableColorKeys.list(companyId), queryFn: () => fetchCableColors(companyId) })
  const branding = useQuery({ queryKey: brandingKeys.branding(companyId), queryFn: () => fetchBranding(companyId) })
  const logoPath = branding.data?.logoPath ?? ''
  const logo = useQuery({
    queryKey: brandingKeys.logo(companyId, logoPath),
    // Štítok aj hárok sú biele: svetlé logo sa na ne prefarbí na čierno.
    queryFn: async () => logoForLightBackground(await fetchLogoBlob(logoPath)),
    enabled: Boolean(logoPath),
    staleTime: Infinity,
  })

  const current = cases.data?.find((c) => c.id === id)
  const matrix = useMemo(
    () => buildCableMatrix((equipment.data ?? []).filter((item) => item.caseId === id)),
    [equipment.data, id],
  )
  const logoSettled = !logoPath || logo.isSuccess || logo.isError
  const ready = Boolean(current && equipment.data && colors.data && branding.data && logoSettled)

  useEffect(() => {
    if (!ready || !current || !canvas.current) return
    let cancelled = false
    const target = canvas.current
    void (async () => {
      const bitmap = logo.data ? await createImageBitmap(logo.data).catch(() => null) : null
      // Fotky príslušenstva na karty (bez fotky ostane karta len s názvom a počtom).
      const photos = new Map<string, ImageBitmap>()
      await Promise.all(
        [...new Set(matrix.others.map((item) => item.photoPath).filter((path): path is string => Boolean(path)))].map(async (path) => {
          const image = await fetchPhotoBlob(path)
            .then((blob) => createImageBitmap(blob))
            .catch(() => null)
          if (image) photos.set(path, image)
        }),
      )
      if (cancelled) return
      drawContentSheet(target, {
        caseName: current.name,
        caseNumber: current.labelNumber,
        matrix,
        colors: colors.data ?? [],
        footer: branding.data?.labelFooter ?? '',
        logo: bitmap,
        companyName: company.companyName,
        photos,
      })
      bitmap?.close()
      photos.forEach((image) => image.close())
      setDrawn(true)
    })()
    return () => {
      cancelled = true
    }
  }, [ready, current, matrix, colors.data, branding.data, logo.data, company.companyName])

  const back = (
    <Link to={`/cases/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden />
      Späť na case
    </Link>
  )

  if (cases.isPending || equipment.isPending || colors.isPending || branding.isPending) return <LoadingBlock />
  if (cases.isError || equipment.isError || colors.isError || branding.isError) {
    return <ErrorBlock message="Údaje pre hárok sa nepodarilo načítať." onRetry={() => void cases.refetch()} />
  }
  if (!current) {
    return (
      <>
        {back}
        <ErrorBlock message="Tento case neexistuje alebo k nemu nemáte prístup." />
      </>
    )
  }

  const missingColors = matrix.rows.filter((row) => !colors.data.some((color) => color.lengthM === row.lengthM)).length
  const fileName = `flightcase-content-${fileSlug([current.name, current.labelNumber].filter(Boolean).join('-'))}.png`

  return (
    <>
      {back}
      <PageHeader
        title="Flightcase content"
        description={`${current.name} · A4 na výšku (${SHEET_WIDTH} × ${SHEET_HEIGHT} px)`}
        action={
          <Button disabled={!drawn} onClick={() => canvas.current && downloadCanvas(canvas.current, fileName)}>
            <Download className="size-4" aria-hidden />
            Stiahnuť PNG
          </Button>
        }
      />
      {matrix.rows.length === 0 && matrix.others.length === 0 && (
        <p role="status" className="mb-3 rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm">
          Case je prázdny, hárok nemá čo zobraziť.
        </p>
      )}
      {missingColors > 0 && (
        <p role="status" className="mb-3 rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm">
          {missingColors === 1 ? 'Jedna dĺžka nemá' : `${missingColors} dĺžky nemajú`} priradenú farbu. Farbu dĺžky
          nastavíte v úprave ľubovoľného kábla s touto dĺžkou.
        </p>
      )}
      <canvas
        ref={canvas}
        width={SHEET_WIDTH}
        height={SHEET_HEIGHT}
        aria-label={`Náhľad hárku s obsahom pre ${current.name}`}
        className="mx-auto h-auto w-full max-w-2xl rounded-lg border bg-white"
      />
      <p className="mt-3 text-sm text-muted-foreground">
        Káble sú v tabuľke podľa dĺžky a typu (konektora), ostatné veci v zozname pod ňou. Hárok je vo veľkosti A4 a dá
        sa vytlačiť aj zmenšený na A5.
      </p>
    </>
  )
}
