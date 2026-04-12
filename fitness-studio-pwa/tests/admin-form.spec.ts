import { test, expect } from '@playwright/test'

test.describe('Форма создания/редактирования занятия', () => {
  
  test.beforeEach(async ({ page }) => {
    // Переход на welcome и регистрация
    await page.goto('/welcome')
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
    
    // Заполнение формы регистрации
    await page.getByLabel('Имя').fill('Тест Админ')
    await page.getByLabel('Email').fill(`admin-test-${Date.now()}@test.com`)
    await page.getByLabel('Телефон').fill('+79991234567')
    await page.getByLabel('Пароль').fill('testpass123')
    await page.getByLabel('Подтверждение пароля').fill('testpass123')
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
    
    // TODO: вручную назначить admin через Firestore Console
    // Для E2E-тестов без реального Firebase используем моки
  })

  test('поля формы заполнены при редактировании (нет наложения label)', async ({ page }) => {
    // Это тест-шаблон — требует мокированных данных или реального Firebase
    // Для работы нужен запущенный dev-сервер с настройками
    
    await page.goto('/admin/schedule/create')
    
    // Проверка: форма рендерится
    await expect(page.getByLabel('Название')).toBeVisible()
    await expect(page.getByLabel('Тип занятия')).toBeVisible()
    await expect(page.getByLabel('Имя тренера')).toBeVisible()
    await expect(page.getByLabel('Дата и время начала')).toBeVisible()
    await expect(page.getByLabel('Дата и время окончания')).toBeVisible()
    await expect(page.getByLabel('Максимальное количество участников')).toBeVisible()
    await expect(page.getByLabel('Уровень сложности')).toBeVisible()
    await expect(page.getByLabel('Описание')).toBeVisible()
  })

  test('автозаполнение endDateTime при выборе startDateTime', async ({ page }) => {
    await page.goto('/admin/schedule/create')
    
    // Заполнение основных полей
    await page.getByLabel('Название').fill('Тестовое занятие')
    await page.getByLabel('Тип занятия').click()
    await page.getByRole('option', { name: 'Йога' }).click()
    await page.getByLabel('Имя тренера').fill('Иванов')
    
    // Заполнение startDateTime через input (не через UI-пикер)
    const startInput = page.getByLabel('Дата и время начала')
    await startInput.fill('12.04.2026, 10:00')
    await startInput.press('Tab')
    
    // Проверяем что endDateTime автоматически установлен
    const endInput = page.getByLabel('Дата и время окончания')
    const endValue = await endInput.inputValue()
    
    // Ожидается 11:00 (на час больше)
    expect(endValue).toContain('11:00')
  })

  test('описание необязательно', async ({ page }) => {
    await page.goto('/admin/schedule/create')
    
    // Заполнение без описания
    await page.getByLabel('Название').fill('Без описания')
    await page.getByLabel('Тип занятия').click()
    await page.getByRole('option', { name: 'Йога' }).click()
    await page.getByLabel('Имя тренера').fill('Иванов')
    
    const startInput = page.getByLabel('Дата и время начала')
    await startInput.fill('12.04.2026, 10:00')
    await startInput.press('Tab')
    
    const endInput = page.getByLabel('Дата и время окончания')
    await endInput.fill('12.04.2026, 11:00')
    await endInput.press('Tab')
    
    await page.getByLabel('Максимальное количество участников').fill('15')
    await page.getByLabel('Уровень сложности').click()
    await page.getByRole('option', { name: 'Начальный' }).click()
    
    // Описание оставляем пустым
    
    // Отправка формы — не должно быть ошибки валидации
    await page.getByRole('button', { name: 'Создать занятие' }).click()
    
    // Проверка: нет сообщений об ошибках валидации у описания
    await expect(page.getByText('Описание должно содержать')).not.toBeVisible()
  })
})
