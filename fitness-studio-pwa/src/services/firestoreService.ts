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
  deleteDoc,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { FitnessClass, Enrollment, AppSettings } from '../types'

// ==================== ЗАНЯТИЯ ====================

// Получение занятий на определённую неделю
export const getClassesByWeek = async (startDate: Date, endDate: Date): Promise<FitnessClass[]> => {
  const classesRef = collection(db, 'classes')
  const q = query(
    classesRef,
    where('startDateTime', '>=', Timestamp.fromDate(startDate)),
    where('startDateTime', '<=', Timestamp.fromDate(endDate)),
    orderBy('startDateTime', 'asc')
  )

  const snapshot = await getDocs(q)
  return snapshot.docs
    .map((doc) => {
      const data = doc.data()
      return {
        classId: doc.id,
        title: data.title,
        type: data.type,
        trainerId: data.trainerId,
        trainerName: data.trainerName,
        startDateTime: data.startDateTime.toDate(),
        endDateTime: data.endDateTime.toDate(),
        maxParticipants: data.maxParticipants,
        description: data.description,
        level: data.level,
        status: data.status,
        createdAt: data.createdAt?.toDate() || new Date(),
      } as FitnessClass
    })
    .filter((cls) => cls.status === 'scheduled')
}

// Получение одного занятия по ID
export const getClassById = async (classId: string): Promise<FitnessClass | null> => {
  const docRef = doc(db, 'classes', classId)
  const docSnap = await getDoc(docRef)

  if (!docSnap.exists()) return null

  const data = docSnap.data()
  return {
    classId: docSnap.id,
    ...data,
    startDateTime: data.startDateTime.toDate(),
    endDateTime: data.endDateTime.toDate(),
    createdAt: data.createdAt.toDate(),
  } as FitnessClass
}

// Создание занятия (только админ)
export const createClass = async (classData: Omit<FitnessClass, 'classId' | 'createdAt'>): Promise<string> => {
  const classesRef = collection(db, 'classes')
  const docRef = await addDoc(classesRef, {
    ...classData,
    startDateTime: Timestamp.fromDate(classData.startDateTime),
    endDateTime: Timestamp.fromDate(classData.endDateTime),
    createdAt: serverTimestamp(),
  })

  return docRef.id
}

// Обновление занятия (только админ)
export const updateClass = async (classId: string, data: Partial<FitnessClass>): Promise<void> => {
  const classRef = doc(db, 'classes', classId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = { ...data }

  if (data.startDateTime) {
    updateData.startDateTime = Timestamp.fromDate(data.startDateTime)
  }
  if (data.endDateTime) {
    updateData.endDateTime = Timestamp.fromDate(data.endDateTime)
  }

  await updateDoc(classRef, updateData)
}

// Удаление занятия (только админ)
export const deleteClass = async (classId: string): Promise<void> => {
  const classRef = doc(db, 'classes', classId)
  await deleteDoc(classRef)
}

// Получение количества записей для списка занятий
export const getEnrollmentCounts = async (classIds: string[]): Promise<Record<string, number>> => {
  if (classIds.length === 0) return {}

  const enrollmentsRef = collection(db, 'enrollments')
  const q = query(
    enrollmentsRef,
    where('classId', 'in', classIds),
    where('status', '==', 'confirmed')
  )

  const snapshot = await getDocs(q)
  const counts: Record<string, number> = {}

  // Инициализация нулями
  classIds.forEach((id) => (counts[id] = 0))

  // Подсчёт
  snapshot.docs.forEach((doc) => {
    const classId = doc.data().classId
    counts[classId] = (counts[classId] || 0) + 1
  })

  return counts
}

// ==================== ЗАПИСИ ====================

// Получение записей пользователя
export const getUserEnrollments = async (userId: string): Promise<Enrollment[]> => {
  const enrollmentsRef = collection(db, 'enrollments')
  const q = query(
    enrollmentsRef,
    where('userId', '==', userId),
    orderBy('enrolledAt', 'desc')
  )

  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    enrollmentId: doc.id,
    ...doc.data(),
    enrolledAt: doc.data().enrolledAt.toDate(),
  })) as Enrollment[]
}

// Получение записей для занятия
export const getEnrollmentsForClass = async (classId: string): Promise<Enrollment[]> => {
  const enrollmentsRef = collection(db, 'enrollments')
  const q = query(
    enrollmentsRef,
    where('classId', '==', classId),
    where('status', '==', 'confirmed')
  )

  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    enrollmentId: doc.id,
    ...doc.data(),
    enrolledAt: doc.data().enrolledAt.toDate(),
  })) as Enrollment[]
}

// Запись на занятие
export const enrollInClass = async (classId: string, userId: string): Promise<string> => {
  const enrollmentsRef = collection(db, 'enrollments')
  const docRef = await addDoc(enrollmentsRef, {
    classId,
    userId,
    enrolledAt: serverTimestamp(),
    status: 'confirmed',
    waitlistPosition: null,
  })

  return docRef.id
}

// Отмена записи
export const cancelEnrollment = async (enrollmentId: string): Promise<void> => {
  const enrollmentRef = doc(db, 'enrollments', enrollmentId)
  await updateDoc(enrollmentRef, {
    status: 'cancelled',
  })
}

// ==================== НАСТРОЙКИ ====================

// Получение настроек приложения
export const getAppSettings = async (): Promise<AppSettings> => {
  const settingsRef = doc(db, 'app_settings', 'default')
  const docSnap = await getDoc(settingsRef)

  if (!docSnap.exists()) {
    // Значения по умолчанию
    return {
      scheduleWeeksAvailable: 2,
      cancellationDeadlineMinutes: 60,
      maxMessagesPerDay: 5,
      messageSpamIntervalMinutes: 1,
    }
  }

  return docSnap.data() as AppSettings
}
