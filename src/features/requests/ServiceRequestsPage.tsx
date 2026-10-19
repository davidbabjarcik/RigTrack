import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { ServiceTabs } from '@/components/layout/ModuleTabs'
import { Button, LinkButton } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { useAuth } from '@/features/auth/auth-context'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { useVehicles } from '@/features/vehicles/useVehicles'
import { formatDateTime } from '@/lib/format'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import {
  deleteRequest,
  REQUEST_PRIORITY_LABELS,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUSES,
  requestKeys,
  sortRequests,
  updateRequest,
  useServiceRequests,
  type RequestStatus,
  type ServiceRequest,
} from './api'

const STATUS_CLASSES: Record<RequestStatus, string> = {
  open: 'bg-accent/15 text-accent',
  in_progress: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  done: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  rejected: 'bg-muted text-muted-foreground',
}

function RequestCard({ request, equipmentName, vehicleName, canResolve, canDelete }: { request: ServiceRequest; equipmentName?: string; vehicleName?: string; canResolve: boolean; canDelete: boolean }) {
  const company = useCompany().active!
  const queryClient = useQueryClient()
  const [response, setResponse] = useState(request.response)
  const refresh = () => queryClient.invalidateQueries({ queryKey: requestKeys.list(company.companyId) })
  const update = useMutation({ mutationFn: (patch: Parameters<typeof updateRequest>[1]) => updateRequest(request.id, patch), onSettled: refresh })
  const remove = useMutation({ mutationFn: () => deleteRequest(request.id), onSettled: refresh })
  return (
    <li className="flex flex-col gap-2 rounded-xl border bg-surface p-4">
      <div className="flex flex-wrap items-start gap-2">
        <span className="min-w-0 flex-1">
          <span className="block font-medium break-words">{request.title}</span>
          <span className="block text-sm text-muted-foreground">
            {[
              equipmentName && `${equipmentName}${request.unitId ? ` #${request.unitId}` : ''}`,
              vehicleName && `auto ${vehicleName}`,
              `${request.requestedByName || 'neznámy'} · ${formatDateTime(request.createdAt)}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </span>
        {request.priority !== 'normal' && (
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', request.priority === 'high' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground')}>
            {REQUEST_PRIORITY_LABELS[request.priority]} priorita
          </span>
        )}
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_CLASSES[request.status])}>{REQUEST_STATUS_LABELS[request.status]}</span>
      </div>
      {request.equipmentId && equipmentName && (
        <Link to={`/equipment/${request.equipmentId}`} className="self-start text-sm text-accent hover:underline">
          Otvoriť techniku
        </Link>
      )}
      {request.vehicleId && vehicleName && (
        <Link to={`/vehicles/${request.vehicleId}`} className="self-start text-sm text-accent hover:underline">
          Otvoriť auto
        </Link>
      )}
      {request.description && <p className="text-sm whitespace-pre-wrap">{request.description}</p>}
      {!canResolve && request.response && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm">
          <span className="font-medium">Servis: </span>
          {request.response}
        </p>
      )}
      {canResolve && (
        <div className="grid gap-2 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
          <SelectField label="Stav" value={request.status} disabled={update.isPending} onChange={(e) => update.mutate({ status: e.target.value as RequestStatus })}>
            {REQUEST_STATUSES.map((status) => (
              <option key={status} value={status}>
                {REQUEST_STATUS_LABELS[status]}
              </option>
            ))}
          </SelectField>
          <Field label="Odpoveď pre nahlasovateľa" placeholder="napr. vymenená kapsula, objednaný diel" maxLength={1000} value={response} onChange={(e) => setResponse(e.target.value)} />
          <Button variant="outline" size="sm" disabled={response === request.response || update.isPending} onClick={() => update.mutate({ response: response.trim() })}>
            Uložiť odpoveď
          </Button>
        </div>
      )}
      {request.resolvedAt && <p className="text-xs text-muted-foreground">Uzavreté {formatDateTime(request.resolvedAt)}</p>}
      {(update.isError || remove.isError) && (
        <p role="alert" className="text-sm text-destructive">
          Zmena sa nepodarila.
        </p>
      )}
      {canDelete && (
        <Button
          variant="ghost"
          size="sm"
          className="self-end"
          disabled={remove.isPending}
          onClick={() => window.confirm('Zmazať žiadosť?') && remove.mutate()}
        >
          <Trash2 className="size-4" aria-hidden />
          Zmazať
        </Button>
      )}
    </li>
  )
}

/** Žiadosti o servis: servis vidí všetky a vybavuje ich, ostatní vidia svoje. */
export function ServiceRequestsPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const userId = useAuth().session?.user.id
  const canResolve = can(company, 'service.edit')
  const requests = useServiceRequests(companyId)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId), enabled: can(company, 'equipment.view') })
  const vehicles = useVehicles(companyId)
  const [status, setStatus] = useState<'active' | RequestStatus | ''>('active')
  const [mine, setMine] = useState(false)
  const all = sortRequests(requests.data ?? [])
  const visible = all.filter(
    (item) =>
      (status === '' || (status === 'active' ? item.status === 'open' || item.status === 'in_progress' : item.status === status)) &&
      (!mine || item.requestedBy === userId),
  )
  const active = all.filter((item) => item.status === 'open' || item.status === 'in_progress').length

  return (
    <>
      <ServiceTabs />
      <PageHeader
        title="Žiadosti o servis"
        description={canResolve ? 'Nahlásené poruchy od celého tímu' : 'Vaše nahlásené poruchy a ako sa vybavili'}
        action={
          <LinkButton to="/service/requests/new">
            <Plus className="size-4" aria-hidden />
            Nahlásiť poruchu
          </LinkButton>
        }
      />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SelectField label="Stav" className="w-52" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="active">Otvorené ({active})</option>
          {REQUEST_STATUSES.map((value) => (
            <option key={value} value={value}>
              {REQUEST_STATUS_LABELS[value]}
            </option>
          ))}
          <option value="">Všetky ({all.length})</option>
        </SelectField>
        {canResolve && (
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" className="size-4" checked={mine} onChange={(e) => setMine(e.target.checked)} />
            Len moje
          </label>
        )}
        {can(company, 'service.view') && (
          <Link to="/service" className="pb-2 text-sm text-accent hover:underline">
            Servisné záznamy →
          </Link>
        )}
      </div>
      {requests.isPending ? (
        <LoadingBlock />
      ) : requests.isError ? (
        <ErrorBlock message="Žiadosti sa nepodarilo načítať. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie." onRetry={() => void requests.refetch()} />
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-surface px-6 py-12 text-center">
          <p className="font-medium">{all.length === 0 ? 'Zatiaľ žiadne žiadosti' : 'Filtru nič nezodpovedá'}</p>
          <p className="mt-1 text-sm text-muted-foreground">Keď sa niečo pokazí, nahláste to tlačidlom Nahlásiť poruchu – aj priamo z detailu techniky.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              equipmentName={equipment.data?.find((item) => item.id === request.equipmentId)?.name}
              vehicleName={vehicles.data?.find((vehicle) => vehicle.id === request.vehicleId)?.plate}
              canResolve={canResolve}
              canDelete={can(company, 'service.delete') || (request.requestedBy === userId && request.status === 'open')}
            />
          ))}
        </ul>
      )}
    </>
  )
}
