import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  Timestamp,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore'
import { db } from './firebase'
import { SubscriptionPlan, UserSubscription, SubscriptionStatus } from '../types'

// ==================== ВСПОМОГАТЕЛЬНЫЕ ====================

function docToPlan(d: QueryDocumentSnapshot<DocumentData>): SubscriptionPlan {
  const data = d.data()
  return {
    planId: d.id,
    name: data.name,
    description: data.description || '',
    visitsCount: data.visitsCount ?? null,
    durationDays: data.durationDays ?? null,
    isActive: data.isActive ?? true,
    createdAt: data.createdAt?.toDate() || new Date(),
  }
}

function docToSubscription(d: QueryDocumentSnapshot<DocumentData>): UserSubscription {
  const data = d.data()
  return {
    subscriptionId: d.id,
    userId: data.userId,
    userName: data.userName || '',
    userEmail: data.userEmail || '',
    planId: data.planId,
    planName: data.planName,
    visitsTotal: data.visitsTotal ?? null,
    visitsUsed: data.visitsUsed || 0,
    durationDays: data.durationDays ?? null,
    startDate: data.startDate?.toDate() || null,
    expiresAt: data.expiresAt?.toDate() || null,
    status: data.status as SubscriptionStatus,
    enrolledClassIds: data.enrolledClassIds || [],
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  }
}

// ==================== ТИПЫ АБОНЕМЕНТОВ ====================

