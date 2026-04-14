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

export type UserRole = 'client' | 'admin'

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
}

// Notification types
export type NotificationType =
  | 'enrollment_confirmed'
  | 'class_reminder'
  | 'class_changed'
  | 'class_cancelled'
  | 'waitlist_opening'
  | 'admin_notifications'

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  enrollment_confirmed: 'Подтверждение записи',
  class_reminder: 'Напоминание о занятии',
  class_changed: 'Изменение расписания',
  class_cancelled: 'Отмена занятия',
  waitlist_opening: 'Освобождение места',
  admin_notifications: 'Административные',
}

export const DEFAULT_NOTIFICATION_TYPES: NotificationTypePreferences = {
  enrollment_confirmed: true,
  class_reminder: true,
  class_changed: true,
  class_cancelled: true,
  waitlist_opening: true,
  admin_notifications: true,
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
