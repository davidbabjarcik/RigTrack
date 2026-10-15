import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, Trash2 } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { PHOTO_URL_STALE_MS } from '@/features/equipment/photo'
import { deleteEventDocument, eventKeys, eventPhotoUrls, fetchEventDocuments, uploadEventPhoto } from './api'

type Props = { companyId: string; eventId: string; canEdit: boolean }

/** Najviac fotiek naraz v jednom výbere, aby sa mobil nezadusil zmenšovaním. */
const MAX_AT_ONCE = 10

/** Fotky eventu (pódium, miesto, príjazd…): mriežka náhľadov, pridanie viacerých naraz, zmazanie do koša. */
export function EventPhotosSection({ companyId, eventId, canEdit }: Props) {
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const key = eventKeys.documents(companyId, eventId)
  const photos = useQuery({
    queryKey: key,
    queryFn: () => fetchEventDocuments(companyId, eventId),
    select: (all) => all.filter((document) => document.isPhoto),
  })
  const paths = (photos.data ?? []).map((photo) => photo.path)
  const urls = useQuery({
    queryKey: [...key, 'photo-urls', paths],
    queryFn: () => eventPhotoUrls(paths),
    enabled: paths.length > 0,
    staleTime: PHOTO_URL_STALE_MS,
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: key })

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) await uploadEventPhoto(companyId, eventId, file)
    },
    onSettled: refresh,
  })
  const remove = useMutation({ mutationFn: deleteEventDocument, onSettled: refresh })

  const count = photos.data?.length ?? 0
  if (!canEdit && count === 0) return null

  return (
    <section aria-labelledby="event-photos-heading" className="mb-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 id="event-photos-heading" className="text-sm font-medium text-muted-foreground">
          Fotky ({count})
        </h2>
        {canEdit && (
          <>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              tabIndex={-1}
              onChange={(event) => {
                const files = [...(event.target.files ?? [])].filter((file) => file.type.startsWith('image/')).slice(0, MAX_AT_ONCE)
                event.target.value = ''
                if (files.length > 0) upload.mutate(files)
              }}
            />
            <Button variant="outline" size="sm" disabled={upload.isPending} onClick={() => fileInput.current?.click()}>
              <Camera className="size-4" aria-hidden />
              {upload.isPending ? 'Nahrávam…' : 'Pridať fotky'}
            </Button>
          </>
        )}
      </div>

      {(upload.isError || remove.isError || photos.isError) && (
        <p role="alert" className="mb-2 text-sm text-destructive">
          Operácia s fotkou zlyhala. Skúste to znova.
        </p>
      )}

      {count > 0 ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {photos.data!.map((photo) => {
            const url = urls.data?.[photo.path]
            return (
              <li key={photo.id} className="relative aspect-[4/3] overflow-hidden rounded-xl border bg-muted">
                {url && (
                  <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Otvoriť fotku ${photo.name}`}>
                    <img src={url} alt={photo.name} loading="lazy" className="size-full object-cover" />
                  </a>
                )}
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-1.5 right-1.5 bg-surface/90"
                    aria-label={`Odstrániť fotku ${photo.name}`}
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm('Odstrániť fotku? Admin ju 30 dní vie obnoviť z koša.')) remove.mutate(photo)
                    }}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        !photos.isPending && (
          <p className="rounded-xl border border-dashed bg-surface px-6 py-8 text-center text-sm text-muted-foreground">
            Žiadne fotky. Napríklad pódium, miesto alebo príjazd pre dodávku.
          </p>
        )
      )}
    </section>
  )
}
