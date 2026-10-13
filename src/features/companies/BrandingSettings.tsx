import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImageUp, Trash2 } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { brandingKeys, fetchBranding, fetchLogoBlob, removeLogo, saveLabelFooter, uploadLogo } from './branding'

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function LogoPreview({ companyId, path }: { companyId: string; path: string }) {
  const logo = useQuery({
    queryKey: [...brandingKeys.logo(companyId, path), 'preview'],
    queryFn: async () => blobToDataUrl(await fetchLogoBlob(path)),
    staleTime: Infinity,
  })
  const url = logo.data

  if (logo.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Logo sa nepodarilo načítať.
      </p>
    )
  }
  // Biely podklad: logo sa tlačí na biely štítok, nech je vidieť, ako tam bude vyzerať.
  return (
    <div className="flex h-28 w-48 items-center justify-center rounded-lg border bg-white p-3">
      {url && <img src={url} alt="Logo firmy" className="max-h-full max-w-full" />}
    </div>
  )
}

/** Logo a kontaktný riadok, ktoré sa tlačia na flight case štítky. Iba pre admina. */
export function BrandingSettings({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const branding = useQuery({ queryKey: brandingKeys.branding(companyId), queryFn: () => fetchBranding(companyId) })
  const [footer, setFooter] = useState<string | null>(null)
  const refresh = () => queryClient.invalidateQueries({ queryKey: brandingKeys.branding(companyId) })

  const upload = useMutation({
    mutationFn: (file: File) => uploadLogo(companyId, file, branding.data?.logoPath ?? ''),
    onSettled: refresh,
  })
  const remove = useMutation({ mutationFn: () => removeLogo(companyId, branding.data!.logoPath), onSettled: refresh })
  const saveFooter = useMutation({
    mutationFn: (text: string) => saveLabelFooter(companyId, text),
    onSuccess: () => setFooter(null),
    onSettled: refresh,
  })

  if (branding.isPending) return <p className="text-sm text-muted-foreground">Načítavam…</p>
  if (branding.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Nastavenie štítkov sa nepodarilo načítať.
      </p>
    )
  }

  const { logoPath, labelFooter } = branding.data
  const footerValue = footer ?? labelFooter
  const busy = upload.isPending || remove.isPending

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    saveFooter.mutate(footerValue)
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-4">
        {logoPath ? (
          <LogoPreview companyId={companyId} path={logoPath} />
        ) : (
          <div className="flex h-28 w-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            bez loga
          </div>
        )}
        <div className="flex flex-col items-start gap-2">
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) upload.mutate(file)
            }}
          />
          <Button variant="outline" size="sm" disabled={busy} onClick={() => fileInput.current?.click()}>
            <ImageUp className="size-4" aria-hidden />
            {upload.isPending ? 'Nahrávam…' : logoPath ? 'Zmeniť logo' : 'Nahrať logo'}
          </Button>
          {logoPath && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                if (window.confirm('Odstrániť logo firmy?')) remove.mutate()
              }}
            >
              <Trash2 className="size-4" aria-hidden />
              Odstrániť
            </Button>
          )}
          <p className="text-sm text-muted-foreground">PNG, JPG alebo WebP. Jednofarebné pozadie sa odstráni samo a prázdne okraje sa orežú. Tmavé logo sa v tmavom režime zobrazí biele, svetlé sa na bielom papieri vytlačí čierne.</p>
        </div>
      </div>
      {(upload.isError || remove.isError) && (
        <p role="alert" className="text-sm text-destructive">
          Logo sa nepodarilo uložiť. Skúste iný obrázok.
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-end">
        <Field
          label="Kontaktný riadok na štítku"
          placeholder="+421 900 000 000 • info@firma.sk • www.firma.sk"
          maxLength={200}
          className="flex-1"
          value={footerValue}
          onChange={(e) => setFooter(e.target.value)}
        />
        <Button type="submit" disabled={saveFooter.isPending || footerValue.trim() === labelFooter}>
          {saveFooter.isPending ? 'Ukladám…' : 'Uložiť'}
        </Button>
      </form>
      {saveFooter.isError && (
        <p role="alert" className="text-sm text-destructive">
          Text sa nepodarilo uložiť.
        </p>
      )}
    </div>
  )
}
