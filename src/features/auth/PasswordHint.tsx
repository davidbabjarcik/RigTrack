import { Check, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { passwordRules } from './passwordRules'

/** Pod políčkom nového hesla: čo heslo musí obsahovať, splnené body so zaškrtnutím. */
export function PasswordHint({ password, lang }: { password: string; lang: 'sk' | 'en' }) {
  return (
    <ul className="-mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs" aria-label={lang === 'en' ? 'Password requirements' : 'Požiadavky na heslo'}>
      {passwordRules(password).map((rule) => (
        <li key={rule.key} className={cn('flex items-center gap-1', rule.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground')}>
          {rule.ok ? <Check className="size-3.5" aria-hidden /> : <Circle className="size-3" aria-hidden />}
          <span>{lang === 'en' ? rule.en : rule.sk}</span>
          <span className="sr-only">{rule.ok ? (lang === 'en' ? ' – done' : ' – splnené') : lang === 'en' ? ' – missing' : ' – chýba'}</span>
        </li>
      ))}
    </ul>
  )
}
