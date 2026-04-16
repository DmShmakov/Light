/**
 * Триггеры для коллекции classes
 * - onUpdate → изменение/отмена занятия
 */

import * as admin from 'firebase-admin'
import * as logger from 'firebase-functions/logger'
import { FirestoreEvent, Change, QueryDocumentSnapshot } from 'firebase-functions/v2/firestore'
import { sendToClassEnrollments, NotificationPayload } from '../services/notificationService'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

export const onClassUpdate = async (
  event: FirestoreEvent<Change<QueryDocumentSnapshot> | undefined>
): Promise<void> => {
  const change = event.data
  if (!change) return

  const before = change.before.data()
  const after = change.after.data()
  const classId = change.after.id

  const beforeStart = before.startDateTime as admin.firestore.Timestamp
  const afterStart = after.startDateTime as admin.firestore.Timestamp

  // Не отправляем если ничего значимого не изменилось
  const statusChanged = before.status !== after.status
  const timeChanged = !beforeStart.isEqual(afterStart)
  if (!statusChanged && !timeChanged) return

  const className = after.title as string
  const startDateTime = afterStart.toDate()
  const dateStr = format(startDateTime, 'd MMMM в HH:mm', { locale: ru })

  let payload: NotificationPayload | null = null
  let type = ''

  // Отмена занятия
  if (before.status !== 'cancelled' && after.status === 'cancelled') {
    type = 'class_cancelled'
    payload = {
      title: 'Занятие отменено',
      body: `«${className}» ${dateStr} отменено`,
      data: { type: 'class_cancelled', classId },
      icon: '/pwa-192x192.png',
      tag: `class-update-${classId}`,
      requireInteraction: true,
      actions: [{ action: 'view', title: 'Подробнее' }],
    }
  }
  // Восстановление занятия
  else if (before.status === 'cancelled' && after.status === 'scheduled') {
    type = 'class_changed'
    payload = {
      title: 'Занятие восстановлено',
      body: `«${className}» ${dateStr} снова в расписании!`,
      data: { type: 'class_changed', classId },
      icon: '/pwa-192x192.png',
      tag: `class-update-${classId}`,
      actions: [{ action: 'view', title: 'Записаться' }],
    }
  }
  // Перенос времени
  else if (timeChanged) {
    type = 'class_changed'
    payload = {
      title: 'Изменение в расписании',
      body: `«${className}» перенесено на ${dateStr}`,
      data: { type: 'class_changed', classId },
      icon: '/pwa-192x192.png',
      tag: `class-update-${classId}`,
      requireInteraction: true,
      actions: [{ action: 'view', title: 'Посмотреть' }],
    }
  }

  if (payload && type) {
    try {
      const sentCount = await sendToClassEnrollments(classId, type, payload)
      logger.info(
        `[Classes] Sent "${type}" notification to ${sentCount} users for class ${classId}`
      )
    } catch (error) {
      logger.error(`[Classes] Error sending notification: ${error}`, { classId, type })
    }
  }
}
