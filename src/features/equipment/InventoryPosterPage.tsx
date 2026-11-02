import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Box, Printer } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { brandingKeys, fetchBranding, fetchLogoForDisplay } from '@/features/companies/branding'
import { equipmentKeys, fetchEquipmentList } from './api'
import { KIND_LABELS, type EquipmentKind } from './model'
import { POSTER_KINDS, POSTER_TITLES, posterSections } from './poster'
import { useEquipmentLookups } from './useEquipmentLookups'
import { usePhotoThumbs } from './usePhotoThumbs'

const ACCENTS = ['#3b82f6', '#84cc16', '#f97316', '#a855f7', '#06b6d4', '#ef4444']

type Settings = { title: string; subtitle: string; notes: string; theme: 'dark' | 'light'; hidden: string[] }

const PRINT_CSS = `
@page { size: A4 landscape; margin: 0; @top-left { content: ""; } @top-center { content: ""; } @top-right { content: ""; } @bottom-left { content: ""; } @bottom-center { content: ""; } @bottom-right { content: ""; } }
@media print {
  body * { visibility: hidden !important }
  .poster, .poster * { visibility: visible !important }
  .poster { position: absolute; inset: 0 auto auto 0; width: 297mm !important; min-height: 210mm; border-radius: 0 !important; box-shadow: none !important; -webkit-print-color-adjust: exact; print-color-adjust: exact }
  .poster section { break-inside: avoid }
}
`

const storageKey = (companyId: string, kind: string) => `rigtrack:poster:${companyId}:${kind}`

function loadSettings(companyId: string, kind: EquipmentKind): Settings {
  const fallback: Settings = { title: POSTER_TITLES[kind] ?? `${KIND_LABELS[kind]} – inventár`, subtitle: '', notes: '', theme: 'dark', hidden: [] }
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(storageKey(companyId, kind)) ?? '{}') }
  } catch {
    return fallback
  }
}

/**
 * Plagát inventára (A4 na šírku): technika jedného druhu po častiach – veľký počet kusov, fotka, názov a rozmer.
 * Napr. pódium (platne, nohy, zábradlia) alebo hliník (rovné diely podľa série, rohy, základne). /equipment/poster?kind=truss
 */
