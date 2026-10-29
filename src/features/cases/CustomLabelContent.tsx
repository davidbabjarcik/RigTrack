import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, Trash2 } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { usePastedImage } from '@/lib/usePastedImage'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { discardPhotoFile, storeCompanyPhoto, trashPhoto } from '@/features/equipment/photo'
import { caseKeys, saveCaseLabelCustom } from './api'
import { caseBaseName, type Case } from './model'

type Props = { companyId: string; current: Case; canEdit: boolean }

/**
 * Vlastný názov a fotka na štítku pre case, v ktorom nie je označený hlavný prvok
 * (napr. case s drobnosťami, kde žiadna jedna vec nie je „hlavná“).
 */
export function CustomLabelContent({ companyId, current, canEdit }: Props) {
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState<string | null>(null)
  const refresh = () => queryClient.invalidateQueries({ queryKey: caseKeys.list(companyId) })
  const titleValue = title ?? current.labelTitle

  const saveTitle = useMutation({
    mutationFn: () => saveCaseLabelCustom(companyId, current.id, { labelTitle: titleValue }),
    onSuccess: () => setTitle(null),
    onSettled: refresh,
  })
  const uploadPhoto = useMutation({
    mutationFn: async (file: File) => {
      const path = await storeCompanyPhoto(companyId, `case-${current.id}`, file)
      await saveCaseLabelCustom(companyId, current.id, { labelPhotoPath: path })
      if (current.labelPhotoPath) await discardPhotoFile(current.labelPhotoPath).catch(() => {})
    },
    onSettled: refresh,
  })
  const removePhoto = useMutation({
    mutationFn: () => trashPhoto('cases', current.id),
    onSettled: refresh,
  })
  const busy = uploadPhoto.isPending || removePhoto.isPending

  // Ctrl+V: skopírovaný obrázok (z webu, snímka obrazovky) sa nahrá ako fotka štítku.
  usePastedImage(canEdit && !busy, (file) => uploadPhoto.mutate(file))

  if (!canEdit) return null

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    saveTitle.mutate()
  }

  return (
    <section aria-labelledby="custom-label-heading" className="mt-4 rounded-xl border bg-surface p-4">
      <h2 id="custom-label-heading" className="font-medium">
        Vlastný obsah štítku
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        V tomto case nie je označený hlavný prvok. Môžete napísať vlastný názov a pridať vlastnú fotku.
      </p>

      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <Button type="button" variant="outline" onClick={() => setTitle(caseBaseName(current).slice(0, 80))} disabled={titleValue === caseBaseName(current).slice(0, 80)}>
          Z názvu case
        </Button>
        <Field
          label="Názov na štítku"
          placeholder="napr. Blindre 2-Lite"
          maxLength={80}
          className="flex-1"
          value={titleValue}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Button type="submit" disabled={saveTitle.isPending || titleValue.trim() === current.labelTitle}>
          {saveTitle.isPending ? 'Ukladám…' : 'Uložiť názov'}
        </Button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) uploadPhoto.mutate(file)
          }}
        />
        <Button variant="outline" size="sm" disabled={busy} onClick={() => fileInput.current?.click()}>
          <Camera className="size-4" aria-hidden />
          {uploadPhoto.isPending ? 'Nahrávam…' : current.labelPhotoPath ? 'Zmeniť fotku' : 'Pridať fotku'}
        </Button>
        <span className="self-center text-xs text-muted-foreground">alebo skopírovaný obrázok vložte cez Ctrl+V</span>
        {current.labelPhotoPath && (
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => removePhoto.mutate()}>
            <Trash2 className="size-4" aria-hidden />
            Odstrániť fotku
          </Button>
        )}
      </div>

      {(saveTitle.isError || uploadPhoto.isError || removePhoto.isError) && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          Zmenu sa nepodarilo uložiť.
        </p>
      )}
    </section>
  )
}
