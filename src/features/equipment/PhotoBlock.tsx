import { useMutation, useQuery } from '@tanstack/react-query'
import { Camera, Trash2 } from 'lucide-react'
import { useRef } from 'react'
import { usePastedImage } from '@/lib/usePastedImage'
import { Button } from '@/components/ui/button'
import { fetchPhotoUrl, PHOTO_URL_STALE_MS } from './photo'

type Props = {
  /** Kľúč dotazu vlastníka fotky; odkaz na obrázok sa ukladá pod ním. */
  queryKey: readonly unknown[]
  name: string
  photoPath: string
  canEdit: boolean
  onUpload: (file: File) => Promise<unknown>
  onRemove: () => Promise<unknown>
  /** Zavolá sa po každej zmene, nech si vlastník načíta novú cestu. */
  onChanged: () => unknown
}

/** Veľká fotka s tlačidlami na pridanie, zmenu a odstránenie; obrázok sa dá vložiť aj cez Ctrl+V. */
export function PhotoBlock({ queryKey, name, photoPath, canEdit, onUpload, onRemove, onChanged }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)

  const url = useQuery({
    queryKey: [...queryKey, 'photo', photoPath],
    queryFn: () => fetchPhotoUrl(photoPath),
    enabled: Boolean(photoPath),
    staleTime: PHOTO_URL_STALE_MS,
  })
  const upload = useMutation({ mutationFn: onUpload, onSettled: onChanged })
  const remove = useMutation({ mutationFn: onRemove, onSettled: onChanged })
  const busy = upload.isPending || remove.isPending

  // Obrázok skopírovaný inde (napr. zo stránky dodávateľa) sa dá vložiť cez Ctrl+V.
  usePastedImage(canEdit && !busy, (file) => upload.mutate(file))

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
                if (window.confirm('Odstrániť fotku? Admin ju 30 dní vie obnoviť z koša.')) remove.mutate()
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
          Tip: skopírujte obrázok (pravý klik → Kopírovať obrázok) a tu stlačte Ctrl+V.
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
