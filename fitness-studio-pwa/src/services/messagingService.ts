import { getMessaging, getToken, onMessage, deleteToken } from 'firebase/messaging'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  doc,
} from 'firebase/firestore'
import { db } from './firebase'
import { FCMDocument } from '../types'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || ''

/**
 * Запрос разрешения на отправку уведомлений
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('[Notifications] Notifications API not supported')
    return 'denied'
  }

  const permission = await Notification.requestPermission()
  console.log('[Notifications] Permission:', permission)
  return permission
}

/**
 * Получить FCM токен устройства
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    const messaging = getMessaging()
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
    })

    if (token) {
      console.log('[Notifications] FCM Token received')
    } else {
      console.warn('[Notifications] No FCM token — permission may be denied')
    }

    return token
  } catch (error) {
    console.error('[Notifications] Error getting FCM token:', error)
    return null
  }
}

/**
 * Сохранить FCM токен в Firestore
 */
export async function saveFCMToken(
  userId: string,
  fcmToken: string,
  platform: 'web' | 'android' | 'ios' = 'web'
): Promise<string | null> {
  try {
    const tokensRef = collection(db, 'fcm_tokens')

    // Проверяем, есть ли уже такой токен
    const existingQuery = query(tokensRef, where('fcmToken', '==', fcmToken))
    const existingSnapshot = await getDocs(existingQuery)

    if (!existingSnapshot.empty) {
      const existingDoc = existingSnapshot.docs[0]
      console.log('[Notifications] Token already exists, updating:', existingDoc.id)
      await updateDoc(doc(db, 'fcm_tokens', existingDoc.id), {
        lastUsedAt: serverTimestamp(),
        isActive: true,
      })
      return existingDoc.id
    }

    const payload = {
      userId,
      fcmToken,
      platform,
      createdAt: serverTimestamp(),
      lastUsedAt: serverTimestamp(),
      isActive: true,
    }

    console.log('[Notifications] Writing payload:', payload)

    const docRef = await addDoc(tokensRef, payload)
    console.log('[Notifications] FCM token saved with ID:', docRef.id)
    return docRef.id
  } catch (error) {
    console.error('[Notifications] Error saving FCM token:', error)
    console.error('[Notifications] Error details:', (error as Error).message)
    return null
  }
}

/**
 * Инициализация FCM: запрос разрешения → получение токена → сохранение
 */
export async function initializeFCM(userId: string): Promise<boolean> {
  const permission = await requestNotificationPermission()

  if (permission !== 'granted') {
    return false
  }

  const token = await getFCMToken()

  if (!token) {
    return false
  }

  const tokenId = await saveFCMToken(userId, token)
  return !!tokenId
}

/**
 * Подписка на обновления сообщений (foreground)
 */
export function onForegroundMessage(callback: (payload: Record<string, unknown>) => void) {
  try {
    const messaging = getMessaging()
    return onMessage(messaging, (payload) => {
      console.log('[Notifications] Foreground message:', payload)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      callback(payload as any)
    })
  } catch (error) {
    console.error('[Notifications] Error setting up foreground message handler:', error)
    return () => {}
  }
}

/**
 * Получить все активные токены пользователя
 */
export async function getUserFCMTokens(userId: string): Promise<FCMDocument[]> {
  try {
    const tokensRef = collection(db, 'fcm_tokens')
    const q = query(tokensRef, where('userId', '==', userId), where('isActive', '==', true))
    const snapshot = await getDocs(q)

    return snapshot.docs.map((d) => ({
      tokenId: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.() || new Date(),
      lastUsedAt: d.data().lastUsedAt?.toDate?.() || new Date(),
    })) as FCMDocument[]
  } catch (error) {
    console.error('[Notifications] Error getting user FCM tokens:', error)
    return []
  }
}

/**
 * Отозвать все токены пользователя (отключение уведомлений)
 */
export async function revokeAllFCMTokens(userId: string): Promise<void> {
  try {
    const tokens = await getUserFCMTokens(userId)

    for (const token of tokens) {
      if (token.tokenId) {
        await deleteDoc(doc(db, 'fcm_tokens', token.tokenId))
      }
    }

    // Также отзываем токен из браузера
    try {
      const messaging = getMessaging()
      await deleteToken(messaging)
    } catch {
      // Token may not exist
    }

    console.log('[Notifications] All FCM tokens revoked for user:', userId)
  } catch (error) {
    console.error('[Notifications] Error revoking FCM tokens:', error)
  }
}

/**
 * Проверка поддержки уведомлений
 */
export function isNotificationsSupported(): boolean {
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

/**
 * Получить текущее разрешение
 */
export function getCurrentPermission(): NotificationPermission | null {
  if (!('Notification' in window)) return null
  return Notification.permission
}
