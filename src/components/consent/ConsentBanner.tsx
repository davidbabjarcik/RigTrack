import { Cookie, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { markSynced, onConsentChange, readConsent, saveConsent, type ConsentRecord } from '@/lib/consent'
import { supabase } from '@/lib/supabase/client'

const base = import.meta.env.BASE_URL

/** Prihlásený používateľ: voľba sa zapíše aj do databázy (preukázanie súhlasu), raz na každú zmenu. */
async function syncToServer(record: ConsentRecord | null) {
  if (!supabase || !record || record.synced) return
  const { data } = await supabase.auth.getSession()
  if (!data.session) return
  const { error } = await supabase.from('consent_records').insert({ version: record.version, functional: record.functional, analytics: false, marketing: false, given_at: record.at })
  if (!error) markSynced()
}

const CATEGORIES = [
  {
    id: 'necessary',
    title: 'Nevyhnutné',
    always: true,
    text: 'Prihlásenie (Supabase), vybraná firma, ochrana prihlásenia, rozpracovaný pack list bez signálu a táto voľba. Bez nich appka nefunguje, preto nepotrebujú súhlas.',
  },
  {
    id: 'functional',
    title: 'Funkčné',
    always: false,
    text: 'Zapamätanie vašich nastavení v tomto prehliadači: svetlý / tmavý režim, filtre a triedenie zoznamov, zbalené časti, pripnuté položky menu a firmy, rozloženie štatistík, nastavenia štítkov a kalkulačiek.',
  },
  { id: 'analytics', title: 'Analytické', always: false, unused: true, text: 'RigTrack nepoužíva žiadnu analytiku ani meranie návštevnosti.' },
  { id: 'marketing', title: 'Marketingové', always: false, unused: true, text: 'RigTrack nepoužíva reklamu ani remarketing.' },
] as const

/**
 * Lišta súhlasu pri prvej návšteve (alebo po zmene pravidiel) a nastavenia, ktoré sa dajú kedykoľvek otvoriť
 * z pätičky. Odmietnutie je rovnako jednoduché ako prijatie.
 */
export function ConsentBanner() {
  const [record, setRecord] = useState(readConsent)
  const [open, setOpen] = useState(false)
  const [functional, setFunctional] = useState(record?.functional ?? false)

  useEffect(() => {
    const showSettings = () => {
      setFunctional(readConsent()?.functional ?? false)
      setOpen(true)
    }
    window.addEventListener('rigtrack:consent-open', showSettings)
    const stop = onConsentChange(() => setRecord(readConsent()))
    // Po prihlásení sa zapíše voľba, ktorá ešte nie je na serveri.
    const subscription = supabase?.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') void syncToServer(readConsent())
    })
    return () => {
      window.removeEventListener('rigtrack:consent-open', showSettings)
      stop()
      subscription?.data.subscription.unsubscribe()
    }
  }, [])

  const choose = (allowFunctional: boolean) => {
    const saved = saveConsent({ functional: allowFunctional })
    setOpen(false)
    void syncToServer(saved)
  }

  if (record && !open) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 print:hidden sm:p-4" role="dialog" aria-modal={open} aria-labelledby="consent-title">
      <div className="mx-auto max-w-3xl rounded-2xl border bg-surface p-4 shadow-2xl sm:p-5">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 id="consent-title" className="font-semibold">
              Ukladanie údajov v prehliadači
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              RigTrack nepoužíva cookies, analytiku ani reklamu. Do úložiska prehliadača ukladá len to, čo potrebuje na fungovanie, a – ak súhlasíte –
              vaše nastavenia zobrazenia. Viac v{' '}
              <a href={`${base}cookies`} className="text-accent hover:underline">
                Zásadách používania cookies
              </a>{' '}
              a{' '}
              <a href={`${base}ochrana-sukromia`} className="text-accent hover:underline">
                Ochrane súkromia
              </a>
              .
            </p>
          </div>
          {record && (
            <Button variant="ghost" size="sm" className="size-8 p-0" aria-label="Zavrieť" onClick={() => setOpen(false)}>
              <X className="size-4" aria-hidden />
            </Button>
          )}
        </div>

        {open && (
          <ul className="mt-4 flex flex-col gap-2">
            {CATEGORIES.map((category) => {
              const checked = category.always || (category.id === 'functional' && functional)
              const disabled = category.always || 'unused' in category
              return (
                <li key={category.id} className="rounded-xl border p-3">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 size-4"
                      checked={checked}
                      disabled={disabled}
                      onChange={(event) => category.id === 'functional' && setFunctional(event.target.checked)}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {category.title}
                        {category.always && <span className="ml-2 text-xs font-normal text-muted-foreground">vždy zapnuté</span>}
                        {'unused' in category && <span className="ml-2 text-xs font-normal text-muted-foreground">nepoužívame</span>}
                      </span>
                      <span className="block text-sm text-muted-foreground">{category.text}</span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {open ? (
            <Button variant="outline" onClick={() => choose(functional)}>
              Uložiť výber
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                setFunctional(record?.functional ?? false)
                setOpen(true)
              }}
            >
              Prispôsobiť
            </Button>
          )}
          <Button variant="outline" onClick={() => choose(false)}>
            Odmietnuť nepovinné
          </Button>
          <Button variant="outline" onClick={() => choose(true)}>
            Prijať všetky
          </Button>
        </div>
      </div>
    </div>
  )
}
