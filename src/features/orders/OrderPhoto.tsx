import { useQueryClient } from '@tanstack/react-query'
import { discardPhotoFile, trashPhoto } from '@/features/equipment/photo'
import { PhotoBlock } from '@/features/equipment/PhotoBlock'
import { orderKeys, saveOrderPhoto } from './api'

type Props = { companyId: string; orderId: string; name: string; photoPath: string; canEdit: boolean }

/** Nepovinná fotka nákupu v jeho detaile: tovar, inzerát alebo bloček. */
export function OrderPhoto({ companyId, orderId, name, photoPath, canEdit }: Props) {
  const queryClient = useQueryClient()
  // Bez fotky a bez práva ju pridať nie je čo ukázať.
  if (!photoPath && !canEdit) return null
  return (
    <PhotoBlock
      queryKey={orderKeys.detail(companyId, orderId)}
      name={name}
      photoPath={photoPath}
      canEdit={canEdit}
      onUpload={async (file) => {
        await saveOrderPhoto(companyId, orderId, file)
        if (photoPath) await discardPhotoFile(photoPath).catch(() => {})
      }}
      onRemove={() => trashPhoto('orders', orderId)}
      onChanged={() => queryClient.invalidateQueries({ queryKey: orderKeys.list(companyId) })}
    />
  )
}