export function InventoryPosterPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const [params, setParams] = useSearchParams()
  const kind = (POSTER_KINDS.includes(params.get('kind') as EquipmentKind) ? params.get('kind') : 'stage') as EquipmentKind
  // Nastavenie sa pamätá pre každý druh zvlášť; pri zmene druhu sa načíta jeho.
  const [state, setState] = useState(() => ({ key: `${companyId}:${kind}`, settings: loadSettings(companyId, kind) }))
  if (state.key !== `${companyId}:${kind}`) setState({ key: `${companyId}:${kind}`, settings: loadSettings(companyId, kind) })
  const settings = state.settings
  const update = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch }
    setState({ key: `${companyId}:${kind}`, settings: next })
    try {
      localStorage.setItem(storageKey(companyId, kind), JSON.stringify(next))
    } catch {
      // bez úložiska platí nastavenie len do zatvorenia
    }
  }

  const list = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const { categories } = useEquipmentLookups(companyId)
  const branding = useQuery({ queryKey: brandingKeys.branding(companyId), queryFn: () => fetchBranding(companyId) })
  const logo = useQuery({
    queryKey: ['company', companyId, 'logo-display', branding.data?.logoPath],
    queryFn: () => fetchLogoForDisplay(branding.data!.logoPath),
    enabled: Boolean(branding.data?.logoPath),
    staleTime: Infinity,
  })
  const thumbs = usePhotoThumbs(companyId, (list.data ?? []).filter((item) => item.kind === kind).map((item) => item.photoPath))

  if (list.isPending) return <LoadingBlock />
  if (list.isError) return <ErrorBlock message="Techniku sa nepodarilo načítať." onRetry={() => void list.refetch()} />

  const sections = posterSections(list.data, kind, (id) => categories.find((category) => category.id === id)?.name ?? '')
  const shown = sections.filter((section) => !settings.hidden.includes(section.key))
  // Veľké časti (viac ako 4 dlaždice) cez celú šírku, malé po dvoch vedľa seba; posledná osamotená malá tiež cez celú šírku.
  const narrow = shown.filter((section) => section.tiles.length <= 4)
  const isWide = (section: (typeof shown)[number]) =>
    shown.length === 1 || section.tiles.length > 4 || (narrow.length % 2 === 1 && narrow.at(-1) === section)
  const dark = settings.theme === 'dark'
  const notes = settings.notes
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4)
  // Logo musí byť vidno na tmavom aj svetlom podklade.
  const logoFilter = logo.data && ((dark && logo.data.tone === 'dark') || (!dark && logo.data.tone === 'light')) ? 'brightness(0)' + (dark ? ' invert(1)' : '') : undefined

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <Link to="/equipment" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden />
          Technika
        </Link>
        <span className="flex-1" />
        <Button onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden />
          Tlačiť / PDF
        </Button>
      </div>

      <div className="mb-4 grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        <SelectField label="Druh techniky" value={kind} onChange={(e) => setParams({ kind: e.target.value }, { replace: true })}>
          {POSTER_KINDS.map((value) => (
            <option key={value} value={value}>
              {KIND_LABELS[value]}
            </option>
          ))}
        </SelectField>
        <Field label="Nadpis" maxLength={60} value={settings.title} onChange={(e) => update({ title: e.target.value })} />
        <Field label="Podnadpis" maxLength={80} placeholder="napr. Modulárny pódiový systém" value={settings.subtitle} onChange={(e) => update({ subtitle: e.target.value })} />
        <SelectField label="Vzhľad" value={settings.theme} onChange={(e) => update({ theme: e.target.value as Settings['theme'] })}>
          <option value="dark">tmavý</option>
          <option value="light">svetlý (šetrí farbu pri tlači)</option>
        </SelectField>
        <TextareaField
          label="Poznámky dole (každá na riadok, najviac 4)"
          className="sm:col-span-2"
          rows={3}
          placeholder={'Nosnosť 750 kg/m²\nRýchla montáž a demontáž'}
          value={settings.notes}
          onChange={(e) => update({ notes: e.target.value })}
        />
        {sections.length > 0 && (
          <fieldset className="sm:col-span-2">
            <legend className="mb-1 text-sm font-medium">Časti na plagáte</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {sections.map((section) => (
                <label key={section.key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!settings.hidden.includes(section.key)}
                    onChange={(e) => update({ hidden: e.target.checked ? settings.hidden.filter((key) => key !== section.key) : [...settings.hidden, section.key] })}
                  />
                  {section.title} ({section.total})
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </div>

      {sections.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-surface p-6 text-center text-sm text-muted-foreground">
          V technike zatiaľ nie je nič druhu „{KIND_LABELS[kind]}“. {kind === 'truss' && 'Pri hliníku vyplňte typ (1–4-point), tvar a dĺžku – podľa nich sa rozdelí na rovné diely, rohy a základne.'}
          {kind === 'stage' && 'Pri pódiu vyplňte Dosky / Príslušenstvo a rozmer platne.'}
        </p>
      ) : (
        <div className="overflow-x-auto pb-2">
          <article
            className="poster mx-auto flex w-[297mm] min-w-[297mm] flex-col gap-[5mm] overflow-hidden rounded-xl p-[9mm] shadow-lg"
            style={{ minHeight: '210mm', background: dark ? 'radial-gradient(120% 80% at 80% 0%, #1e293b 0%, #0b1120 55%, #05070d 100%)' : '#ffffff', color: dark ? '#f8fafc' : '#0f172a' }}
          >
            <header className="flex items-center gap-[6mm]">
              {logo.data && <img src={logo.data.url} alt="" className="h-[16mm] max-w-[60mm] object-contain" style={{ filter: logoFilter }} />}
              <div className="min-w-0 flex-1">
                <h1 className="text-[13mm] leading-none font-black tracking-tight uppercase">
                  {settings.title.split('–')[0].trim()}
                  {settings.title.includes('–') && <span style={{ color: ACCENTS[0] }}> – {settings.title.split('–').slice(1).join('–').trim()}</span>}
                </h1>
                {settings.subtitle && <p className="mt-[2mm] text-[4mm] tracking-[0.2em] uppercase opacity-70">{settings.subtitle}</p>}
              </div>
              {!logo.data && <p className="text-[4.5mm] font-semibold tracking-[0.25em] uppercase opacity-70">{company.companyName}</p>}
            </header>
            <div className="h-[0.6mm] rounded-full" style={{ background: `linear-gradient(90deg, ${ACCENTS[0]}, transparent)` }} />

            <div className="grid flex-1 content-start gap-[5mm]" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              {shown.map((section, index) => {
                const accent = ACCENTS[index % ACCENTS.length]
                const wide = isWide(section)
                return (
                  <section
                    key={section.key}
                    className="flex flex-col rounded-[3mm] border p-[4mm]"
                    style={{ gridColumn: wide ? '1 / -1' : undefined, borderColor: `${accent}55`, background: dark ? 'rgba(15,23,42,0.6)' : '#f8fafc' }}
                  >
                    <h2 className="mb-[3mm] flex items-center gap-[2.5mm] text-[5mm] font-bold tracking-wide uppercase">
                      <span className="grid size-[7mm] place-items-center rounded-[1.5mm] text-[4mm] text-white" style={{ background: accent }}>
                        {index + 1}
                      </span>
                      {section.title}
                      <span className="ml-auto text-[3.5mm] font-medium tracking-normal normal-case opacity-60">spolu {section.total} ks</span>
                    </h2>
                    <div className="grid gap-[3mm]" style={{ gridTemplateColumns: wide ? 'repeat(auto-fill, minmax(62mm, 1fr))' : 'repeat(2, minmax(0, 1fr))' }}>
                      {section.tiles.map((tile) => (
                        <div key={tile.key} className="flex min-h-[26mm] items-center gap-[3mm] rounded-[2mm] p-[3mm]" style={{ background: dark ? 'rgba(255,255,255,0.04)' : '#ffffff', border: `0.3mm solid ${dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}` }}>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11mm] leading-none font-black tabular-nums" style={{ color: accent }}>
                              {tile.count}
                              <span className="text-[6mm]">×</span>
                            </p>
                            {tile.detail && <p className="mt-[1mm] text-[5mm] leading-tight font-bold">{tile.detail}</p>}
                            <p className="mt-[1mm] border-t pt-[1mm] text-[3.2mm] leading-tight font-medium tracking-wide uppercase opacity-80" style={{ borderColor: `${accent}66` }}>
                              {tile.name}
                            </p>
                          </div>
                          {thumbs[tile.photoPath] ? (
                            <img src={thumbs[tile.photoPath]} alt="" className="size-[22mm] shrink-0 rounded-[1.5mm] object-cover" />
                          ) : (
                            <Box className="size-[12mm] shrink-0 opacity-20" aria-hidden />
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>

            {notes.length > 0 && (
              <footer className="flex flex-wrap items-center gap-x-[8mm] gap-y-[2mm] rounded-[3mm] border px-[5mm] py-[3mm] text-[3.5mm] font-medium tracking-wide uppercase" style={{ borderColor: dark ? 'rgba(255,255,255,0.12)' : '#e2e8f0' }}>
                {notes.map((note, index) => (
                  <span key={index} className="flex items-center gap-[2mm]">
                    <span className="size-[2mm] rounded-full" style={{ background: ACCENTS[index % ACCENTS.length] }} />
                    {note}
                  </span>
                ))}
              </footer>
            )}
          </article>
        </div>
      )}
    </>
  )
}
