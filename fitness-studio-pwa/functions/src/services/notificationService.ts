/**
 * Notification Service — общая логика отправки push-уведомлений
 */

import * as admin from 'firebase-admin'
import * as logger from 'firebase-functions/logger'

export interface NotificationPayload {
  title: string
  body: string
  data?: Record<string, string>
  icon?: string
  tag?: string
  requireInteraction?: boolean
  actions?: Array<{ action: string; title: string }>
}

export interface NotificationAction {
  action: string
  title: string
}

/**
 * Получить все активные FCM-токены пользователя
 */
export async function getUserTokens(userId: string): Promise<string[]> {
  const tokensSnapshot = await admin
    .firestore()
    .collection('fcm_tokens')
    .where('userId', '==', userId)
    .where('isActive', '==', true)
    .get()

  return tokensSnapshot.docs
    .map((doc) => doc.data().fcmToken as string)
    .filter(Boolean)
}

/**
 * Проверить, включён ли тип уведомлений у пользователя
 */
export async function isNotificationTypeEnabled(
  userId: string,
  type: string
): Promise<boolean> {
  const userDoc = await admin.firestore().collection('users').doc(userId).get()

  if (!userDoc.exists) return false

  const data = userDoc.data()
  const preferences = data?.preferences

  // Глобальное выключение
  if (preferences?.notificationsEnabled === false) return false

  // Проверка конкретного типа
  const types = preferences?.notificationTypes
  if (!types) return true // По умолчанию все включены

  return types[type] !== false
}

/**
 * Отправить push-уведомление пользователю
 */
export async function sendToUser(
  userId: string,
  type: string,
  payload: NotificationPayload
): Promise<number> {
  // Проверяем тип уведомлений
  const enabled = await isNotificationTypeEnabled(userId, type)
  if (!enabled) {
    logger.info(`[Notifications] Type ${type} disabled for user ${userId}`)
    return 0
  }

  // Получаем токены
  const tokens = await getUserTokens(userId)
  if (tokens.length === 0) {
    logger.warn(`[Notifications] No tokens for user ${userId}`)
    return 0
  }

  // Формируем message
  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: {
      ...payload.data,
      _icon: payload.icon || '/pwa-192x192.png',
      _tag: payload.tag || '',
      _requireInteraction: payload.requireInteraction ? 'true' : 'false',
      _actions: JSON.stringify(payload.actions || []),
    },
    webpush: {
      notification: {
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: payload.tag,
        requireInteraction: payload.requireInteraction,
        actions: payload.actions,
      },
      fcmOptions: {
        link: '/',
      },
    },
    android: {
      notification: {
        icon: 'ic_notification',
        tag: payload.tag,
        sound: 'default',
      },
    },
    apns: {
      payload: {
        aps: {
          alert: {
            title: payload.title,
            body: payload.body,
          },
          sound: 'default',
        },
      },
    },
  }

  // Отправляем
  const response = await admin.messaging().sendEachForMulticast(message)

  // Обрабатываем ошибки (невалидные токены)
  if (response.failureCount > 0) {
    const failedTokens: string[] = []
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const error = resp.error
        if (
          error?.code === 'messaging/invalid-registration-token' ||
          error?.code === 'messaging/registration-token-not-registered'
        ) {
          failedTokens.push(tokens[idx])
        }
        logger.warn(`[Notifications] FCM error: ${error?.message}`, {
          userId,
          token: tokens[idx],
        })
      }
    })

    // Очищаем невалидные токены
    if (failedTokens.length > 0) {
      await cleanupInvalidTokens(failedTokens)
    }
  }

  logger.info(
    `[Notifications] Sent to ${response.successCount}/${tokens.length} tokens for user ${userId}`,
    { type }
  )

  return response.successCount
}

/**
 * Очистить невалидные токены
 */
async function cleanupInvalidTokens(tokens: string[]): Promise<void> {
  const batch = admin.firestore().batch()

  for (const token of tokens) {
    const query = await admin
      .firestore()
      .collection('fcm_tokens')
      .where('fcmToken', '==', token)
      .limit(1)
      .get()

    if (!query.empty) {
      batch.update(query.docs[0].ref, { isActive: false })
    }
  }

  await batch.commit()
  logger.info(`[Notifications] Cleaned up ${tokens.length} invalid tokens`)
}

/**
 * Отправить уведомление всем записанным на занятие
 */
export async function sendToClassEnrollments(
  classId: string,
  type: string,
  payload: NotificationPayload
): Promise<number> {
  const enrollmentsSnapshot = await admin
    .firestore()
    .collection('enrollments')
    .where('classId', '==', classId)
    .where('status', '==', 'confirmed')
    .get()

  let sentCount = 0
  const userIds = enrollmentsSnapshot.docs.map((d) => d.data().userId as string)

  for (const userId of userIds) {
    const count = await sendToUser(userId, type, payload)
    sentCount += count
  }

  return sentCount
}

/**
 * Отправить администраторам
 */
export async function sendToAdmins(
  type: string,
  payload: NotificationPayload
): Promise<number> {
  const adminsSnapshot = await admin
    .firestore()
    .collection('users')
    .where('roles', 'array-contains', 'admin')
    .get()

  let sentCount = 0

  for (const doc of adminsSnapshot.docs) {
    const count = await sendToUser(doc.id, type, payload)
    sentCount += count
  }

  return sentCount
}
