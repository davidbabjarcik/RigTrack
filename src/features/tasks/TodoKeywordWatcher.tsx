import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/auth-context'
import { useCompany } from '@/features/companies/company-context'
import { addTodoFromField, taskKeys } from './api'
import { cleanLabel, DATE_KEYWORD, hasKeyword, pushKey, stripKeyword, todoTitle } from './todoKeyword'

type Field = HTMLInputElement | HTMLTextAreaElement
const SKIPPED = new Set(['password', 'checkbox', 'radio', 'file', 'submit', 'button', 'range', 'color', 'hidden'])
// Dátum sa nepíše po znakoch do hodnoty – v ňom sa hľadá zadaný dátum 31. 12. 1800.
const DATE_TYPES = new Set(['date', 'datetime-local', 'month'])

/** Názov políčka: popis (label), inak aria-label alebo placeholder. */
function fieldLabel(field: Field) {
  const label = field.labels?.[0]?.textContent ?? field.getAttribute('aria-label') ?? field.getAttribute('placeholder') ?? field.name
  return cleanLabel(label ?? '')
}

/** Čoho sa políčko týka: hodnota políčka „Názov“ vo formulári, inak nadpis stránky. */
function itemName(field: Field) {
  const form = field.closest('form') ?? document
  const named = form.querySelector<HTMLInputElement>('input[name="name"]')
  if (named && named !== field && named.value.trim()) return named.value.trim()
  return document.querySelector('main h1')?.textContent?.trim() ?? ''
}

/** Nastaví hodnotu tak, aby si ju všimol aj formulár (react-hook-form). */
function setNativeValue(field: Field, value: string) {
  const proto = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(field, value)
  field.dispatchEvent(new Event('input', { bubbles: true }))
}

/**
 * Kdekoľvek v appke: napíšete do políčka @todo (alebo @addtodo; do čísla 31121800, do dátumu 31. 12. 1800) a vznikne úloha „Doplniť: Váha – LED Par“
 * s odkazom späť na túto stránku. Dá sa použiť viackrát, aj v jednom formulári.
 */
export function TodoKeywordWatcher() {
  const userId = useAuth().session?.user.id
  // Bez prihlásenia (aj v testoch bez dát) sa nespúšťa.
  return userId ? <Watcher userId={userId} /> : null
}

function Watcher({ userId }: { userId: string }) {
  const company = useCompany().active
  const location = useLocation()
  const queryClient = useQueryClient()
  const buffers = useRef(new WeakMap<Element, string>())
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null)
  const context = useRef({ companyId: company?.companyId, userId, link: location.pathname + location.search })
  useEffect(() => {
    context.current = { companyId: company?.companyId, userId, link: location.pathname + location.search }
  }, [company?.companyId, userId, location.pathname, location.search])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const field = event.target
      if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return
      if (field instanceof HTMLInputElement && (SKIPPED.has(field.type) || DATE_TYPES.has(field.type))) return
      const { buffer, hit } = pushKey(buffers.current.get(field) ?? '', event.key)
      buffers.current.set(field, buffer)
      if (hit) addTodo(field)
    }
    function onDate(event: Event) {
      const field = event.target
      if (field instanceof HTMLInputElement && DATE_TYPES.has(field.type) && field.value.startsWith(DATE_KEYWORD.slice(0, field.type === 'month' ? 7 : 10))) addTodo(field)
    }
    function addTodo(field: Field) {
      const { companyId, userId: me, link } = context.current
      if (!companyId || !me) return
      const title = todoTitle(fieldLabel(field), itemName(field))
      // Kľúčové slovo (aj 31121800 a dátum 31. 12. 1800) z políčka zmizne.
      window.setTimeout(() => {
        if (field instanceof HTMLInputElement && DATE_TYPES.has(field.type)) setNativeValue(field, '')
        else if (hasKeyword(field.value)) setNativeValue(field, stripKeyword(field.value))
      }, 0)
      addTodoFromField(companyId, me, title, link)
        .then(() => {
          setToast({ ok: true, text: title })
          void queryClient.invalidateQueries({ queryKey: taskKeys.list(companyId) })
        })
        .catch(() => setToast({ ok: false, text: 'Úlohu sa nepodarilo pridať – možno nemáte oprávnenie pridávať úlohy.' }))
    }
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('change', onDate, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('change', onDate, true)
    }
  }, [queryClient])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 5000)
    return () => window.clearTimeout(timer)
  }, [toast])

  if (!toast) return null
  return (
    <div role="status" className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border bg-surface p-3 text-sm shadow-lg md:bottom-6 print:hidden">
      {toast.ok && <CheckCircle2 className="size-5 shrink-0 text-emerald-500" aria-hidden />}
      <span className="min-w-0 flex-1">
        {toast.ok ? (
          <>
            Pridané do úloh: <span className="font-medium">{toast.text}</span>
          </>
        ) : (
          <span className="text-destructive">{toast.text}</span>
        )}
      </span>
      {toast.ok && (
        <Link to="/todos" className="shrink-0 font-medium text-accent hover:underline">
          Úlohy
        </Link>
      )}
      <button type="button" aria-label="Zavrieť" className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => setToast(null)}>
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}
