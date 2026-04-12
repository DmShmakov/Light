import { Page } from '@playwright/test'

/**
 * Утилита для мокирования авторизации в E2E-тестах.
 * 
 * Записывает фейковые данные пользователя в localStorage,
 * которые приложение читает при инициализации.
 * 
 * ВАЖНО: Это НЕ заменяет реальные Firestore данные,
 * только Zustand store состояние на клиенте.
 */

const TEST_USER = {
  uid: 'test-user-uid-12345',
  name: 'Тест Администратор',
  email: 'admin@test.com',
  phone: '+79991234567',
  photoUrl: null,
  roles: ['client', 'admin'],
  createdAt: new Date().toISOString(),
  preferences: {
    notificationsEnabled: true,
  },
}

export async function mockAuth(page: Page) {
  // Устанавливаем localStorage ПЕРЕД навигацией
  await page.addInitScript((user) => {
    // Мокаем Firebase auth state
    window.addEventListener('DOMContentLoaded', () => {
      // Мокаем Zustand store для авторизации
      const storageKey = 'fitness-studio-auth'
      localStorage.setItem(storageKey, JSON.stringify({
        user,
        isAdmin: user.roles.includes('admin'),
        loading: false,
      }))
    })
  }, TEST_USER)
  
  return TEST_USER
}

export const testUserData = TEST_USER
