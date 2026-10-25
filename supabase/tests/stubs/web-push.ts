// Náhrada knižnice web-push pre test funkcie send-push: zapamätá si odoslané upozornenia.
type Sub = { endpoint: string; keys: { p256dh: string; auth: string } }
export const sent: { endpoint: string; payload: string }[] = []
/** Endpointy, pri ktorých „prehliadač“ odpovie, že odber už neexistuje (410). */
export const gone = new Set<string>()
export let vapid: {
  subject: string
  publicKey: string
  privateKey: string
} | null = null

export default {
  setVapidDetails(subject: string, publicKey: string, privateKey: string) {
    vapid = { subject, publicKey, privateKey }
  },
  async sendNotification(subscription: Sub, payload: string) {
    if (gone.has(subscription.endpoint)) throw Object.assign(new Error('Gone'), { statusCode: 410 })
    sent.push({ endpoint: subscription.endpoint, payload })
  },
}
