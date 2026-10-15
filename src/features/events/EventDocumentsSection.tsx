import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, FileText, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { deleteEventDocument, eventDocumentUrl, eventKeys, fetchEventDocuments, uploadEventDocument } from './api'
import { formatFileSize, MAX_DOCUMENT_BYTES, type EventDocument } from './model'

type Props = { companyId: string; eventId: string; canEdit: boolean }

/** Dokumenty k eventu (rider, stage plot, zmluva…): nahratie, stiahnutie a zmazanie. */
export function EventDocumentsSection({ companyId, eventId, canEdit }: Props) {
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const [tooLarge, setTooLarge] = useState(false)
  const key = eventKeys.documents(companyId, eventId)
  // Fotky eventu majú vlastnú sekciu; dotaz je spoločný.
  const documents = useQuery({
    queryKey: key,
    queryFn: () => fetchEventDocuments(companyId, eventId),
    select: (all) => all.filter((document) => !document.isPhoto),
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: key })

  const upload = useMutation({ mutationFn: (file: File) => uploadEventDocument(companyId, eventId, file), onSettled: refresh })
  const remove = useMutation({ mutationFn: deleteEventDocument, onSettled: refresh })
  // Odkaz je krátkodobý, preto sa pýta až pri kliknutí, nie vopred pre celý zoznam.
  const download = useMutation({
    mutationFn: async (document: EventDocument) => {
      window.location.assign(await eventDocumentUrl(document))
    },
  })

  return (
    <section aria-labelledby="event-documents-heading" className="mb-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 id="event-documents-heading" className="text-sm font-medium text-muted-foreground">
          Dokumenty ({documents.data?.length ?? 0})
        </h2>
        {canEdit && (
          <>
            <input
              ref={fileInput}
              type="file"
              className="sr-only"
              tabIndex={-1}
              accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx,.xls,.xlsx"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (!file) return
                setTooLarge(file.size > MAX_DOCUMENT_BYTES)
                if (file.size <= MAX_DOCUMENT_BYTES) upload.mutate(file)
              }}
            />
            <Button variant="outline" size="sm" disabled={upload.isPending} onClick={() => fileInput.current?.click()}>
              <Upload className="size-4" aria-hidden />
              {upload.isPending ? 'Nahrávam…' : 'Nahrať dokument'}
            </Button>
          </>
        )}
      </div>

      {tooLarge && (
        <p role="alert" className="mb-2 text-sm text-destructive">
          Súbor je väčší ako {formatFileSize(MAX_DOCUMENT_BYTES)}.
        </p>
      )}
      {(upload.isError || remove.isError || download.isError || documents.isError) && (
        <p role="alert" className="mb-2 text-sm text-destructive">
          Operácia s dokumentom zlyhala. Povolené sú PDF, obrázky, Word, Excel a text.
        </p>
      )}

      {documents.data && documents.data.length > 0 ? (
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {documents.data.map((document) => (
            <li key={document.id} className="flex items-center gap-3 px-4 py-3">
              <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{document.name}</span>
                <span className="block text-sm text-muted-foreground">
                  {formatFileSize(document.sizeBytes)} · {formatDate(document.createdAt.slice(0, 10))}
                </span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Stiahnuť: ${document.name}`}
                disabled={download.isPending}
                onClick={() => download.mutate(document)}
              >
                <Download className="size-4" aria-hidden />
              </Button>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Odstrániť: ${document.name}`}
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(`Odstrániť dokument „${document.name}“? Admin ho 30 dní vie obnoviť z koša.`)) remove.mutate(document)
                  }}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        !documents.isPending && (
          <p className="rounded-xl border border-dashed bg-surface px-6 py-8 text-center text-sm text-muted-foreground">
            Žiadne dokumenty. Sem patrí rider, stage plot, zmluva a podobne.
          </p>
        )
      )}
    </section>
  )
}
