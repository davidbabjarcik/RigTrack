import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, FileText, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatFileSize, MAX_DOCUMENT_BYTES } from '@/features/events/model'
import { formatDate } from '@/lib/format'
import {
  attachmentKeys,
  attachmentUrl,
  deleteAttachment,
  fetchAttachments,
  uploadAttachment,
  type Attachment,
  type AttachmentEntity,
} from './api'

type Props = {
  companyId: string
  entity: AttachmentEntity
  entityId: string
  canEdit: boolean
  title: string
  /** Text, keď záznam žiadnu prílohu nemá. */
  empty: string
}

/** Prílohy záznamu (fotky, PDF, doklady): nahratie, stiahnutie a zmazanie. */
export function Attachments({ companyId, entity, entityId, canEdit, title, empty }: Props) {
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const [tooLarge, setTooLarge] = useState(false)
  const key = attachmentKeys.list(companyId, entity, entityId)
  const attachments = useQuery({ queryKey: key, queryFn: () => fetchAttachments(companyId, entity, entityId) })
  const refresh = () => queryClient.invalidateQueries({ queryKey: key })

  const upload = useMutation({ mutationFn: (file: File) => uploadAttachment(companyId, entity, entityId, file), onSettled: refresh })
  const remove = useMutation({ mutationFn: deleteAttachment, onSettled: refresh })
  // Odkaz je krátkodobý, preto sa pýta až pri kliknutí, nie vopred pre celý zoznam.
  const download = useMutation({
    mutationFn: async (attachment: Attachment) => {
      window.location.assign(await attachmentUrl(attachment))
    },
  })

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          {title} ({attachments.data?.length ?? 0})
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
              {upload.isPending ? 'Nahrávam…' : 'Nahrať súbor'}
            </Button>
          </>
        )}
      </div>

      {tooLarge && (
        <p role="alert" className="mb-2 text-sm text-destructive">
          Súbor je väčší ako {formatFileSize(MAX_DOCUMENT_BYTES)}.
        </p>
      )}
      {(upload.isError || remove.isError || download.isError || attachments.isError) && (
        <p role="alert" className="mb-2 text-sm text-destructive">
          Operácia so súborom zlyhala. Povolené sú PDF, obrázky, Word, Excel a text.
        </p>
      )}

      {attachments.data && attachments.data.length > 0 ? (
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {attachments.data.map((attachment) => (
            <li key={attachment.id} className="flex items-center gap-3 px-4 py-3">
              <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{attachment.name}</span>
                <span className="block text-sm text-muted-foreground">
                  {formatFileSize(attachment.sizeBytes)} · {formatDate(attachment.createdAt.slice(0, 10))}
                </span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Stiahnuť: ${attachment.name}`}
                disabled={download.isPending}
                onClick={() => download.mutate(attachment)}
              >
                <Download className="size-4" aria-hidden />
              </Button>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Odstrániť: ${attachment.name}`}
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(`Odstrániť súbor „${attachment.name}“? Admin ho 30 dní vie obnoviť z koša.`)) remove.mutate(attachment)
                  }}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        !attachments.isPending && (
          <p className="rounded-xl border border-dashed bg-surface px-6 py-8 text-center text-sm text-muted-foreground">{empty}</p>
        )
      )}
    </section>
  )
}