export const getActiveSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  const q = query(
    collection(db, 'subscriptionPlans'),
    where('isActive', '==', true),
    orderBy('createdAt', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(docToPlan)
}

export const getAllSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  const q = query(collection(db, 'subscriptionPlans'), orderBy('createdAt', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map(docToPlan)
}

export const createSubscriptionPlan = async (
  data: Omit<SubscriptionPlan, 'planId' | 'createdAt'>
): Promise<string> => {
  const ref = await addDoc(collection(db, 'subscriptionPlans'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export const updateSubscriptionPlan = async (
  planId: string,
  data: Partial<Omit<SubscriptionPlan, 'planId' | 'createdAt'>>
): Promise<void> => {
  await updateDoc(doc(db, 'subscriptionPlans', planId), data)
}

// ==================== АБОНЕМЕНТЫ ПОЛЬЗОВАТЕЛЕЙ ====================

/**
 * Текущий абонемент пользователя.
 * Запрашивает все абонементы пользователя и выбирает наиболее приоритетный:
 * active → unpaid → exhausted (нужен для возврата визита при отмене записи).
 * Запрос только по userId избегает необходимости составного индекса Firestore.
 */
export const getCurrentUserSubscription = async (
  userId: string
): Promise<UserSubscription | null> => {
  const q = query(
    collection(db, 'userSubscriptions'),
    where('userId', '==', userId)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const all = snap.docs.map(docToSubscription)
  return (
    all.find((s) => s.status === 'active') ??
    all.find((s) => s.status === 'unpaid') ??
    all.find((s) => s.status === 'exhausted') ??
    null
  )
}

/** Создать абонемент (пользователь или администратор) */
export const createUserSubscription = async (
  userId: string,
  userName: string,
  userEmail: string,
  plan: SubscriptionPlan,
  startDate: Date
): Promise<string> => {
  const existing = await getCurrentUserSubscription(userId)
  if (existing && (existing.status === 'active' || existing.status === 'unpaid')) {
    throw new Error('У пользователя уже есть активный абонемент')
  }

  const expiresAt =
    plan.durationDays
      ? new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000)
      : null

  const ref = await addDoc(collection(db, 'userSubscriptions'), {
    userId,
    userName,
    userEmail,
    planId: plan.planId,
    planName: plan.name,
    visitsTotal: plan.visitsCount,
    visitsUsed: 0,
    durationDays: plan.durationDays,
    startDate: Timestamp.fromDate(startDate),
    expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
    status: 'unpaid' as SubscriptionStatus,
    enrolledClassIds: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

/** Отметить абонемент как оплаченный (только админ) */
export const setSubscriptionPaid = async (subscriptionId: string): Promise<void> => {
  await updateDoc(doc(db, 'userSubscriptions', subscriptionId), {
    status: 'active',
    updatedAt: serverTimestamp(),
  })
}

/** Сменить тип абонемента (только админ, visitsUsed не сбрасывается) */
export const changeSubscriptionPlan = async (
  subscriptionId: string,
  plan: SubscriptionPlan
): Promise<void> => {
  await updateDoc(doc(db, 'userSubscriptions', subscriptionId), {
    planId: plan.planId,
    planName: plan.name,
    visitsTotal: plan.visitsCount,
    durationDays: plan.durationDays,
    updatedAt: serverTimestamp(),
  })
}

/** Продлить срок абонемента на N дней (только админ) */
export const extendSubscription = async (
  subscriptionId: string,
  days: number
): Promise<void> => {
  const snap = await getDoc(doc(db, 'userSubscriptions', subscriptionId))
  if (!snap.exists()) return

  const data = snap.data()
  const base = data.expiresAt?.toDate() || new Date()
  const newExpiry = new Date(base.getTime() + days * 24 * 60 * 60 * 1000)

  await updateDoc(doc(db, 'userSubscriptions', subscriptionId), {
    expiresAt: Timestamp.fromDate(newExpiry),
    updatedAt: serverTimestamp(),
  })
}

/** Все абонементы — для администратора */
export const getAllSubscriptions = async (): Promise<UserSubscription[]> => {
  const q = query(
    collection(db, 'userSubscriptions'),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(docToSubscription)
}

/** Привязать занятие к абонементу и списать визит */
export const incrementSubscriptionVisit = async (
  subscriptionId: string,
  classId: string
): Promise<void> => {
  const ref = doc(db, 'userSubscriptions', subscriptionId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return

  const data = snap.data()
  const newVisitsUsed = (data.visitsUsed || 0) + 1
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {
    visitsUsed: increment(1),
    enrolledClassIds: arrayUnion(classId),
    updatedAt: serverTimestamp(),
  }

  if (data.visitsTotal !== null && data.visitsTotal !== undefined && newVisitsUsed >= data.visitsTotal) {
    updates.status = 'exhausted'
  }

  await updateDoc(ref, updates)
}

/** Вернуть визит при отмене записи */
export const decrementSubscriptionVisit = async (
  subscriptionId: string,
  classId: string
): Promise<void> => {
  const ref = doc(db, 'userSubscriptions', subscriptionId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return

  const data = snap.data()
  const newVisitsUsed = Math.max(0, (data.visitsUsed || 0) - 1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {
    visitsUsed: increment(-1),
    enrolledClassIds: arrayRemove(classId),
    updatedAt: serverTimestamp(),
  }

  // Если абонемент был исчерпан — вернуть в active
  if (
    data.status === 'exhausted' &&
    data.visitsTotal !== null &&
    newVisitsUsed < data.visitsTotal
  ) {
    const now = new Date()
    if (!data.expiresAt || data.expiresAt.toDate() > now) {
      updates.status = 'active'
    }
  }

  await updateDoc(ref, updates)
}

// ==================== ЛОГИКА ПРОВЕРКИ ====================

export interface SubscriptionCheckResult {
  valid: boolean
  reason: string
}

export function checkSubscriptionForClass(
  subscription: UserSubscription | null,
  classDate: Date
): SubscriptionCheckResult {
  if (!subscription)
    return { valid: false, reason: 'Нет абонемента' }
  if (subscription.status === 'unpaid')
    return { valid: false, reason: 'Абонемент не оплачен' }
  if (subscription.status === 'exhausted')
    return { valid: false, reason: 'Визиты исчерпаны' }
  if (subscription.status === 'expired')
    return { valid: false, reason: 'Срок абонемента истёк' }

  // Runtime-проверка истечения (на случай если Cloud Function не обновил статус)
  if (subscription.expiresAt && new Date() > subscription.expiresAt)
    return { valid: false, reason: 'Срок абонемента истёк' }

  if (subscription.startDate && classDate < subscription.startDate)
    return { valid: false, reason: 'Занятие до начала абонемента' }
  if (subscription.expiresAt && classDate > subscription.expiresAt)
    return { valid: false, reason: 'Занятие вне срока абонемента' }
  if (subscription.visitsTotal !== null && subscription.visitsUsed >= subscription.visitsTotal)
    return { valid: false, reason: 'Визиты исчерпаны' }

  return { valid: true, reason: '' }
}
