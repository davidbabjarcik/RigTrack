import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { memberName, useMembers } from '@/features/companies/useMembers'
import { deleteDevice, deviceKeys, useDevices } from './api'
import { DeviceRow } from './MyDevicesSettings'
import { matchesDevice, type MemberDevice } from './model'

/** Zariadenia členov v prehľade IP/MAC (vidí admin a skladník, ostatní len svoje). */
export function MemberDevicesSection({ companyId, query, canManage }: { companyId: string; query: string; canManage: boolean }) {
  const queryClient = useQueryClient()
  const devices = useDevices(companyId)
  const members = useMembers(companyId)
  const remove = useMutation({
    mutationFn: (id: string) => deleteDevice(companyId, id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: deviceKeys.list(companyId) }),
  })
  if (devices.isError || !devices.data || devices.data.length === 0) return null

  const owner = (device: MemberDevice) => memberName(members.data, device.userId) || 'Bývalý člen'
  const visible = devices.data.filter((device) => matchesDevice(device, owner(device), query))
  return (
    <CollapsibleSection id="network.devices" title={`Zariadenia členov (${devices.data.length})`} className="mt-6">
      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-surface p-4 text-center text-sm text-muted-foreground">Nič sa nenašlo.</p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {visible.map((device) => (
            <DeviceRow
              key={device.id}
              device={device}
              owner={owner(device)}
              deleting={remove.isPending}
              onDelete={
                canManage
                  ? () => {
                      if (window.confirm(`Odstrániť zariadenie ${device.name} (${owner(device)})?`)) remove.mutate(device.id)
                    }
                  : undefined
              }
            />
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-muted-foreground">Svoje zariadenia si každý pridá v Nastaveniach → Účet → Moje zariadenia.</p>
    </CollapsibleSection>
  )
}
