/**
 * Fitness Studio — Firebase Cloud Functions
 *
 * Уведомления:
 * - Подтверждение записи (enrollmentTriggers)
 * - Напоминание о занятии (reminders, каждые 15 мин)
 * - Изменение/отмена занятия (classTriggers)
 */

import { initializeApp } from 'firebase-admin/app'
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { onSchedule } from 'firebase-functions/v2/scheduler'

import { onEnrollmentCreate, onEnrollmentUpdate } from './triggers/enrollmentTriggers'
import { onClassUpdate } from './triggers/classTriggers'
import { sendReminders } from './scheduled/reminders'

// Инициализация Firebase Admin SDK
initializeApp()

// ==========================================
// Триггеры базы данных
// ==========================================

/** Подтверждение записи + уведомление администраторов */
export const onEnrollmentCreated = onDocumentCreated(
  'enrollments/{enrollmentId}',
  onEnrollmentCreate
)

/** Отмена записи */
export const onEnrollmentChanged = onDocumentUpdated(
  'enrollments/{enrollmentId}',
  onEnrollmentUpdate
)

/** Изменение/отмена занятия */
export const onClassChanged = onDocumentUpdated(
  'classes/{classId}',
  onClassUpdate
)

// ==========================================
// Scheduled функции
// ==========================================

/** Напоминания: запускается каждые 15 минут, находит занятия через ~2 часа */
export const scheduledReminders = onSchedule(
  {
    schedule: 'every 15 minutes',
    timeZone: 'Europe/Moscow',
  },
  sendReminders
)
