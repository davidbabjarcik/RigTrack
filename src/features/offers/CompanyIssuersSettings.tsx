import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, TextareaField } from '@/components/ui/field'
import { useCompanyProfile } from '@/features/companies/profile'
import { cn } from '@/lib/utils'
import { deleteIssuer, ISSUER_KIND_LABELS, offerKeys, saveIssuer, useIssuers, type Issuer, type IssuerKind } from './api'
import { EMPTY_ISSUER, type OfferIssuer } from './model'

const KINDS: { kind: Exclude<IssuerKind, 'other'>; hint: string; placeholder: string }[] = [
  { kind: 'sro', hint: 'Firma vystavuje ponuky a faktúry ako s.r.o.', placeholder: 'napr. Firma s.r.o.' },
  { kind: 'zivnost', hint: 'Firma vystavuje aj ako živnostník (SZČO).', placeholder: 'napr. Meno Priezvisko' },
]

/** Nastavenia → Firma: ako firma vystavuje ponuky – s.r.o., živnosť alebo oboje, každé so svojimi údajmi. */
export function CompanyIssuersSettings({ companyId }: { companyId: string }) {
  const issuers = useIssuers(companyId)
  if (issuers.isPending) return <p className="text-sm text-muted-foreground">Načítavam…</p>
  if (issuers.isError) return <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">Táto časť zatiaľ nie je dostupná – treba spustiť migrácie 0096 a 0097.</p>
  const others = issuers.data.filter((item) => item.kind === 'other')
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">Zaškrtnite, ako firma vystavuje ponuky. V cenovej ponuke potom vyberiete len z toho, čo je tu zapnuté.</p>
      <div className="grid gap-3 lg:grid-cols-2">
        {KINDS.map((item) => (
          <IssuerCard key={item.kind} companyId={companyId} kind={item.kind} hint={item.hint} placeholder={item.placeholder} current={issuers.data.find((issuer) => issuer.kind === item.kind) ?? null} />
        ))}
      </div>
      {others.map((issuer) => (
        <IssuerCard key={issuer.id} companyId={companyId} kind="other" hint="Iný vystavovateľ (zo starších ponúk)." placeholder="" current={issuer} />
      ))}
    </div>
  )
}

function IssuerCard({ companyId, kind, hint, placeholder, current }: { companyId: string; kind: IssuerKind; hint: string; placeholder: string; current: Issuer | null }) {
  const queryClient = useQueryClient()
  const profile = useCompanyProfile(companyId)
  const [editing, setEditing] = useState(false)
  const [fields, setFields] = useState<OfferIssuer>(current ?? EMPTY_ISSUER)
  const refresh = () => queryClient.invalidateQueries({ queryKey: offerKeys.issuers(companyId) })
  const save = useMutation({ mutationFn: () => saveIssuer(companyId, current?.id ?? null, fields, kind), onSuccess: () => setEditing(false), onSettled: refresh })
  const remove = useMutation({ mutationFn: () => deleteIssuer(companyId, current!.id), onSettled: refresh })
  const set = (patch: Partial<OfferIssuer>) => setFields({ ...fields, ...patch })
  const enabled = Boolean(current) || editing

  function toggle(on: boolean) {
    if (on) {
      // Prvé zapnutie s.r.o.: predvyplní sa z Údajov o firme.
      const firm = profile.data
      setFields(
        current ??
          (kind === 'sro' && firm
            ? { ...EMPTY_ISSUER, name: firm.legalName, address: firm.address, ico: firm.ico, dic: firm.dic, icDph: firm.icDph, contact: [firm.phone, firm.email].filter(Boolean).join('\n'), vatPayer: Boolean(firm.icDph) }
            : { ...EMPTY_ISSUER, vatPayer: kind !== 'zivnost' }),
      )
      setEditing(true)
    } else if (current) {
      if (window.confirm(`Vypnúť vystavovanie ako ${ISSUER_KIND_LABELS[kind]}? Staršie ponuky si údaje nechajú.`)) remove.mutate()
    } else setEditing(false)
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    if (fields.name.trim()) save.mutate()
  }

  return (
    <div className={cn('flex flex-col gap-3 rounded-xl border bg-surface p-4', !enabled && 'opacity-80')}>
      <label className="flex items-start gap-2">
        <input type="checkbox" className="mt-1 size-4" checked={enabled} onChange={(e) => toggle(e.target.checked)} />
        <span>
          <span className="block font-medium">{ISSUER_KIND_LABELS[kind]}</span>
          <span className="block text-xs text-muted-foreground">{hint}</span>
        </span>
      </label>
      {current && !editing && (
        <div className="flex items-start justify-between gap-2 text-sm">
          <p className="whitespace-pre-line text-muted-foreground">
            <span className="font-medium text-foreground">{current.name}</span>
            {[current.address, current.ico && `IČO ${current.ico}`, current.vatPayer ? 'platiteľ DPH' : 'neplatiteľ DPH'].filter(Boolean).map((line) => `\n${line}`)}
          </p>
          <Button variant="outline" size="sm" onClick={() => (setFields(current), setEditing(true))}>
            Upraviť
          </Button>
        </div>
      )}
      {editing && (
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <Field label="Názov / meno *" className="sm:col-span-2" placeholder={placeholder} maxLength={160} value={fields.name} onChange={(e) => set({ name: e.target.value })} />
          <TextareaField label="Adresa / sídlo" className="sm:col-span-2" rows={2} maxLength={300} value={fields.address} onChange={(e) => set({ address: e.target.value })} />
          <Field label="IČO" maxLength={20} value={fields.ico} onChange={(e) => set({ ico: e.target.value })} />
          <Field label="DIČ" maxLength={20} value={fields.dic} onChange={(e) => set({ dic: e.target.value })} />
          <Field label="IČ DPH" maxLength={20} value={fields.icDph} onChange={(e) => set({ icDph: e.target.value })} />
          <label className="flex items-center gap-2 self-end pb-3 text-sm">
            <input type="checkbox" className="size-4" checked={fields.vatPayer} onChange={(e) => set({ vatPayer: e.target.checked })} />
            Platiteľ DPH
          </label>
          <TextareaField label="Kontakt (telefón, e-mail, web)" className="sm:col-span-2" rows={2} maxLength={300} value={fields.contact} onChange={(e) => set({ contact: e.target.value })} />
          {save.isError && <p className="text-sm text-destructive sm:col-span-2">Nepodarilo sa uložiť.</p>}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" size="sm" disabled={!fields.name.trim() || save.isPending}>
              Uložiť
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Zrušiť
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
