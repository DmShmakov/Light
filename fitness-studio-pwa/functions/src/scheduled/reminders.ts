/**
 * Scheduled функция — напоминания о занятиях за 2 часа
 * Запускается каждые 15 минут
 */

import * as admin from 'firebase-admin'
import * as logger from 'firebase-functions/logger'
import { ScheduledEvent } from 'firebase-functions/v2/scheduler'
import { sendToClassEnrollments, NotificationPayload } from '../services/notificationService'
import { addHours, isAfter, isBefore } from 'date-fns'

/**
 * Найти занятия, которые начнутся через ~2 часа (окно ±15 мин)
 */
async function findUpcomingClasses(): Promise<admin.firestore.QueryDocumentSnapshot[]> {
  const now = new Date()
  const windowStart = addHours(now, 1.75) // 1ч 45мин
  const windowEnd = addHours(now, 2.25)   // 2ч 15мин

  const classesSnapshot = await admin
    .firestore()
    .collection('classes')
    .where('status', '==', 'scheduled')
    .where('reminderSent', '!=', true)
    .get()

  return classesSnapshot.docs.filter((doc) => {
    const startDateTime = (doc.data().startDateTime as admin.firestore.Timestamp).toDate()
    return isAfter(startDateTime, windowStart) && isBefore(startDateTime, windowEnd)
  })
}

export const sendReminders = async (_event: ScheduledEvent): Promise<void> => {
  const classes = await findUpcomingClasses()

  if (classes.length === 0) {
    logger.info('[Reminders] No upcoming classes in window')
    return
  }

  let totalSent = 0

  for (const classDoc of classes) {
    const classId = classDoc.id
    const data = classDoc.data()
    const className = data.title as string
    const startDateTime = (data.startDateTime as admin.firestore.Timestamp).toDate()
    const hours = startDateTime.getHours().toString().padStart(2, '0')
    const minutes = startDateTime.getMinutes().toString().padStart(2, '0')

    const payload: NotificationPayload = {
      title: 'Напоминание: через 2 часа',
      body: `«${className}» начнётся в ${hours}:${minutes}. Не опаздывайте!`,
      data: {
        type: 'class_reminder',
        classId,
      },
      icon: '/pwa-192x192.png',
      tag: `reminder-${classId}`,
      requireInteraction: false,
    }

    try {
      const sentCount = await sendToClassEnrollments(classId, 'class_reminder', payload)
      totalSent += sentCount

      // Помечаем что напоминание отправлено (дедупликация)
      await classDoc.ref.update({ reminderSent: true })

      logger.info(`[Reminders] Sent reminders for "${className}" to ${sentCount} users`)
    } catch (error) {
      logger.error(`[Reminders] Error for class ${classId}: ${error}`)
    }
  }

  logger.info(`[Reminders] Total notifications sent: ${totalSent}`)
}
