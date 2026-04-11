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
