import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, Trash2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { equipmentKeys } from './api'
import { fetchPhotoUrl, PHOTO_URL_STALE_MS, removeEquipmentPhoto, uploadEquipmentPhoto } from './photo'

type Props = { companyId: string; equipmentId: string; name: string; photoPath: string; canEdit: boolean }

export function EquipmentPhoto({ companyId, equipmentId, name, photoPath, canEdit }: Props) {
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const refresh = () => queryClient.invalidateQueries({ queryKey: equipmentKeys.detail(companyId, equipmentId) })

  const url = useQuery({
    queryKey: [...equipmentKeys.detail(companyId, equipmentId), 'photo', photoPath],
    queryFn: () => fetchPhotoUrl(photoPath),
    enabled: Boolean(photoPath),
    staleTime: PHOTO_URL_STALE_MS,
  })
  const upload = useMutation({
    mutationFn: (file: File) => uploadEquipmentPhoto(companyId, equipmentId, file, photoPath),
    onSettled: refresh,
  })
  const remove = useMutation({
    mutationFn: () => removeEquipmentPhoto(companyId, equipmentId, photoPath),
    onSettled: refresh,
  })
  const busy = upload.isPending || remove.isPending

  // Obrázok skopírovaný inde (napr. zo stránky dodávateľa) sa dá vložiť cez Ctrl+V.
  const uploadFile = upload.mutate
  useEffect(() => {
    if (!canEdit) return
    function handlePaste(event: ClipboardEvent) {
      const image = [...(event.clipboardData?.files ?? [])].find((file) => file.type.startsWith('image/'))
      if (!image || busy) return
      event.preventDefault()
      uploadFile(image)
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [canEdit, busy, uploadFile])

  if (!photoPath && !canEdit) return null

  return (
    <div className="mb-6">
      {photoPath && url.data && (
        <img src={url.data} alt={`Fotka: ${name}`} className="mb-3 max-h-80 w-full rounded-xl border bg-surface object-contain" />
      )}
      {photoPath && url.isError && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          Fotku sa nepodarilo načítať.
        </p>
      )}
      {canEdit && (
        <div className="flex gap-2">
          {/* Na mobile ponúkne fotoaparát aj galériu. */}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) upload.mutate(file)
            }}
          />
          <Button variant="outline" size="sm" disabled={busy} onClick={() => fileInput.current?.click()}>
            <Camera className="size-4" aria-hidden />
            {upload.isPending ? 'Nahrávam…' : photoPath ? 'Zmeniť fotku' : 'Pridať fotku'}
          </Button>
          {photoPath && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                if (window.confirm('Odstrániť fotku?')) remove.mutate()
              }}
            >
              <Trash2 className="size-4" aria-hidden />
              Odstrániť fotku
            </Button>
          )}
        </div>
      )}
      {canEdit && !photoPath && (
        <p className="mt-2 text-sm text-muted-foreground">
          Tip: skopírujte obrázok produktu (pravý klik → Kopírovať obrázok) a tu stlačte Ctrl+V.
        </p>
      )}
      {(upload.isError || remove.isError) && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          Fotku sa nepodarilo uložiť. Skúste iný obrázok.
        </p>
      )}
    </div>
  )
}
