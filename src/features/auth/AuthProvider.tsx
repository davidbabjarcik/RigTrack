import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client'
import { AuthContext, type AuthState } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<AuthState>({ session: null, loading: isSupabaseConfigured })

  useEffect(() => {
    if (!supabase) return
    let userId: string | undefined
    // Prvá udalosť je INITIAL_SESSION, takže samostatné getSession() netreba.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      // Dáta predchádzajúceho používateľa nesmú prežiť odhlásenie ani zmenu účtu.
      if (session?.user.id !== userId) queryClient.clear()
      userId = session?.user.id
      setState({ session, loading: false })
    })
    return () => data.subscription.unsubscribe()
  }, [queryClient])

  return <AuthContext value={state}>{children}</AuthContext>
}
