import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Camera, ChevronRight, Combine, Package, Pencil, QrCode } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { GroupDmx } from './GroupDmx'
import { GroupHours } from './GroupHours'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button, LinkButton } from '@/components/ui/button'
import { caseTitle } from '@/features/cases/model'
import { useCases } from '@/features/cases/useCases'
import { useCompany } from '@/features/companies/company-context'
import { can } from '@/lib/permissions'
import { equipmentKeys, fetchEquipmentList, mergeEquipment, splitEquipmentUnits } from './api'
import { PhotoThumb } from './PhotoThumb'
import { uploadGroupPhoto } from './photo'
import { usePhotoThumbs } from './usePhotoThumbs'
import { cableBaseName, describeAttributes, makersText, groupSplitEquipment, STATUS_LABELS, unitIdsOf } from './model'

/**
 * Prehľad rozdelenej techniky (napr. Beam 7R v 8 cases, alebo XLR vo všetkých dĺžkach):
 * kde je ktorý kus, odkazy na cases, úprava všetkých naraz a QR štítky všetkých kusov.
 */
export function EquipmentGroupPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const [params] = useSearchParams()
  const ids = (params.get('ids') ?? '').split(',').filter(Boolean)
  const list = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const cases = useCases(companyId)
  const parts = groupSplitEquipment((list.data ?? []).filter((item) => ids.includes(item.id)))[0]?.items ?? []
  const [hoursOpen, setHoursOpen] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const merge = useMutation({
    mutationFn: async () => {
      const free = parts.filter((item) => !item.caseId && item.name.trim().toLowerCase() === parts[0].name.trim().toLowerCase()).sort((a, b) => b.quantity - a.quantity)
      for (const item of free.slice(1)) await mergeEquipment(item.id, free[0].id)
      return free.slice(1).map((item) => item.id)
    },
    onSuccess: async (gone) => {
      await queryClient.invalidateQueries({ queryKey: equipmentKeys.list(companyId) })
      navigate(`/equipment/group?ids=${ids.filter((value) => !gone.includes(value)).join(',')}`, { replace: true })
    },
  })
  const [dmxOpen, setDmxOpen] = useState(false)
  // Kusy mimo case označené na presun do case.
  const [picked, setPicked] = useState<string[]>([])
  const [targetCase, setTargetCase] = useState('')
  const toCase = useMutation({
    mutationFn: async () => {
      const added: string[] = []
      const byPart = new Map<string, number[]>()
      for (const key of picked) {
        const [partId, unit] = key.split(':')
        byPart.set(partId, [...(byPart.get(partId) ?? []), Number(unit)])
      }
      for (const [partId, unitIds] of byPart) {
        let moved = await splitEquipmentUnits(partId, targetCase, unitIds)
        // Ak už v tom case časť tej istej techniky je, kusy sa k nej pridajú (jeden riadok na case).
        const existing = parts.find((item) => item.caseId === targetCase && item.id !== moved && item.id !== partId)
        if (existing) {
          await mergeEquipment(moved, existing.id)
          moved = existing.id
        }
        added.push(moved)
      }
      return added
    },
    onSuccess: async (added) => {
      setPicked([])
      await queryClient.invalidateQueries({ queryKey: equipmentKeys.list(companyId) })
      await queryClient.invalidateQueries({ queryKey: ['company', companyId] })
      navigate(`/equipment/group?ids=${[...new Set([...ids, ...added])].join(',')}`, { replace: true })
    },
  })
  const thumbs = usePhotoThumbs(companyId, parts.slice(0, 1).map((item) => item.photoPath))
  // Jedna fotka pre všetky časti (klik na fotku alebo Ctrl+V so skopírovaným obrázkom).
  const fileInput = useRef<HTMLInputElement>(null)
  const photo = useMutation({
    mutationFn: (file: File) => uploadGroupPhoto(companyId, parts.map((item) => item.id), file),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['company', companyId] }),
  })
  const upload = useRef(photo.mutate)
  useEffect(() => {
    upload.current = photo.mutate
  }, [photo.mutate])
  const canPhoto = can(company, 'equipment.edit') && parts.length > 0
  useEffect(() => {
    if (!canPhoto) return
    function handlePaste(event: ClipboardEvent) {
      const image = [...(event.clipboardData?.files ?? [])].find((file) => file.type.startsWith('image/'))
      if (!image) return
      event.preventDefault()
      upload.current(image)
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [canPhoto])

  const back = (
    <Link to="/equipment" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden />
      Technika
    </Link>
  )
  if (list.isPending) return <LoadingBlock />
  if (list.isError) return <ErrorBlock message="Techniku sa nepodarilo načítať." onRetry={() => void list.refetch()} />
  if (parts.length === 0) {
    return (
      <>
        {back}
        <ErrorBlock message="Táto technika neexistuje alebo k nej nemáte prístup." />
      </>
    )
  }

  const main = parts[0]
  const isDmx = parts.some((item) => item.trackUnits) && (main.kind === 'light' || Boolean(main.attributes.dmxModes?.length))
  const tracksHours = parts.some((item) => Boolean(item.attributes.trackHours) || item.hoursIntervalMonths !== null || item.operatingHours !== null)
  const cables = main.kind === 'cable'
  // Viac častí mimo case (napr. po omyle pri pridávaní do case) sa dá spojiť do jednej.
  const freeParts = parts.filter((item) => !item.caseId && item.name.trim().toLowerCase() === main.name.trim().toLowerCase())
  const freePieces = freeParts.reduce((sum, item) => sum + item.quantity, 0)
  const canMerge = !cables && freeParts.length > 1 && can(company, 'equipment.edit')
  const caseName = (caseId: string | null) => {
    const box = cases.data?.find((item) => item.id === caseId)
    return box ? caseTitle(box) : ''
  }
  const total = parts.reduce((sum, item) => sum + item.quantity, 0)
  const free = parts.filter((item) => !item.caseId).reduce((sum, item) => sum + item.quantity, 0)
  const caseCount = new Set(parts.map((item) => item.caseId).filter(Boolean)).size
  const allIds = parts.map((item) => item.id).join(',')
  const canMove = can(company, 'equipment.edit') && !cables
  const caseOptions = [...(cases.data ?? [])].sort(
    (a, b) =>
      Number(!parts.some((item) => item.caseId === a.id)) - Number(!parts.some((item) => item.caseId === b.id)) ||
      caseTitle(a).localeCompare(caseTitle(b), 'sk', { numeric: true }),
  )
  // Časti: v cases hore, mimo case dole.
  const shownParts = cables ? parts : [...parts].sort((a, b) => Number(a.caseId === null) - Number(b.caseId === null))
  // Po kusoch: každý kus (#1…) s tým, kde je.
  const units = parts
    .filter((item) => item.trackUnits)
    .flatMap((item) => unitIdsOf(item).map((unit) => ({ unit, part: item })))
    .sort((a, b) => a.unit - b.unit)
  const freeUnits = units.filter(({ part }) => !part.caseId).map(({ part, unit }) => `${part.id}:${unit}`)

  return (
    <>
      {back}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          {/* Fotka pre všetky časti naraz: klik na fotku alebo Ctrl+V. */}
          {can(company, 'equipment.edit') ? (
            <button
              type="button"
              className="group relative shrink-0 rounded-lg"
              title="Zmeniť fotku všetkým častiam (alebo vložte obrázok cez Ctrl+V)"
              aria-label="Zmeniť fotku všetkým častiam"
              disabled={photo.isPending}
              onClick={() => fileInput.current?.click()}
            >
              <PhotoThumb url={thumbs[main.photoPath]} />
              <span className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full border bg-surface text-muted-foreground group-hover:text-foreground">
                <Camera className="size-3.5" aria-hidden />
              </span>
            </button>
          ) : (
            <PhotoThumb url={thumbs[main.photoPath]} />
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) photo.mutate(file)
            }}
          />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight break-words">{cables ? cableBaseName(main.name) : main.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {[
                [main.manufacturer, main.model].filter(Boolean).join(' '),
                ...(cables ? [main.attributes.connector] : describeAttributes(main)),
                `${total} ks`,
                free > 0 && `${free} mimo case`,
                caseCount > 0 && `${total - free} v ${caseCount === 1 ? 'jednom case' : `${caseCount} cases`}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {can(company, 'equipment.edit') && (
            <LinkButton to={`/equipment/${main.id}/edit?group=${allIds}`} variant="outline" size="sm">
              <Pencil className="size-4" aria-hidden />
              {cables ? 'Upraviť všetky dĺžky naraz' : 'Upraviť všetky naraz'}
            </LinkButton>
          )}
          <LinkButton to={`/qr/equipment?ids=${allIds}`} variant="outline" size="sm">
            <QrCode className="size-4" aria-hidden />
            QR štítky všetkých{units.length > 0 && ` (${units.length})`}
          </LinkButton>
          {isDmx && !dmxOpen && can(company, 'equipment.edit') && <GroupDmx companyId={companyId} parts={parts} caseName={caseName} open={false} onOpen={() => setDmxOpen(true)} onClose={() => {}} />}
          {canMerge && (
            <Button variant="outline" size="sm" disabled={merge.isPending} onClick={() => window.confirm(`Spojiť ${freeParts.length} časti mimo case do jednej (${freePieces} ks)? História sa prenesie.`) && merge.mutate()}>
              <Combine className="size-4" aria-hidden />
              {merge.isPending ? 'Spájam…' : 'Spojiť časti mimo case'}
            </Button>
          )}
          {tracksHours && !hoursOpen && can(company, 'equipment.edit') && <GroupHours companyId={companyId} parts={parts} caseName={caseName} onOpen={() => setHoursOpen(true)} />}
        </div>
      </header>
      {dmxOpen && <GroupDmx companyId={companyId} parts={parts} caseName={caseName} open onOpen={() => {}} onClose={() => setDmxOpen(false)} />}
      {hoursOpen && <GroupHours companyId={companyId} parts={parts} caseName={caseName} open onClose={() => setHoursOpen(false)} />}

      {units.length > 0 && (
        <section aria-labelledby="units-heading" className="mb-6">
          <h2 id="units-heading" className="mb-2 text-sm font-medium text-muted-foreground">
            Kusy ({units.length})
          </h2>
          <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
            {units.map(({ unit, part }) => (
              <li key={`${part.id}-${unit}`} className="flex min-h-12 items-center gap-3 px-4 py-2">
                {canMove &&
                  (part.caseId ? (
                    <span className="size-4 shrink-0" aria-hidden />
                  ) : (
                    <input
                      type="checkbox"
                      className="size-4 shrink-0"
                      aria-label={`Vybrať kus #${unit} do case`}
                      checked={picked.includes(`${part.id}:${unit}`)}
                      onChange={(event) => setPicked(event.target.checked ? [...picked, `${part.id}:${unit}`] : picked.filter((key) => key !== `${part.id}:${unit}`))}
                    />
                  ))}
                <Link to={`/equipment/${part.id}?unit=${unit}`} className="w-12 font-semibold hover:underline">
                  #{unit}
                </Link>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {part.caseId ? (
                    <Link to={`/cases/${part.caseId}`} className="inline-flex items-center gap-1 text-accent hover:underline">
                      <Package className="size-4" aria-hidden />
                      {caseName(part.caseId) || 'case'}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">mimo case</span>
                  )}
                </span>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">{STATUS_LABELS[part.status]}</span>
              </li>
            ))}
          </ul>
          {canMove && freeUnits.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border bg-surface p-3 text-sm">
              <button
                type="button"
                className="text-accent hover:underline"
                onClick={() => setPicked(picked.length === freeUnits.length ? [] : freeUnits)}
              >
                {picked.length === freeUnits.length ? 'Zrušiť výber' : `Vybrať všetky mimo case (${freeUnits.length})`}
              </button>
              <select aria-label="Do ktorého case" className="h-9 min-w-48 flex-1 rounded-lg border bg-background px-2" value={targetCase} onChange={(event) => setTargetCase(event.target.value)}>
                <option value="">Vyberte case…</option>
                {caseOptions.map((box) => (
                  <option key={box.id} value={box.id}>
                    {caseTitle(box)}
                  </option>
                ))}
              </select>
              <Button size="sm" disabled={picked.length === 0 || !targetCase || toCase.isPending} onClick={() => toCase.mutate()}>
                <Package className="size-4" aria-hidden />
                {toCase.isPending ? 'Presúvam…' : `Dať do case${picked.length > 0 ? ` (${picked.length})` : ''}`}
              </Button>
              {toCase.isError && <span className="text-destructive">Nepodarilo sa.</span>}
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="parts-heading">
        <h2 id="parts-heading" className="mb-2 text-sm font-medium text-muted-foreground">
          {cables ? 'Dĺžky' : 'Časti'} ({parts.length})
        </h2>
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {shownParts.map((part) => (
            <li key={part.id}>
              <Link to={`/equipment/${part.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-muted">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{cables ? part.name : part.caseId ? caseName(part.caseId) || 'V case' : 'Mimo case'}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {[
                      `${part.quantity} ks`,
                      part.trackUnits && part.unitIds.length > 0 && part.unitIds.map((value) => `#${value}`).join(', '),
                      cables && part.caseId && `v ${caseName(part.caseId)}`,
                      cables && makersText(part.attributes),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">{STATUS_LABELS[part.status]}</span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
