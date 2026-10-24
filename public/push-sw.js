// RigTrack: push upozornenia v service workeri (načíta ho vygenerovaný sw.js cez importScripts).
// Zobrazí upozornenie a po ťuknutí otvorí appku na správnej stránke (aj keď beží v podpriečinku).

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'RigTrack', body: event.data ? event.data.text() : '' }
  }
  const icon = new URL('icons/icon-192.png', self.registration.scope).href
  event.waitUntil(
    self.registration.showNotification(data.title || 'RigTrack', {
      body: data.body || '',
      icon,
      badge: icon,
      tag: data.tag,
      data: { url: data.url || '' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const path = String((event.notification.data && event.notification.data.url) || '').replace(/^\//, '')
  const target = new URL(path, self.registration.scope).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => client.url.startsWith(self.registration.scope))
      if (open) {
        open.focus()
        return open.navigate(target)
      }
      return self.clients.openWindow(target)
    }),
  )
})
