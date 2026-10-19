import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PenLine, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/format'
import type { Loan } from './model'
import { SignaturePad } from './SignaturePad'
import { deleteSignature, saveSignature, SIGNATURE_LABELS, signatureKeys, signatureOf, useLoanSignatures, type SignaturePhase, type SignatureRole } from './signatures'

const STATEMENTS: Record<SignaturePhase, Record<SignatureRole, string>> = {
  issue: {
    borrower: 'Podpisom potvrdzujem, že som techniku podľa zapožičacej listiny prevzal(a) kompletnú a funkčnú a vrátim ju v dohodnutom termíne.',
    lender: 'Podpisom potvrdzujem odovzdanie techniky podľa zapožičacej listiny.',
  },
  return: {
    borrower: 'Podpisom potvrdzujem vrátenie techniky; zistené poškodenia sú uvedené v listine.',
    lender: 'Podpisom potvrdzujem, že som techniku prevzal(a) späť.',
  },
}

type Props = { companyId: string; loan: Loan; myName: string; canEdit: boolean }

/** Podpisy na mobile pri vydaní a vrátení; objavia sa aj na zapožičacej listine. */
export function LoanSignatures({ companyId, loan, myName, canEdit }: Props) {
  const queryClient = useQueryClient()
  const signatures = useLoanSignatures(companyId, loan.id)
  const [open, setOpen] = useState<{ phase: SignaturePhase; role: SignatureRole } | null>(null)
  const refresh = () => queryClient.invalidateQueries({ queryKey: signatureKeys.ofLoan(companyId, loan.id) })
  const save = useMutation({
    mutationFn: ({ name, image }: { name: string; image: string }) => saveSignature(companyId, loan.id, open!.phase, open!.role, name, image),
    onSuccess: () => setOpen(null),
    onSettled: refresh,
  })
  const remove = useMutation({ mutationFn: deleteSignature, onSettled: refresh })
  // Vrátenie sa podpisuje až keď technika odišla.
  const phases: SignaturePhase[] = loan.status === 'reserved' ? ['issue'] : ['issue', 'return']
  const count = signatures.data?.length ?? 0

  return (
    <CollapsibleSection id="loan.signatures" title={<>Podpisy ({count})</>} className="mt-6">
      {signatures.isError ? (
        <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">Podpisy nie sú dostupné. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {phases.map((phase) => (
            <div key={phase}>
              <p className="mb-2 text-sm font-medium">{phase === 'issue' ? 'Odovzdanie' : 'Vrátenie'}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(['borrower', 'lender'] as const).map((role) => {
                  const signature = signatureOf(signatures.data, phase, role)
                  return (
                    <div key={role} className="rounded-xl border bg-surface p-3">
                      <p className="text-sm text-muted-foreground">{SIGNATURE_LABELS[phase][role]}</p>
                      {signature ? (
                        <>
                          <img src={signature.image} alt={`Podpis: ${signature.signerName}`} className="mt-2 h-20 w-full rounded-lg bg-white object-contain" />
                          <p className="mt-1 flex items-center justify-between gap-2 text-sm">
                            <span>
                              <span className="font-medium">{signature.signerName}</span>
                              <span className="text-muted-foreground"> · {formatDateTime(signature.signedAt)}</span>
                            </span>
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label="Zmazať podpis"
                                disabled={remove.isPending}
                                onClick={() => window.confirm('Zmazať tento podpis?') && remove.mutate(signature.id)}
                              >
                                <Trash2 className="size-4" aria-hidden />
                              </Button>
                            )}
                          </p>
                        </>
                      ) : canEdit ? (
                        <Button variant="outline" className="mt-2 w-full" onClick={() => setOpen({ phase, role })}>
                          <PenLine className="size-4" aria-hidden />
                          Podpísať
                        </Button>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">Zatiaľ nepodpísané.</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Mobil podajte klientovi, podpíše sa prstom. Podpisy sa vytlačia aj na zapožičacej listine (PDF).</p>
        </div>
      )}
      {open && (
        <SignaturePad
          title={SIGNATURE_LABELS[open.phase][open.role]}
          statement={STATEMENTS[open.phase][open.role]}
          defaultName={open.role === 'borrower' ? loan.borrower : myName}
          saving={save.isPending}
          error={save.isError}
          onSave={(name, image) => save.mutate({ name, image })}
          onClose={() => {
            save.reset()
            setOpen(null)
          }}
        />
      )}
    </CollapsibleSection>
  )
}
