import { useQueryClient } from '@tanstack/react-query'
import { discardPhotoFile, storeCompanyPhoto, trashPhoto } from '@/features/equipment/photo'
import { PhotoBlock } from '@/features/equipment/PhotoBlock'
import { setVehiclePhoto, vehicleKeys } from './api'

type Props = { companyId: string; vehicleId: string; name: string; photoPath: string; canEdit: boolean }

/** Fotka vozidla v jeho detaile. */
export function VehiclePhoto({ companyId, vehicleId, name, photoPath, canEdit }: Props) {
  const queryClient = useQueryClient()
  return (
    <PhotoBlock
      queryKey={[...vehicleKeys.list(companyId), vehicleId]}
      name={name}
      photoPath={photoPath}
      canEdit={canEdit}
      onUpload={async (file) => {
        const path = await storeCompanyPhoto(companyId, `vehicle-${vehicleId}`, file, { thumb: true })
        await setVehiclePhoto(companyId, vehicleId, path)
        if (photoPath) await discardPhotoFile(photoPath).catch(() => {})
      }}
      onRemove={() => trashPhoto('vehicles', vehicleId)}
      onChanged={() => queryClient.invalidateQueries({ queryKey: vehicleKeys.list(companyId) })}
    />
  )
}
