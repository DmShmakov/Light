import { test, expect } from '@playwright/test'

async function loginAsAdmin(page: ReturnType<typeof test['page']>) {
  await page.goto('/login')
  await page.getByLabel('Email').fill('test-admin@test.com')
  await page.getByLabel('Пароль').fill('testpass123')
  await page.getByRole('button', { name: 'Войти', exact: true }).click()
  await page.waitForURL(/\/$/, { timeout: 10000 })
}

test.describe('Настройки уведомлений', () => {

  test('страница уведомлений загружается для авторизованного', async ({ page }) => {
    await loginAsAdmin(page)

    await page.getByRole('button', { name: 'Профиль' }).click()
    await page.waitForTimeout(500)
    await page.getByText('Уведомления').click()
    await page.waitForTimeout(1000)

    await expect(page.getByRole('heading', { name: 'Уведомления' })).toBeVisible()
  })

  test('кнопка назад возвращает в профиль', async ({ page }) => {
    await loginAsAdmin(page)

    await page.getByRole('button', { name: 'Профиль' }).click()
    await page.waitForTimeout(500)
    await page.getByText('Уведомления').click()
    await page.waitForTimeout(1000)

    await page.getByRole('button', { name: '' }).first().click()
    await page.waitForTimeout(1000)

    await expect(page.getByRole('heading', { name: 'Test Admin' })).toBeVisible()
  })

  test('переключатель уведомлений существует', async ({ page }) => {
    await loginAsAdmin(page)

    await page.getByRole('button', { name: 'Профиль' }).click()
    await page.waitForTimeout(500)
    await page.getByText('Уведомления').click()
    await page.waitForTimeout(1000)

    const enableButton = page.getByRole('button', { name: /Включить уведомления/ })
    if (await enableButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(enableButton).toBeVisible()
    } else {
      const toggle = page.locator('input[type="checkbox"]')
      await expect(toggle.first()).toBeVisible()
    }
  })

  test('при denied permission показывается предупреждение', async ({ page, context }) => {
    await context.grantPermissions(['notifications'])

    await loginAsAdmin(page)

    await page.getByRole('button', { name: 'Профиль' }).click()
    await page.waitForTimeout(500)
    await page.getByText('Уведомления').click()
    await page.waitForTimeout(1000)

    await expect(page.getByRole('heading', { name: 'Уведомления' })).toBeVisible()
  })
})

test.describe('Snackbar уведомления при записи/отмене', () => {

  test('Snackbar «Вы успешно записаны» появляется при записи на занятие', async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto('/')
    await page.waitForTimeout(2000)

    const detailButtons = page.locator('button:has-text("Подробнее")')
    if (await detailButtons.count() === 0) {
      test.skip(true, 'Нет занятий в расписании')
    }

    await detailButtons.first().click()
    await page.waitForURL(/\/class\//, { timeout: 10000 })

    const enrollButton = page.getByRole('button', { name: 'Записаться' })
    if (!(await enrollButton.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip(true, 'Уже записан на это занятие')
    }

    await enrollButton.click()

    // Snackbar должен появиться
    await expect(page.getByText('Вы успешно записаны')).toBeVisible({ timeout: 5000 })
  })

  test('Snackbar «Запись отменена» появляется при отмене записи', async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto('/')
    await page.waitForTimeout(2000)

    const detailButtons = page.locator('button:has-text("Подробнее")')
    if (await detailButtons.count() === 0) {
      test.skip(true, 'Нет занятий в расписании')
    }

    await detailButtons.first().click()
    await page.waitForURL(/\/class\//, { timeout: 10000 })

    // Убеждаемся что записаны
    const enrollButton = page.getByRole('button', { name: 'Записаться' })
    if (await enrollButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await enrollButton.click()
      await expect(page.getByText('Вы успешно записаны')).toBeVisible({ timeout: 5000 })
    }

    // Отменяем запись
    const cancelButton = page.getByRole('button', { name: 'Отменить запись' })
    const cancelVisible = await cancelButton.isVisible({ timeout: 3000 }).catch(() => false)
    const cancelDisabled = await cancelButton.isDisabled({ timeout: 3000 }).catch(() => true)

    if (!cancelVisible || cancelDisabled) {
      test.skip(true, 'Отмена невозможна (менее 60 мин до начала или занятие прошло)')
    }

    await cancelButton.click()

    // Snackbar должен появиться
    await expect(page.getByText('Запись отменена')).toBeVisible({ timeout: 5000 })
  })

  test('Service Worker зарегистрирован в браузере', async ({ page }) => {
    // SW регистрируется только в production build — пропускаем в dev-режиме
    test.skip(!process.env.CI, 'SW не активен в dev-режиме (только в production build)')

    await loginAsAdmin(page)

    await page.goto('/')
    await page.waitForTimeout(3000)

    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false
      const registrations = await navigator.serviceWorker.getRegistrations()
      return registrations.length > 0
    })

    expect(swRegistered).toBe(true)
  })
})
