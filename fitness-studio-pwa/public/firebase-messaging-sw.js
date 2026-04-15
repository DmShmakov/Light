/* eslint-env serviceworker */

// ============================================================
// Firebase SDK через CDN (compat build для Service Worker)
// ============================================================
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js')

// ============================================================
// TODO: Вставь сюда свою Firebase конфигурацию из Firebase Console
// Project settings → Your apps → Config
// ============================================================
const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
}

// Инициализация Firebase в Service Worker
const messaging = firebaseConfig.apiKey
  ? (firebase.initializeApp(firebaseConfig), firebase.messaging())
  : null

// ============================================================
// Handle push notifications
// ============================================================
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Фитнес Студия', body: event.data.text() }
  }

  const title = payload.title || 'Фитнес Студия'
  const body = payload.body || ''
  const data = payload.data || {}

  const options = {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: data.classId || 'default',
    requireInteraction: data.type === 'class_cancelled' || data.type === 'class_changed',
    data: {
      url: data.classId ? `/class/${data.classId}` : '/',
      type: data.type,
    },
    actions: [
      { action: 'view', title: 'Посмотреть' },
    ],
  }

  if (data.type === 'class_cancelled') {
    options.actions.push({ action: 'dismiss', title: 'Закрыть' })
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// ============================================================
// Handle notification click
// ============================================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus()
        }
      }
      if ('openWindow' in clients) {
        return clients.openWindow(urlToOpen)
      }
      return undefined
    })
  )
})
