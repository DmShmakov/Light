import { initializeApp } from 'firebase/app'
import { getMessaging } from 'firebase/messaging/sw'

// TODO: Replace with actual Firebase config (same as main app)
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
}

// Initialize Firebase in Service Worker
const app = initializeApp(firebaseConfig)
const messaging = getMessaging(app)

// Handle push notifications
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return

  let payload: { title?: string; body?: string; data?: Record<string, unknown> }
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Новое уведомление', body: event.data.text() }
  }

  const title = payload.title || 'Фитнес Студия'
  const body = payload.body || ''
  const data = payload.data || {}

  const options: NotificationOptions = {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: (data.classId as string) || 'default',
    requireInteraction: data.type === 'class_cancelled' || data.type === 'class_changed',
    data: {
      url: data.classId ? `/class/${data.classId}` : '/',
      type: data.type,
    },
    actions: [
      { action: 'view', title: 'Посмотреть' },
      data.type === 'class_cancelled' ? { action: 'dismiss', title: 'Закрыть' } : null,
    ].filter(Boolean) as NotificationAction[],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Handle notification click
self.addEventListener('notificationclick', (event: ExtendableNotificationEvent) => {
  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus()
        }
      }

      // No window open, open a new one
      if ('openWindow' in clients) {
        return (clients as unknown as { openWindow: (url: string) => Promise<Client> }).openWindow(urlToOpen)
      }

      return undefined
    })
  )
})

export {}
