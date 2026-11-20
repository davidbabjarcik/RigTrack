import { useMutation, useQuery } from '@tanstack/react-query'
import { PenLine } from 'lucide-react'
import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PrintButton } from '@/components/print/PrintButton'
import { Button } from '@/components/ui/button'
import { SignaturePad } from '@/features/loans/SignaturePad'
import { formatDate } from '@/lib/format'
import { fetchSharedContract, signSharedContract } from './contractApi'
import { ContractDocument } from './ContractDocument'

const PRINT_CSS = `
@page { size: A4; margin: 18mm; @top-left { content: ""; } @top-center { content: ""; } @top-right { content: ""; } @bottom-left { content: ""; } @bottom-center { content: ""; } @bottom-right { content: ""; } }
@media print { html, body { background: #fff !important; } }
`

/** Zmluva pre klienta cez odkaz (bez prihlásenia): prečítať, vytlačiť a raz podpísať za seba. */
export function SharedContractPage() {
  const sheet = useRef<HTMLDivElement>(null)
  const { token = '' } = useParams()
  const contract = useQuery({ queryKey: ['shared-contract', token], queryFn: () => fetchSharedContract(token), retry: false })
  const [signing, setSigning] = useState(false)
  const sign = useMutation({
    mutationFn: ({ name, image }: { name: string; image: string }) => signSharedContract(token, name, image),
    onSuccess: () => {
      setSigning(false)
      void contract.refetch()
    },
  })

  if (contract.isPending) return <p className="p-8 text-center text-sm text-neutral-600">Načítavam zmluvu…</p>
  if (contract.isError || !contract.data) {
    return <p className="p-8 text-center text-sm text-neutral-600">Zmluva sa nenašla. Odkaz už nemusí platiť – kontaktujte toho, kto vám ho poslal.</p>
  }
  const data = contract.data
  const rental = data.snapshot.terms.kind === 'rental'
  const role = rental ? 'Nájomca' : 'Objednávateľ'

  return (
    <div className="min-h-dvh bg-neutral-100 py-6 text-black print:bg-white print:py-0">
      <style>{PRINT_CSS}</style>
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <p className="text-sm text-neutral-600">
          Zmluva {data.number} od {data.snapshot.supplier.name || data.companyName}
        </p>
        <PrintButton sheet={sheet} fileName={`zmluva-${data.number}`} marginMm={18} variant="outline" label="Tlačiť / uložiť ako PDF" />
      </div>
      <div className="px-2 print:px-0">
        <ContractDocument
          snapshot={data.snapshot}
          number={data.number}
          sheetRef={sheet}
          signatures={{
            supplier: data.supplierSignature ? { name: data.supplierSigner, image: data.supplierSignature } : undefined,
            client: data.clientSignature ? { name: data.clientSigner, image: data.clientSignature } : undefined,
          }}
        />
      </div>
      <div className="mx-auto mt-4 max-w-[210mm] px-4 print:hidden">
        {data.clientSignature ? (
          <p className="rounded-lg bg-emerald-100 p-4 text-sm text-emerald-900">
            Zmluvu ste podpísali ({data.clientSigner}). Ďakujeme – kópiu si môžete vytlačiť alebo uložiť ako PDF.
          </p>
        ) : (
          <div className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow">
            <p className="font-medium">Súhlasíte so zmluvou?</p>
            <p className="text-sm text-neutral-600">Prečítajte si ju a podpíšte prstom alebo myšou ako {role.toLowerCase()}. Podpis sa uloží k zmluve a uvidí ho aj druhá strana.</p>
            <Button className="self-start" onClick={() => setSigning(true)}>
              <PenLine className="size-4" aria-hidden />
              Podpísať zmluvu
            </Button>
            {sign.isError && <p className="text-sm text-red-700">Podpis sa nepodarilo uložiť. Skúste to znova.</p>}
          </div>
        )}
        <p className="mt-3 text-center text-xs text-neutral-500">Uložená {formatDate(data.createdAt.slice(0, 10))}</p>
      </div>
      {signing && (
        <SignaturePad
          title={`Podpis: ${role}`}
          statement={`Podpisom potvrdzujem zmluvu ${data.number} so všetkými jej podmienkami.`}
          defaultName={data.snapshot.client.representative || data.snapshot.client.name}
          saving={sign.isPending}
          error={sign.isError}
          onSave={(name, image) => sign.mutate({ name, image })}
          onClose={() => setSigning(false)}
        />
      )}
    </div>
  )
}
