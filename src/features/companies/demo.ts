import { getSupabase } from '@/lib/supabase/client'

export const demoKeys = {
  mine: (userId: string) => ['user', userId, 'demo-company'] as const,
}

const call = async (name: string) => {
  const { data, error } = await getSupabase().rpc(name)
  if (error) throw error
  return data as string | null
}

/** Id mojej demo firmy alebo null. */
export const fetchMyDemo = () => call('my_demo_company')
/** Založí demo firmu (ak už je, vráti ju). */
export const createDemo = async () => (await call('create_demo_company'))!
/** Zmaže demo firmu a založí ju nanovo s ukážkovými dátami; vráti nové id. */
export const resetDemo = async () => (await call('reset_demo_company'))!
export const deleteDemo = () => call('delete_demo_company')
