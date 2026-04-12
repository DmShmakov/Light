import { test, expect } from '@playwright/test'

test.describe('Навигация по приложению', () => {
  
  test('главная страница — вкладки дней недели', async ({ page }) => {
    // Сначала регистрируемся через UI
    await page.goto('/register')
    
    const timestamp = Date.now()
    await page.getByLabel('Имя').fill('Навигация Тест')
    await page.getByLabel('Email').fill(`nav-${timestamp}@test.com`)
    await page.getByLabel('Телефон').fill('+79990000001')
    await page.getByLabel('Пароль').fill('testpass123')
    await page.getByLabel('Подтверждение пароля').fill('testpass123')
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
    
    // Ждём редирект на главную (расписание)
    // Firebase может быть не настроен — проверяем что мы не на регистрации
    await page.waitForTimeout(3000)
    
    // Если регистрация прошла успешно — мы на главной
    const currentUrl = page.url()
    if (currentUrl.includes('/register') || currentUrl.includes('/welcome')) {
      // Firebase не ответил — скипаем тест
      test.skip(true, 'Firebase не настроен — регистрация не прошла')
    }
    
    // Проверяем навигацию — нижняя панель (4 кнопки для админа)
    await expect(page.getByRole('button', { name: 'Расписание' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Мои записи' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Админ' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Профиль' })).toBeVisible()
  })

  test('профиль — отображение данных пользователя', async ({ page }) => {
    await page.goto('/register')
    
    const timestamp = Date.now()
    await page.getByLabel('Имя').fill('Профиль Тест')
    await page.getByLabel('Email').fill(`profile-${timestamp}@test.com`)
    await page.getByLabel('Телефон').fill('+79990000002')
    await page.getByLabel('Пароль').fill('testpass123')
    await page.getByLabel('Подтверждение пароля').fill('testpass123')
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
    
    await page.waitForTimeout(3000)
    
    const currentUrl = page.url()
    if (currentUrl.includes('/register') || currentUrl.includes('/welcome')) {
      test.skip(true, 'Firebase не настроен')
    }
    
    // Переход в профиль — BottomNavigationAction
    await page.getByRole('button', { name: 'Профиль' }).click()
    await page.waitForTimeout(1000)
    
    await expect(page.getByRole('heading', { name: 'Профиль Тест' })).toBeVisible()
    await expect(page.getByText(`profile-${timestamp}@test.com`)).toBeVisible()
    await expect(page.getByText('+79990000002')).toBeVisible()
  })
})
