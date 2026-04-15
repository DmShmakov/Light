import { useState, useEffect, useCallback } from 'react'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useAuthStore } from '../store/authStore'
import {
  initializeFCM,
  revokeAllFCMTokens,
  onForegroundMessage,
  isNotificationsSupported,
  getCurrentPermission,
} from '../services/messagingService'
import {
  NotificationType,
  NotificationTypePreferences,
  DEFAULT_NOTIFICATION_TYPES,
  User,
  NotificationPayload,
} from '../types'

interface UseNotificationsReturn {
  isSupported: boolean
  permission: NotificationPermission | null
  isEnabled: boolean
  isLoading: boolean
  notificationTypes: NotificationTypePreferences
  initialize: () => Promise<boolean>
  toggle: () => Promise<void>
  updateType: (type: NotificationType, enabled: boolean) => Promise<void>
  foregroundMessage: NotificationPayload | null
}

/**
 * Перезагружает пользователя из Firestore и обновляет Zustand store
 */
async function refreshUserStore(user: User): Promise<User | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid))
    if (userDoc.exists()) {
      const data = userDoc.data() as User
      useAuthStore.getState().setUser(data)
      return data
    }
  } catch (error) {
    console.error('[useNotifications] Error refreshing user:', error)
  }
  return null
}

/**
 * Хук для управления уведомлениями
 */
export function useNotifications(user: User | null): UseNotificationsReturn {
  const [isSupported] = useState(isNotificationsSupported())
  const [permission, setPermission] = useState<NotificationPermission | null>(getCurrentPermission())
  const [isLoading, setIsLoading] = useState(false)
  const [notificationTypes, setNotificationTypes] = useState<NotificationTypePreferences>(
    user?.preferences?.notificationTypes || DEFAULT_NOTIFICATION_TYPES
  )
  const [foregroundMessage, setForegroundMessage] = useState<NotificationPayload | null>(null)

  const isEnabled = user?.preferences?.notificationsEnabled ?? false

  // Обновляем локальное состояние при изменении пользователя из store
  useEffect(() => {
    if (user?.preferences?.notificationTypes) {
      setNotificationTypes({
        ...DEFAULT_NOTIFICATION_TYPES,
        ...user.preferences.notificationTypes,
      })
    }
  }, [user?.preferences?.notificationTypes])

  // Подписка на foreground сообщения
  useEffect(() => {
    if (!isEnabled || !isSupported) return

    const unsubscribe = onForegroundMessage((payload) => {
      const data = payload.notification as NotificationPayload | undefined
      if (data) {
        setForegroundMessage(data)
        setTimeout(() => setForegroundMessage(null), 5000)
      }
    })

    return unsubscribe
  }, [isEnabled, isSupported])

  /**
   * Инициализация: запрос разрешения → получение токена → сохранение
   */
  const initialize = useCallback(async (): Promise<boolean> => {
    if (!user || !isSupported) return false

    setIsLoading(true)
    try {
      const success = await initializeFCM(user.uid)

      if (success) {
        setPermission('granted')

        // Обновляем preferences в Firestore
        await updateDoc(doc(db, 'users', user.uid), {
          'preferences.notificationsEnabled': true,
          'preferences.notificationTypes': notificationTypes,
        })

        // Обновляем Zustand store для реактивности UI
        await refreshUserStore(user)
      }

      return success
    } catch (error) {
      console.error('[useNotifications] Initialize error:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [user, isSupported, notificationTypes])

  /**
   * Toggle вкл/выкл все уведомления
   */
  const toggle = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const currentlyEnabled = user.preferences?.notificationsEnabled ?? false

      if (currentlyEnabled) {
        // Выключаем
        await updateDoc(doc(db, 'users', user.uid), {
          'preferences.notificationsEnabled': false,
        })
        await revokeAllFCMTokens(user.uid)
      } else {
        // Включаем
        const success = await initializeFCM(user.uid)
        if (success) {
          await updateDoc(doc(db, 'users', user.uid), {
            'preferences.notificationsEnabled': true,
            'preferences.notificationTypes': notificationTypes,
          })
        }
      }

      // Обновляем Zustand store
      await refreshUserStore(user)
    } catch (error) {
      console.error('[useNotifications] Toggle error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user, notificationTypes])

  /**
   * Обновить конкретный тип уведомлений
   */
  const updateType = useCallback(
    async (type: NotificationType, enabled: boolean) => {
      if (!user) return

      const updated = {
        ...notificationTypes,
        [type]: enabled,
      }

      setNotificationTypes(updated)

      try {
        await updateDoc(doc(db, 'users', user.uid), {
          'preferences.notificationTypes': updated,
        })
        // Обновляем Zustand store
        await refreshUserStore(user)
      } catch (error) {
        console.error('[useNotifications] Update type error:', error)
        setNotificationTypes(notificationTypes)
      }
    },
    [user, notificationTypes]
  )

  return {
    isSupported,
    permission,
    isEnabled,
    isLoading,
    notificationTypes,
    initialize,
    toggle,
    updateType,
    foregroundMessage,
  }
}
