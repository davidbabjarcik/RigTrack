import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChevronRight, ClipboardCheck, Copy, Pencil, QrCode } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button, LinkButton } from '@/components/ui/button'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { PhotoThumb } from '@/features/equipment/PhotoThumb'
import { usePhotoThumbs } from '@/features/equipment/usePhotoThumbs'
import { useCheckLevels } from '@/features/checks/levels'
import { formatDate } from '@/lib/format'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { addCaseCheck, caseKeys, duplicateCase } from './api'
import { caseNumber, formatDimensions, groupCases, kindLabel, kindWord, needsCheck, type Case } from './model'
import { useCases } from './useCases'

/**
 * Prehľad sady rovnakých cases (napr. 8× Beam 7R Case): čo je v ktorom, kontrola, úprava všetkých naraz,
 * QR štítky všetkých, ďalší kus sady a „skontrolované“ pre všetky naraz.
 */
export function CaseGroupPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const canEdit = can(company, 'cases.edit')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const ids = (params.get('ids') ?? '').split(',').filter(Boolean)
  const cases = useCases(companyId)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const checkDays = useCheckLevels(companyId).days
  const [now] = useState(() => Date.now())
  const group = groupCases((cases.data ?? []).filter((item) => ids.includes(item.id)))[0]
  const members: Case[] = group?.items ?? []
  const first = members[0]
  const photoOf = (item: Case) => item.photoPath || (equipment.data ?? []).find((part) => part.caseId === item.id && part.photoPath)?.photoPath || ''
  const thumbs = usePhotoThumbs(companyId, first ? [photoOf(first)].filter(Boolean) : [])

  const checkAll = useMutation({
    mutationFn: async () => {
      for (const item of members) await addCaseCheck(companyId, item.id, '')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: caseKeys.list(companyId) }),
  })
  const duplicate = useMutation({
    mutationFn: () => duplicateCase(companyId, members[members.length - 1], cases.data ?? []),
    onSuccess: async (newId) => {
      await queryClient.invalidateQueries({ queryKey: caseKeys.list(companyId) })
      navigate(`/cases/group?ids=${[...ids, newId].join(',')}`, { replace: true })
    },
  })

  const back = (
    <Link to="/cases" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden />
      Cases a racks
    </Link>
  )
  if (cases.isPending || equipment.isPending) return <LoadingBlock />
  if (cases.isError) return <ErrorBlock message="Cases sa nepodarilo načítať." onRetry={() => void cases.refetch()} />
  if (!first) {
    return (
      <>
        {back}
        <ErrorBlock message="Táto sada neexistuje alebo k nej nemáte prístup." />
      </>
    )
  }

  const contents = (caseId: string) => (equipment.data ?? []).filter((part) => part.caseId === caseId)
  const total = members.reduce((sum, item) => sum + contents(item.id).reduce((pieces, part) => pieces + part.quantity, 0), 0)
  const due = members.filter((item) => needsCheck(item, now, checkDays)).length
  const allIds = members.map((item) => item.id).join(',')

  return (
    <>
      {back}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <PhotoThumb url={thumbs[photoOf(first)]} />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight break-words">{group.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {[`${members.length}× ${kindWord(first.kind)}`, first.kind === 'rack' && kindLabel(first), formatDimensions(first), `${total} ks techniky`, due > 0 && `na kontrolu ${due}`]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <LinkButton to={`/cases/${first.id}/edit?group=${allIds}`} variant="outline" size="sm">
              <Pencil className="size-4" aria-hidden />
              Upraviť všetky naraz
            </LinkButton>
          )}
          <LinkButton to={`/qr/cases?ids=${allIds}`} variant="outline" size="sm">
            <QrCode className="size-4" aria-hidden />
            QR štítky všetkých ({members.length})
          </LinkButton>
          {canEdit && (
            <Button variant="outline" size="sm" disabled={checkAll.isPending} onClick={() => window.confirm(`Označiť všetkých ${members.length} ako skontrolované teraz?`) && checkAll.mutate()}>
              <ClipboardCheck className="size-4" aria-hidden />
              {checkAll.isPending ? 'Ukladám…' : 'Skontrolované všetky'}
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" size="sm" disabled={duplicate.isPending} onClick={() => duplicate.mutate()}>
              <Copy className="size-4" aria-hidden />
              {duplicate.isPending ? 'Pridávam…' : 'Pridať ďalší do sady'}
            </Button>
          )}
        </div>
      </header>
      {checkAll.isError && <p className="mb-4 text-sm text-destructive">Kontrolu sa nepodarilo uložiť pri všetkých.</p>}

      <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
        {members.map((item) => {
          const inside = contents(item.id)
          const late = needsCheck(item, now, checkDays)
          return (
            <li key={item.id}>
              <Link to={`/cases/${item.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-muted">
                <span className="w-14 shrink-0 text-lg font-semibold">#{caseNumber(item) || '?'}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {inside.length === 0
                      ? 'prázdny'
                      : inside
                          .map((part) => `${part.name}${part.trackUnits && part.unitIds.length > 0 ? ` ${part.unitIds.map((unit) => `#${unit}`).join(', ')}` : part.quantity > 1 ? ` ${part.quantity}×` : ''}`)
                          .join(', ')}
                  </span>
                  <span className={cn('block truncate text-sm', late ? 'text-accent' : 'text-muted-foreground')}>
                    {item.lastCheck ? `Kontrola ${formatDate(item.lastCheck.checkedAt.slice(0, 10))} · ${item.lastCheck.checkedByName || 'neznámy'}` : 'Zatiaľ nekontrolované'}
                    {late && ' · treba skontrolovať'}
                  </span>
                </span>
                {inside.length === 0 && <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">prázdny</span>}
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}
