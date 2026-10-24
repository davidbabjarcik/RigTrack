import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FlaskConical, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { errorDetail } from '@/lib/supabase/errors'
import { companyKeys } from './api'
import { useCompany } from './company-context'
import { createDemo, deleteDemo, demoKeys, fetchMyDemo, resetDemo } from './demo'

/** Vlastná demo firma používateľa: založiť, otvoriť, vrátiť do pôvodného stavu, zmazať. */
export function DemoSettings({ userId, realCompanies = 0 }: { userId: string; realCompanies?: number }) {
  const [expanded, setExpanded] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { active, setActive } = useCompany()
  const demo = useQuery({ queryKey: demoKeys.mine(userId), queryFn: fetchMyDemo })

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: companyKeys.memberships(userId) }),
      queryClient.invalidateQueries({ queryKey: demoKeys.mine(userId) }),
    ])
  const open = async (companyId: string) => {
    await refresh()
    // Údaje starej demo firmy v pamäti už neplatia.
    queryClient.removeQueries({ queryKey: ['company', companyId] })
    setActive(companyId)
    navigate('/')
  }
  const create = useMutation({ mutationFn: createDemo, onSuccess: open })
  const reset = useMutation({ mutationFn: resetDemo, onSuccess: open })
  const remove = useMutation({
    mutationFn: deleteDemo,
    onSuccess: async () => {
      await refresh()
      if (active?.companyId === demo.data) navigate('/company/select')
    },
  })
  const busy = create.isPending || reset.isPending || remove.isPending
  const failed = create.isError || reset.isError || remove.isError || demo.isError

  // Kto už má vlastné firmy a demo nemá, vidí len malý odkaz – demo nezavadzia na hlavnej obrazovke.
  if (!expanded && !demo.data && !failed && realCompanies >= 1)
    return (
      <button type="button" onClick={() => setExpanded(true)} className="inline-flex items-center justify-center gap-1.5 self-center text-xs text-muted-foreground hover:text-foreground">
        <FlaskConical className="size-3.5" aria-hidden />
        Vyskúšať demo firmu
      </button>
    )

  return (
    <div className="rounded-xl border bg-surface p-4">
      <div className="flex items-start gap-3">
        <FlaskConical className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-medium">Demo firma</p>
          <p className="text-sm text-muted-foreground">
            Vaša vlastná ukážková firma s vymyslenou technikou, cases, eventmi a výpožičkou. Môžete v nej skúšať čokoľvek; reset ju vráti
            do pôvodného stavu. Vaše skutočné firmy to neovplyvní.
          </p>
        </div>
      </div>
      {failed && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          Nepodarilo sa. {errorDetail(create.error ?? reset.error ?? remove.error ?? demo.error)}
          <span className="block text-muted-foreground">
            Ak to nepomôže ani o chvíľu, kontaktujte vývojára aplikácie.
          </span>
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {demo.data ? (
          <>
            {active?.companyId !== demo.data && (
              <Button size="sm" disabled={busy} onClick={() => void open(demo.data!)}>
                Otvoriť demo
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => {
                if (window.confirm('Resetovať demo firmu? Všetko, čo ste v nej zmenili, sa stratí a nahradí ukážkovými dátami.')) reset.mutate()
              }}
            >
              <RotateCcw className="size-4" aria-hidden />
              {reset.isPending ? 'Resetujem…' : 'Resetovať demo'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                if (window.confirm('Zmazať demo firmu aj so všetkým, čo v nej je?')) remove.mutate()
              }}
            >
              <Trash2 className="size-4" aria-hidden />
              Zmazať demo
            </Button>
          </>
        ) : (
          <Button size="sm" disabled={busy || demo.isPending} onClick={() => create.mutate()}>
            {create.isPending ? 'Zakladám…' : 'Vytvoriť demo firmu'}
          </Button>
        )}
      </div>
    </div>
  )
}
