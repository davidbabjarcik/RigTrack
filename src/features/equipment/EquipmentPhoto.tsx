import { useQueryClient } from '@tanstack/react-query'
import { equipmentKeys } from './api'
import { trashPhoto, uploadEquipmentPhoto } from './photo'
import { PhotoBlock } from './PhotoBlock'

type Props = { companyId: string; equipmentId: string; name: string; photoPath: string; canEdit: boolean }

export function EquipmentPhoto({ companyId, equipmentId, name, photoPath, canEdit }: Props) {
  const queryClient = useQueryClient()
  return (
    <PhotoBlock
      queryKey={equipmentKeys.detail(companyId, equipmentId)}
      name={name}
      photoPath={photoPath}
      canEdit={canEdit}
      onUpload={(file) => uploadEquipmentPhoto(companyId, equipmentId, file, photoPath)}
      onRemove={() => trashPhoto('equipment', equipmentId)}
      // Celá technika firmy (detail, zoznam aj upozornenie „doplňte údaje“ – chýbajúca fotka).
      onChanged={() => queryClient.invalidateQueries({ queryKey: equipmentKeys.list(companyId) })}
    />
  )
}
