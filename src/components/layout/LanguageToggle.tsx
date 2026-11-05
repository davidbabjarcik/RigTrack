import { useEffect, useRef } from 'react'
import { useAuth } from '@/features/auth/auth-context'
import { useUserPrefs } from '@/features/settings/userPrefs'
import { setLang, useLang, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/** Prepínač SK / EN (hlavička úvodnej stránky, prihlásenie, nastavenia). */
export function LanguageToggle({ className }: { className?: string }) {
  const lang = useLang()
  return (
    <div role="group" aria-label={lang === 'en' ? 'Language' : 'Jazyk'} className={cn('inline-flex rounded-lg border bg-surface p-0.5 text-xs font-semibold', className)}>
      {(['sk', 'en'] as Lang[]).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={lang === value}
          onClick={() => setLang(value)}
          className={cn('h-7 rounded-md px-2 uppercase', lang === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
        >
          {value}
        </button>
      ))}
    </div>
  )
}

/**
 * Jazyk v účte: po prihlásení sa použije jazyk uložený v účte (na každom zariadení rovnaký), potom sa každá zmena
 * zapíše do účtu. Funguje aj bez súhlasu s funkčným úložiskom prehliadača.
 */
export function LanguageSync() {
  const lang = useLang()
  const signedIn = Boolean(useAuth().session)
  const { prefs, update, loaded } = useUserPrefs()
  const applied = useRef(false)
  useEffect(() => {
    if (!signedIn || !loaded) return
    if (!applied.current) {
      applied.current = true
      if (prefs.language && prefs.language !== lang) {
        setLang(prefs.language)
        return
      }
    }
    if (prefs.language !== lang) update({ language: lang })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- zapisuje sa len pri zmene jazyka alebo načítaní účtu
  }, [lang, signedIn, loaded, prefs.language])
  return null
}
