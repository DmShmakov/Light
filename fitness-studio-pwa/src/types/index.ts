// User types
export interface User {
  uid: string
  name: string
  email: string | null
  phone: string
  photoUrl: string | null
  roles: UserRole[]
  createdAt: Date
  preferences?: UserPreferences
}

export type UserRole = 'client' | 'admin' | 'trainer'

export interface UserPreferences {
  favoriteTypes?: string[]
  notificationsEnabled?: boolean
  notificationTypes?: NotificationTypePreferences
}

export interface NotificationTypePreferences {
  enrollment_confirmed?: boolean
  class_reminder?: boolean
  class_changed?: boolean
  class_cancelled?: boolean
  waitlist_opening?: boolean
  admin_notifications?: boolean
  trainer_assigned?: boolean
  participant_enrolled?: boolean
  participant_cancelled?: boolean
}

// Notification types
export type NotificationType =
  | 'enrollment_confirmed'
  | 'class_reminder'
  | 'class_changed'
  | 'class_cancelled'
  | 'waitlist_opening'
  | 'admin_notifications'
  // Тренерские уведомления
  | 'trainer_assigned'
  | 'participant_enrolled'
  | 'participant_cancelled'

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  enrollment_confirmed: 'Подтверждение записи',
  class_reminder: 'Напоминание о занятии',
  class_changed: 'Изменение расписания',
  class_cancelled: 'Отмена занятия',
  waitlist_opening: 'Освобождение места',
  admin_notifications: 'Административные',
  trainer_assigned: 'Назначение на занятие',
  participant_enrolled: 'Запись участника на ваше занятие',
  participant_cancelled: 'Отмена участником записи',
}

// Уведомления, доступные только тренерам
export const TRAINER_NOTIFICATION_TYPES: NotificationType[] = [
  'trainer_assigned',
  'participant_enrolled',
  'participant_cancelled',
]

export const DEFAULT_NOTIFICATION_TYPES: NotificationTypePreferences = {
  enrollment_confirmed: true,
  class_reminder: true,
  class_changed: true,
  class_cancelled: true,
  waitlist_opening: true,
  admin_notifications: true,
  trainer_assigned: true,
  participant_enrolled: true,
  participant_cancelled: true,
}

// FCM Token
export interface FCMDocument {
  tokenId?: string
  userId: string
  fcmToken: string
  platform: 'web' | 'android' | 'ios'
  createdAt: Date
  lastUsedAt: Date
  isActive: boolean
}

// Notification payload (from push)
export interface NotificationPayload {
  title: string
  body: string
  data?: {
    type: NotificationType
    classId?: string
    enrollmentId?: string
    [key: string]: unknown
  }
  icon?: string
  tag?: string
  badge?: string
  actions?: Array<{ action: string; title: string }>
  requireInteraction?: boolean
  silent?: boolean
}

// Class types
export interface FitnessClass {
  classId: string
  title: string
  type: string
  trainerId: string
  trainerName: string
  startDateTime: Date
  endDateTime: Date
  maxParticipants: number
  description: string
  level: 'beginner' | 'intermediate' | 'advanced'
  status: 'scheduled' | 'cancelled' | 'completed'
  createdAt: Date
}

// Enrollment types
export interface Enrollment {
  enrollmentId: string
  classId: string
  userId: string
  classDate: Date
  enrolledAt: Date
  status: 'confirmed' | 'cancelled'
  waitlistPosition?: number | null
}

// Admin message types
export interface AdminMessage {
  messageId: string
  senderId: string | null
  senderName: string
  senderContact: string
  subject: string
  message: string
  createdAt: Date
  status: 'sent' | 'read' | 'replied'
  adminResponse?: string | null
  adminResponseAt?: Date | null
}

// App settings
export interface AppSettings {
  scheduleWeeksAvailable: number
  cancellationDeadlineMinutes: number
  maxMessagesPerDay: number
  messageSpamIntervalMinutes: number
  reminderHoursBefore?: number
  notificationsEnabled?: boolean
}

// Class with enrollment status
export interface ClassWithEnrollment extends FitnessClass {
  isEnrolled: boolean
  enrollmentStatus?: 'confirmed' | 'cancelled'
  availableSpots: number
  totalEnrolled: number
}

// ==================== АБОНЕМЕНТЫ ====================

export interface SubscriptionPlan {
  planId: string
  name: string
  description: string
  visitsCount: number | null   // null = безлимит по визитам
  durationDays: number | null  // null = без ограничения срока
  isActive: boolean
  createdAt: Date
}

export type SubscriptionStatus = 'unpaid' | 'active' | 'expired' | 'exhausted'

export interface UserSubscription {
  subscriptionId: string
  userId: string
  userName: string             // денормализовано
  userEmail: string            // денормализовано
  planId: string
  planName: string             // денормализовано на момент создания
  visitsTotal: number | null   // скопировано из плана
  visitsUsed: number
  durationDays: number | null
  startDate: Date | null       // выбирает пользователь
  expiresAt: Date | null       // startDate + durationDays
  status: SubscriptionStatus
  enrolledClassIds: string[]   // classId занятий, привязанных к абонементу
  createdAt: Date
  updatedAt: Date
}

// Form types
export interface LoginForm {
  email: string
  password: string
}

export interface RegisterForm {
  name: string
  email: string
  phone: string
  password: string
  confirmPassword: string
}

export interface PasswordRecoveryForm {
  email: string
}

// Admin message form
export interface AdminMessageForm {
  subject: string
  message: string
  senderContact?: string // Для гостей
}
