import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, LinkButton } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { unitIdsOf } from '@/features/equipment/model'
import { useVehicles } from '@/features/vehicles/useVehicles'
import { can } from '@/lib/permissions'
import { errorDetail } from '@/lib/supabase/errors'
import { createRequest, REQUEST_PRIORITIES, REQUEST_PRIORITY_LABELS, requestKeys, type RequestPriority } from './api'

const plain = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/** Nahlásenie poruchy alebo žiadosť o servis – môže ktokoľvek z firmy. */
export function ServiceRequestFormPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const canSeeEquipment = can(company, 'equipment.view')
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId), enabled: canSeeEquipment })
  const canSeeVehicles = can(company, 'vehicles.view')
  const vehicles = useVehicles(companyId)
  const [equipmentId, setEquipmentId] = useState(params.get('equipment') ?? '')
  const [vehicleId, setVehicleId] = useState(params.get('vehicle') ?? '')
  const [search, setSearch] = useState('')
  const [unitId, setUnitId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<RequestPriority>('normal')
  const save = useMutation({
    mutationFn: () => createRequest(companyId, { equipmentId: equipmentId || null, vehicleId: vehicleId || null, unitId: unitId ? Number(unitId) : null, title, description, priority }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: requestKeys.list(companyId) })
      navigate('/service/requests', { replace: true })
    },
  })

  const items = (equipment.data ?? []).filter((item) => item.status !== 'retired')
  const chosen = items.find((item) => item.id === equipmentId)
  const words = plain(search).split(/\s+/).filter(Boolean)
  const matches = items.filter((item) => item.id === equipmentId || words.every((word) => plain(`${item.name} ${item.manufacturer} ${item.model} ${item.inventoryNumber}`).includes(word))).slice(0, 100)
  const units = chosen?.trackUnits ? unitIdsOf(chosen) : []

  function submit(event: FormEvent) {
    event.preventDefault()
    if (title.trim()) save.mutate()
  }

  return (
    <>
      <PageHeader title="Nahlásiť poruchu" description="Žiadosť o servis – servis ju uvidí a dá vedieť, ako sa vybavila." />
      <form onSubmit={submit} className="flex flex-col gap-4">
        {canSeeVehicles && (vehicles.data ?? []).length > 0 && (
          <SelectField
            label="Auto (ak ide o auto)"
            value={vehicleId}
            onChange={(e) => {
              setVehicleId(e.target.value)
              if (e.target.value) setEquipmentId('')
            }}
          >
            <option value="">— nejde o auto —</option>
            {(vehicles.data ?? []).map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {[vehicle.plate, vehicle.model].filter(Boolean).join(' · ')}
              </option>
            ))}
          </SelectField>
        )}
        {canSeeEquipment && !vehicleId && (
          <fieldset className="grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-2">
            <legend className="px-1 text-sm font-medium text-muted-foreground">Ktorá technika (nepovinné)</legend>
            {!chosen && <Field label="Hľadať techniku" type="search" placeholder="názov, výrobca, inventárne číslo" value={search} onChange={(e) => setSearch(e.target.value)} />}
            <SelectField
              label="Technika"
              value={equipmentId}
              onChange={(e) => {
                setEquipmentId(e.target.value)
                setUnitId('')
              }}
            >
              <option value="">— bez techniky / neviem —</option>
              {matches.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.inventoryNumber && ` (${item.inventoryNumber})`}
                </option>
              ))}
            </SelectField>
            {units.length > 0 && (
              <SelectField label="Kus" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                <option value="">— neviem / všetky —</option>
                {units.map((unit) => (
                  <option key={unit} value={unit}>
                    #{unit}
                  </option>
                ))}
              </SelectField>
            )}
          </fieldset>
        )}
        <Field label="Čo sa deje *" autoFocus placeholder={chosen ? 'napr. nesvieti, praská, nejde DMX' : 'napr. Shure ULX-D #3 – praská kapsula'} maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} />
        <TextareaField label="Podrobnosti" placeholder="Kedy sa to stalo, na akej akcii, čo ste skúšali…" maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
        <SelectField label="Priorita" className="sm:w-64" value={priority} onChange={(e) => setPriority(e.target.value as RequestPriority)}>
          {REQUEST_PRIORITIES.map((value) => (
            <option key={value} value={value}>
              {REQUEST_PRIORITY_LABELS[value]}
              {value === 'high' && ' – treba na najbližšiu akciu'}
            </option>
          ))}
        </SelectField>
        {save.isError && (
          <p role="alert" className="text-sm text-destructive">
            Odoslanie zlyhalo. {errorDetail(save.error)}
          </p>
        )}
        <div className="flex gap-3">
          <Button type="submit" disabled={!title.trim() || save.isPending}>
            {save.isPending ? 'Odosielam…' : 'Odoslať žiadosť'}
          </Button>
          <LinkButton to={chosen ? `/equipment/${chosen.id}` : vehicleId ? `/vehicles/${vehicleId}` : '/service/requests'} variant="outline">
            Zrušiť
          </LinkButton>
        </div>
      </form>
    </>
  )
}
