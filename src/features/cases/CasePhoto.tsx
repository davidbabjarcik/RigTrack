import { useQueryClient } from '@tanstack/react-query'
import { discardPhotoFile, trashPhoto } from '@/features/equipment/photo'
import { PhotoBlock } from '@/features/equipment/PhotoBlock'
import { caseKeys, setCasePhoto } from './api'

type Props = { companyId: string; caseId: string; name: string; photoPath: string; canEdit: boolean }

/** Fotka case v jeho detaile (iná ako fotka na štítku). */
export function CasePhoto({ companyId, caseId, name, photoPath, canEdit }: Props) {
  const queryClient = useQueryClient()
  if (!photoPath && !canEdit) return null
  return (
    <PhotoBlock
      queryKey={[...caseKeys.list(companyId), caseId]}
      name={name}
      photoPath={photoPath}
      canEdit={canEdit}
      onUpload={async (file) => {
        await setCasePhoto(companyId, caseId, file)
        if (photoPath) await discardPhotoFile(photoPath).catch(() => {})
      }}
      onRemove={() => trashPhoto('case_photo', caseId)}
      onChanged={() => queryClient.invalidateQueries({ queryKey: caseKeys.list(companyId) })}
    />
  )
}
