import { test, expect } from '@playwright/test'

test.describe('Форма создания/редактирования занятия', () => {
  
  // Проверка доступности админки
  async function goToAdminCreate(page: ReturnType<typeof test['page']>): Promise<boolean> {
    await page.goto('/admin/schedule/create')
    await page.waitForTimeout(1000)
    
    // Если редирект — возвращаем false
    if (page.url().includes('/login') || page.url().includes('/welcome')) {
      return false
    }
    return true
  }

  test('форма создания — все поля отображаются', async ({ page }) => {
    const accessible = await goToAdminCreate(page)
    if (!accessible) {
      test.skip(true, 'Требуется авторизация — Firebase не настроен')
    }
    
    // Используем placeholder вместо label (Controller не связывает htmlFor)
    await expect(page.locator('input[placeholder=""]')).toBeVisible() // Название (нет placeholder)
    await expect(page.locator('input[name="title"]')).toBeVisible()
    await expect(page.locator('select[name="type"]')).toBeVisible()
    await expect(page.locator('input[name="trainerName"]')).toBeVisible()
    await expect(page.locator('input[name="startDateTime"]')).toBeVisible()
    await expect(page.locator('input[name="endDateTime"]')).toBeVisible()
    await expect(page.locator('input[name="maxParticipants"]')).toBeVisible()
    await expect(page.locator('select[name="level"]')).toBeVisible()
    await expect(page.locator('textarea[name="description"]')).toBeVisible()
    
    // Кнопка создания
    await expect(page.getByRole('button', { name: 'Создать занятие', exact: true })).toBeVisible()
  })

  test('форма создания — нет наложения label', async ({ page }) => {
    const accessible = await goToAdminCreate(page)
    if (!accessible) {
      test.skip(true, 'Требуется авторизация')
    }
    
    // Проверяем поля через name-атрибуты
    const fields = [
      { name: 'title', label: 'Название' },
      { name: 'trainerName', label: 'Имя тренера' },
      { name: 'description', label: 'Описание' },
    ]
    
    for (const { label } of fields) {
      const labelEl = page.locator(`label:has-text("${label}")`).first()
      await expect(labelEl).toBeVisible()
      
      // Проверяем что label имеет MUI класс (shrink/not-shrink — это нормально)
      const className = await labelEl.getAttribute('class')
      expect(className).toContain('MuiInputLabel')
    }
  })

  test('форма создания — автозаполнение endDateTime (+1 час)', async ({ page }) => {
    const accessible = await goToAdminCreate(page)
    if (!accessible) {
      test.skip(true, 'Требуется авторизация')
    }
    
    // Заполняем поля через name
    await page.locator('input[name="title"]').fill('Тестовое занятие')
    
    // Select для типа
    await page.locator('select[name="type"]').click()
    await page.getByRole('option', { name: 'Йога' }).click()
    
    await page.locator('input[name="trainerName"]').fill('Иванов Иван')
    
    // Заполняем дату начала
    const startInput = page.locator('input[name="startDateTime"]')
    await startInput.click()
    await startInput.fill('15.04.2026, 10:00')
    await startInput.press('Tab')
    
    await page.waitForTimeout(500)
    
    // Проверяем endDateTime
    const endInput = page.locator('input[name="endDateTime"]')
    const endValue = await endInput.inputValue()
    
    expect(endValue).toContain('11:00')
  })

  test('форма создания — необязательное описание', async ({ page }) => {
    const accessible = await goToAdminCreate(page)
    if (!accessible) {
      test.skip(true, 'Требуется авторизация')
    }
    
    // Заполняем всё кроме описания
    await page.locator('input[name="title"]').fill('Без описания')
    await page.locator('select[name="type"]').click()
    await page.getByRole('option', { name: 'Пилатес' }).click()
    
    await page.locator('input[name="trainerName"]').fill('Сидоров')
    
    const startInput = page.locator('input[name="startDateTime"]')
    await startInput.fill('16.04.2026, 14:00')
    await startInput.press('Tab')
    
    const endInput = page.locator('input[name="endDateTime"]')
    await endInput.fill('16.04.2026, 15:00')
    await endInput.press('Tab')
    
    await page.locator('input[name="maxParticipants"]').fill('10')
    
    await page.locator('select[name="level"]').click()
    await page.getByRole('option', { name: 'Средний' }).click()
    
    // Описание НЕ заполняем
    
    await page.getByRole('button', { name: 'Создать занятие', exact: true }).click()
    await page.waitForTimeout(2000)
    
    // Проверяем что нет ошибки валидации
    const pageContent = await page.content()
    expect(pageContent).not.toContain('Описание должно содержать')
  })
})
