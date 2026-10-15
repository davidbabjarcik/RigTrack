import { useMutation } from '@tanstack/react-query'
import { Camera, Trash2 } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { fetchPhotoUrl } from './photo'
import { PhotoThumb } from './PhotoThumb'

type Props = {
  name: string
  photoPath: string
  /** Adresa náhľadu (z usePhotoThumbs). */
  thumbUrl: string | undefined
  canEdit: boolean
  onUpload: (file: File) => Promise<unknown>
  onRemove: () => Promise<unknown>
  onChanged: () => unknown
}

/** Malá fotka do riadku zoznamu: klik ju otvorí, pri úprave sa dá pridať, zmeniť alebo odstrániť. */
export function CompactPhoto({ name, photoPath, thumbUrl, canEdit, onUpload, onRemove, onChanged }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const upload = useMutation({ mutationFn: onUpload, onSettled: onChanged })
  const remove = useMutation({ mutationFn: onRemove, onSettled: onChanged })
  const open = useMutation({
    mutationFn: async () => {
      // Odkaz je krátkodobý, preto sa pýta až pri kliknutí.
      window.open(await fetchPhotoUrl(photoPath), '_blank', 'noopener')
    },
  })
  const busy = upload.isPending || remove.isPending

  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      {photoPath ? (
        <button type="button" aria-label={`Otvoriť fotku: ${name}`} onClick={() => open.mutate()} className="rounded-lg">
          <PhotoThumb url={thumbUrl} />
        </button>
      ) : (
        canEdit && (
          <button
            type="button"
            aria-label={`Pridať fotku: ${name}`}
            disabled={busy}
            onClick={() => input.current?.click()}
            className="flex size-12 items-center justify-center rounded-lg border border-dashed text-muted-foreground hover:bg-muted"
          >
            <Camera className="size-4" aria-hidden />
          </button>
        )
      )}
      {canEdit && photoPath && (
        <div className="flex">
          <Button variant="ghost" size="sm" className="h-6 px-1" aria-label={`Zmeniť fotku: ${name}`} disabled={busy} onClick={() => input.current?.click()}>
            <Camera className="size-3.5" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1"
            aria-label={`Odstrániť fotku: ${name}`}
            disabled={busy}
            onClick={() => {
              if (window.confirm('Odstrániť fotku? Admin ju 30 dní vie obnoviť z koša.')) remove.mutate()
            }}
          >
            <Trash2 className="size-3.5" aria-hidden />
          </Button>
        </div>
      )}
      {(upload.isError || remove.isError) && <span className="text-xs text-destructive">Nepodarilo sa</span>}
      <input
        ref={input}
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
    </div>
  )
}
