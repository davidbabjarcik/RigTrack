// Push upozornenia na mobil: prihlásenie prehliadača (Web Push) a uloženie odberu do Supabase.
import { getSupabase } from '@/lib/supabase/client'

/** VAPID kľúč z base64url na bajty, ako ho chce pushManager.subscribe. */
export function keyToBytes(base64url: string) {
  const padded = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

export type PushSupport = 'ok' | 'unsupported' | 'ios-home-screen'

/** Vie tento prehliadač push? iPhone len z appky pridanej na plochu (iOS 16.4+). */
export function pushSupport(): PushSupport {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
  if (ios && !standalone) return 'ios-home-screen'
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window ? 'ok' : 'unsupported'
}

export async function currentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration()
  return registration ? registration.pushManager.getSubscription() : null
}

/** Zapne upozornenia na tomto zariadení: povolenie, odber u prehliadača a uloženie do databázy. */
export async function enablePush() {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('denied')
  const { data, error } = await getSupabase().functions.invoke('send-push', { method: 'GET' })
  const publicKey = (data as { publicKey?: string } | null)?.publicKey
  if (error || !publicKey) throw new Error('not-configured')
  const registration = await navigator.serviceWorker.ready
  const subscription = (await registration.pushManager.getSubscription()) ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) }))
  const json = subscription.toJSON() as { endpoint: string; keys?: { p256dh?: string; auth?: string } }
  const db = getSupabase()
  await db.from('push_subscriptions').delete().eq('endpoint', json.endpoint)
  const { error: saveError } = await db
    .from('push_subscriptions')
    .insert({ endpoint: json.endpoint, p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '', user_agent: navigator.userAgent.slice(0, 300) })
  if (saveError) throw saveError
}

/** Vypne upozornenia na tomto zariadení. */
export async function disablePush() {
  const subscription = await currentSubscription()
  if (!subscription) return
  await getSupabase().from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
  await subscription.unsubscribe()
}

/** Skúšobné upozornenie sebe (pošle ho funkcia send-push cez webhook). */
export async function sendTestPush(userId: string) {
  const { error } = await getSupabase().from('notifications').insert({ user_id: userId, title: 'RigTrack – skúška', body: 'Upozornenia na tomto zariadení fungujú.', url: '/' })
  if (error) throw error
}
