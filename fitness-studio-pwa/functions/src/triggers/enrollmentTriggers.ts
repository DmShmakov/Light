/**
 * Триггеры для коллекции enrollments
 * - onCreate → подтверждение записи
 * - onUpdate → отмена записи (освобождение места)
 */

import * as admin from 'firebase-admin'
import * as logger from 'firebase-functions/logger'
import { FirestoreEvent, QueryDocumentSnapshot, Change } from 'firebase-functions/v2/firestore'
import { sendToUser, sendToAdmins, NotificationPayload } from '../services/notificationService'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

export const onEnrollmentCreate = async (
  event: FirestoreEvent<QueryDocumentSnapshot | undefined>
): Promise<void> => {
  const snapshot = event.data
  if (!snapshot) return

  const enrollment = snapshot.data()
  const userId = enrollment.userId as string
  const classId = enrollment.classId as string

  // Получаем данные занятия
  const classDoc = await admin.firestore().collection('classes').doc(classId).get()
  if (!classDoc.exists) return

  const classData = classDoc.data()!
  const className = classData.title as string
  const startDateTime = (classData.startDateTime as admin.firestore.Timestamp).toDate()

  // Уведомление пользователю
  const payload: NotificationPayload = {
    title: 'Запись подтверждена',
    body: `Вы записаны на «${className}» ${format(startDateTime, 'd MMMM в HH:mm', { locale: ru })}`,
    data: {
      type: 'enrollment_confirmed',
      classId,
      enrollmentId: snapshot.id,
    },
    icon: '/pwa-192x192.png',
    tag: `enrollment-${classId}`,
    actions: [
      { action: 'view', title: 'Посмотреть' },
    ],
  }

  try {
    await sendToUser(userId, 'enrollment_confirmed', payload)
    logger.info(`[Enrollments] Confirmation sent to ${userId} for class ${classId}`)

    // Уведомление администраторам
    const adminPayload: NotificationPayload = {
      title: 'Новая запись',
      body: `Пользователь записался на «${className}»`,
      data: {
        type: 'admin_notifications',
        classId,
        enrollmentId: snapshot.id,
      },
      icon: '/pwa-192x192.png',
      tag: `admin-enrollment-${classId}`,
    }
    await sendToAdmins('admin_notifications', adminPayload)
  } catch (error) {
    logger.error(`[Enrollments] Error sending notification: ${error}`, {
      enrollmentId: snapshot.id,
      userId,
      classId,
    })
  }
}

export const onEnrollmentUpdate = async (
  event: FirestoreEvent<Change<QueryDocumentSnapshot> | undefined>
): Promise<void> => {
  const change = event.data
  if (!change) return

  const before = change.before.data()
  const after = change.after.data()

  // Статус сменился на cancelled — освобождается место
  if (before.status !== 'cancelled' && after.status === 'cancelled') {
    const classId = after.classId as string

    const classDoc = await admin.firestore().collection('classes').doc(classId).get()
    if (!classDoc.exists) return

    const classData = classDoc.data()!
    const className = classData.title as string

    // TODO: уведомить пользователей из листа ожидания (Issue: лист ожидания — Фаза 3)
    logger.info(
      `[Enrollments] Enrollment cancelled for class "${className}" (${classId}) — no waitlist feature yet`
    )
  }
}
