import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/auth-context'
import { useCompany } from '@/features/companies/company-context'
import { cn } from '@/lib/utils'
import { deleteNotifications, inboxKeys, markRead, timeAgo, useInbox, type InboxItem } from './inbox'

/** Zvonček v hlavičke: počet neprečítaných a zoznam upozornení (aj pre tých, čo nemajú zapnutý push). */
export function NotificationBell({ className }: { className?: string }) {
  const userId = useAuth().session?.user.id
  // Bez prihlásenia (aj v testoch bez dát) sa zvonček nespúšťa.
  return userId ? <InboxBell userId={userId} className={className} /> : null
}

function InboxBell({ userId, className }: { userId: string; className?: string }) {
  const inbox = useInbox(userId)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { memberships, active, setActive } = useCompany()
  const [open, setOpen] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const refresh = () => queryClient.invalidateQueries({ queryKey: inboxKeys.all(userId) })
  const read = useMutation({ mutationFn: markRead, onSettled: refresh })
  const remove = useMutation({ mutationFn: deleteNotifications, onSettled: refresh })

  // Klik mimo panelu alebo Escape ho zavrie.
  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !panel.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  if (inbox.isError || !inbox.data) return null
  const items = inbox.data
  const unread = items.filter((item) => !item.readAt)
  const companyName = (id: string | null) => (memberships.length > 1 && id ? memberships.find((item) => item.companyId === id)?.companyName : undefined)

  function openItem(item: InboxItem) {
    if (!item.readAt) read.mutate([item.id])
    setOpen(false)
    // Upozornenie z inej firmy: najprv prepnúť firmu, potom otvoriť.
    if (item.companyId && item.companyId !== active?.companyId && memberships.some((membership) => membership.companyId === item.companyId)) setActive(item.companyId)
    if (item.url) navigate(item.url)
  }

  return (
    <div ref={panel} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={unread.length > 0 ? `Upozornenia, neprečítané: ${unread.length}` : 'Upozornenia'}
        className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Bell className="size-5" aria-hidden />
        {unread.length > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Upozornenia"
          className="fixed inset-x-2 top-14 z-50 flex max-h-[75dvh] flex-col overflow-hidden rounded-xl border bg-surface shadow-xl md:top-3 md:right-auto md:left-64 md:w-96"
        >
          <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
            <p className="font-medium">Upozornenia</p>
            <div className="flex items-center gap-1">
              {unread.length > 0 && (
                <button type="button" className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-accent hover:bg-muted" onClick={() => read.mutate(unread.map((item) => item.id))}>
                  <CheckCheck className="size-3.5" aria-hidden />
                  Všetko prečítané
                </button>
              )}
              {items.some((item) => item.readAt) && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                  onClick={() => remove.mutate(items.filter((item) => item.readAt).map((item) => item.id))}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Zmazať prečítané
                </button>
              )}
              <button type="button" aria-label="Zavrieť" className="rounded-md p-1 text-muted-foreground hover:bg-muted" onClick={() => setOpen(false)}>
                <X className="size-4" aria-hidden />
              </button>
            </div>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Zatiaľ žiadne upozornenia.</p>
          ) : (
            <ul className="divide-y overflow-y-auto">
              {items.map((item) => (
                <li key={item.id} className={cn('flex items-start gap-2 px-4 py-3', !item.readAt && 'bg-accent/5')}>
                  <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', item.readAt ? 'bg-transparent' : 'bg-accent')} aria-hidden />
                  <button type="button" onClick={() => openItem(item)} className="min-w-0 flex-1 text-left">
                    <span className={cn('block text-sm', !item.readAt && 'font-medium')}>{item.title}</span>
                    {item.body && <span className="block text-sm text-muted-foreground">{item.body}</span>}
                    <span className="block text-xs text-muted-foreground">{[timeAgo(item.createdAt), companyName(item.companyId)].filter(Boolean).join(' · ')}</span>
                  </button>
                  <button type="button" aria-label={`Zmazať: ${item.title}`} className="rounded-md p-1 text-muted-foreground/60 hover:bg-muted hover:text-foreground" onClick={() => remove.mutate([item.id])}>
                    <X className="size-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
