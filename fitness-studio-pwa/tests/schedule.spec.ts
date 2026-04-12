import { test, expect } from '@playwright/test'

test.describe('Расписание', () => {
  
  test('расписание — отображается после авторизации', async ({ page }) => {
    await page.goto('/register')
    
    const timestamp = Date.now()
    await page.getByLabel('Имя').fill('Расписание Тест')
    await page.getByLabel('Email').fill(`schedule-${timestamp}@test.com`)
    await page.getByLabel('Телефон').fill('+79990000003')
    await page.getByLabel('Пароль').fill('testpass123')
    await page.getByLabel('Подтверждение пароля').fill('testpass123')
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
    
    await page.waitForTimeout(3000)
    
    const currentUrl = page.url()
    if (currentUrl.includes('/register') || currentUrl.includes('/welcome')) {
      test.skip(true, 'Firebase не настроен')
    }
    
    // Проверяем что мы на расписании
    expect(currentUrl).toMatch(/\/$/)
    
    // Проверяем навигацию по неделям
    await expect(page.getByRole('button', { name: '' }).first()).toBeVisible() // ChevronLeft
    // Заголовок недели — h6 с датами
    await expect(page.getByRole('heading', { name: 'апреля' })).toBeVisible()
    await expect(page.getByRole('button', { name: '' }).last()).toBeVisible() // ChevronRight
  })

  test('расписание — вкладки дней недели', async ({ page }) => {
    await page.goto('/register')
    
    const timestamp = Date.now()
    await page.getByLabel('Имя').fill('Дни Тест')
    await page.getByLabel('Email').fill(`days-${timestamp}@test.com`)
    await page.getByLabel('Телефон').fill('+79990000004')
    await page.getByLabel('Пароль').fill('testpass123')
    await page.getByLabel('Подтверждение пароля').fill('testpass123')
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
    
    await page.waitForTimeout(3000)
    
    if (page.url().includes('/register') || page.url().includes('/welcome')) {
      test.skip(true, 'Firebase не настроен')
    }
    
    // Проверяем что есть карточки дней (7 штук — аккордеон)
    const dayHeaders = page.locator('.MuiCardHeader-root')
    await expect(dayHeaders).toHaveCount(7)

    // Проверяем что первый день (сегодня) раскрыт и содержит занятия или "Занятий нет"
    const content = await page.locator('.MuiCollapse-root').first().isVisible({ timeout: 3000 })
    expect(content).toBe(true)
  })

  test('расписание — карточка занятия содержит информацию', async ({ page }) => {
    // Этот тест требует полного цикла: регистрация + админка + создание + проверка
    // Пока скипаем — Firebase должен быть настроен
    test.skip(true, 'Требует настроенный Firebase — создай занятие вручную и запусти тест')
  })
})
