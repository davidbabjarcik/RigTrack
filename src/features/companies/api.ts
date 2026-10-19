import { defaultPermissions } from '@/features/permissions/catalog'
import type { Role } from '@/lib/roles'
import { getSupabase } from '@/lib/supabase/client'
import type { Membership } from './company-context'

export type Member = { userId: string; email: string; fullName: string; role: Role }
export type Invitation = { id: string; email: string; role: Role }
export type MyInvitation = { id: string; companyName: string; role: Role }

// Query keys nesú používateľa alebo firmu, aby sa dáta rôznych tenantov nikdy nezmiešali.
export const companyKeys = {
  memberships: (userId: string) => ['memberships', userId] as const,
  myInvitations: (userId: string) => ['my-invitations', userId] as const,
  members: (companyId: string) => ['company', companyId, 'members'] as const,
  invitations: (companyId: string) => ['company', companyId, 'invitations'] as const,
}

export async function fetchMemberships(userId: string): Promise<Membership[]> {
  const { data, error } = await getSupabase()
    .from('company_members')
    .select('role, company:companies(id, name)')
    .eq('user_id', userId)
  if (error) throw error
  const rows = data as unknown as { role: Role; company: { id: string; name: string } }[]
  return rows
    // Skutočné oprávnenia aktívnej firmy doplní CompanyProvider; dovtedy platia predvolené podľa roly.
    .map((row) => ({ companyId: row.company.id, companyName: row.company.name, role: row.role, permissions: defaultPermissions(row.role) }))
    .sort((a, b) => a.companyName.localeCompare(b.companyName, 'sk'))
}

export async function fetchMyInvitations(email: string): Promise<MyInvitation[]> {
  const { data, error } = await getSupabase()
    .from('company_invitations')
    .select('id, role, company:companies(name)')
    .eq('email', email.toLowerCase())
  if (error) throw error
  const rows = data as unknown as { id: string; role: Role; company: { name: string } }[]
  return rows.map((row) => ({ id: row.id, role: row.role, companyName: row.company.name }))
}

export async function createCompany(name: string): Promise<string> {
  const { data, error } = await getSupabase().rpc('create_company', { _name: name })
  if (error) throw error
  return data as string
}

export async function acceptInvitation(id: string): Promise<string> {
  const { data, error } = await getSupabase().rpc('accept_invitation', { _invitation_id: id })
  if (error) throw error
  return data as string
}

export async function deleteInvitation(id: string) {
  const { error } = await getSupabase().from('company_invitations').delete().eq('id', id)
  if (error) throw error
}

export async function fetchMembers(companyId: string): Promise<Member[]> {
  const { data, error } = await getSupabase()
    .from('company_members')
    .select('user_id, role, profile:profiles(email, full_name)')
    .eq('company_id', companyId)
  if (error) throw error
  const rows = data as unknown as { user_id: string; role: Role; profile: { email: string; full_name: string } }[]
  return rows
    .map((row) => ({ userId: row.user_id, role: row.role, email: row.profile.email, fullName: row.profile.full_name }))
    .sort((a, b) => a.email.localeCompare(b.email))
}

export async function updateMemberRole(companyId: string, userId: string, role: Role) {
  const { error } = await getSupabase()
    .from('company_members')
    .update({ role })
    .eq('company_id', companyId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function removeMember(companyId: string, userId: string) {
  const { error } = await getSupabase().from('company_members').delete().eq('company_id', companyId).eq('user_id', userId)
  if (error) throw error
}

export async function fetchInvitations(companyId: string): Promise<Invitation[]> {
  const { data, error } = await getSupabase()
    .from('company_invitations')
    .select('id, email, role')
    .eq('company_id', companyId)
    .order('email')
  if (error) throw error
  return data as Invitation[]
}

export async function inviteMember(companyId: string, email: string, role: Role) {
  const { error } = await getSupabase()
    .from('company_invitations')
    .insert({ company_id: companyId, email: email.trim().toLowerCase(), role })
  if (error) throw error
}

export type AccountStatus = { email: string; userId: string | null; isMember: boolean; hasAccount: boolean; confirmed: boolean; lastSignInAt: string | null }

export const accountStatusKey = (companyId: string) => ['company', companyId, 'account-status'] as const

/** Kto z členov a pozvaných má účet, potvrdený e-mail a kedy sa naposledy prihlásil (len admin). */
export async function fetchAccountStatus(companyId: string): Promise<AccountStatus[]> {
  const { data, error } = await getSupabase().rpc('company_account_status', { _company: companyId })
  if (error) throw error
  return (data as { email: string; user_id: string | null; is_member: boolean; has_account: boolean; confirmed: boolean; last_sign_in_at: string | null }[]).map((row) => ({
    email: row.email.toLowerCase(),
    userId: row.user_id,
    isMember: row.is_member,
    hasAccount: row.has_account,
    confirmed: row.confirmed,
    lastSignInAt: row.last_sign_in_at,
  }))
}
