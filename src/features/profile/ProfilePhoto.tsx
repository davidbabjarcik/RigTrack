import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, Trash2, UserRound } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { Membership } from '@/features/companies/company-context'
import { clearMyPhoto, myPhotoKeys, setMyPhoto, useMyPhoto } from './photo'

/** Moja fotka: nahrá sa do karty zamestnanca vo všetkých mojich firmách naraz. */
export function ProfilePhoto({ userId, memberships }: { userId: string; memberships: Membership[] }) {
  const queryClient = useQueryClient()
  const photo = useMyPhoto(userId)
  const input = useRef<HTMLInputElement>(null)
  const [failed, setFailed] = useState<string[]>([])
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: myPhotoKeys.all(userId) }), queryClient.invalidateQueries({ queryKey: ['company'] })])
  const upload = useMutation({ mutationFn: (file: File) => setMyPhoto(photo.data?.cards ?? [], file), onSuccess: setFailed, onSettled: refresh })
  const remove = useMutation({ mutationFn: () => clearMyPhoto(photo.data?.cards ?? []), onSettled: refresh })
  const busy = upload.isPending || remove.isPending
  const cards = photo.data?.cards ?? []
  const nameOf = (companyId: string) => memberships.find((item) => item.companyId === companyId)?.companyName ?? 'firma'
  const missing = photo.data?.path ? cards.filter((card) => !card.photoPath) : []

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border bg-surface p-4 text-center">
      <span className="flex size-32 items-center justify-center overflow-hidden rounded-full border bg-muted">
        {photo.data?.url ? <img src={photo.data.url} alt="Moja fotka" className="size-full object-cover" /> : <UserRound className="size-12 text-muted-foreground" aria-hidden />}
      </span>
      {cards.length === 0 ? (
        <p className="text-xs text-muted-foreground">Fotku pridáte, keď budete členom aspoň jednej firmy.</p>
      ) : (
        <>
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
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="sm" variant="outline" disabled={busy || photo.isPending} onClick={() => input.current?.click()}>
              <Camera className="size-4" aria-hidden />
              {upload.isPending ? 'Nahrávam…' : photo.data?.path ? 'Zmeniť fotku' : 'Pridať fotku'}
            </Button>
            {photo.data?.path && (
              <Button size="sm" variant="ghost" aria-label="Odstrániť fotku" disabled={busy} onClick={() => window.confirm('Odstrániť fotku zo všetkých firiem?') && remove.mutate()}>
                <Trash2 className="size-4" aria-hidden />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Uloží sa do vašej karty vo všetkých firmách.</p>
          {missing.length > 0 && <p className="text-xs text-accent">Vo firme {missing.map((card) => nameOf(card.companyId)).join(', ')} fotka chýba – nahrajte ju znova.</p>}
        </>
      )}
      {failed.length > 0 && <p className="text-xs text-destructive">Nepodarilo sa nahrať do: {failed.map(nameOf).join(', ')}.</p>}
      {(upload.isError || remove.isError) && <p className="text-xs text-destructive">Fotku sa nepodarilo uložiť.</p>}
    </div>
  )
}
