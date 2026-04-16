/**
 * Token Service — управление FCM-токенами устройств
 */

import * as admin from 'firebase-admin'
import * as logger from 'firebase-functions/logger'

export interface FCMTokenData {
  userId: string
  fcmToken: string
  platform: 'web' | 'android' | 'ios'
  createdAt: admin.firestore.Timestamp
  lastUsedAt: admin.firestore.Timestamp
  isActive: boolean
}

/**
 * Сохранить или обновить FCM-токен пользователя
 */
export async function saveToken(
  userId: string,
  fcmToken: string,
  platform: 'web' | 'android' | 'ios' = 'web'
): Promise<void> {
  const db = admin.firestore()
  const now = admin.firestore.Timestamp.now()

  // Проверяем, существует ли токен
  const existing = await db
    .collection('fcm_tokens')
    .where('fcmToken', '==', fcmToken)
    .limit(1)
    .get()

  if (!existing.empty) {
    await existing.docs[0].ref.update({
      userId,
      lastUsedAt: now,
      isActive: true,
    })
    logger.info(`[TokenService] Updated existing token for user ${userId}`)
    return
  }

  // Создаём новый
  await db.collection('fcm_tokens').add({
    userId,
    fcmToken,
    platform,
    createdAt: now,
    lastUsedAt: now,
    isActive: true,
  })

  logger.info(`[TokenService] Saved new ${platform} token for user ${userId}`)
}

/**
 * Деактивировать токен (не удалять — для аналитики)
 */
export async function invalidateToken(fcmToken: string): Promise<void> {
  const db = admin.firestore()

  const query = await db
    .collection('fcm_tokens')
    .where('fcmToken', '==', fcmToken)
    .limit(1)
    .get()

  if (!query.empty) {
    await query.docs[0].ref.update({ isActive: false })
    logger.info(`[TokenService] Invalidated token`)
  }
}

/**
 * Получить все активные токены пользователя
 */
export async function getUserTokens(userId: string): Promise<string[]> {
  const db = admin.firestore()

  const snapshot = await db
    .collection('fcm_tokens')
    .where('userId', '==', userId)
    .where('isActive', '==', true)
    .get()

  return snapshot.docs.map((doc) => doc.data().fcmToken as string).filter(Boolean)
}

/**
 * Очистить токены старше 90 дней или давно не используемые
 * Вызывается по расписанию
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const db = admin.firestore()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)
  const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoff)

  const snapshot = await db
    .collection('fcm_tokens')
    .where('lastUsedAt', '<', cutoffTimestamp)
    .get()

  if (snapshot.empty) {
    logger.info('[TokenService] No expired tokens to clean up')
    return 0
  }

  const batch = db.batch()
  snapshot.docs.forEach((doc) => batch.delete(doc.ref))
  await batch.commit()

  logger.info(`[TokenService] Cleaned up ${snapshot.docs.length} expired tokens`)
  return snapshot.docs.length
}
