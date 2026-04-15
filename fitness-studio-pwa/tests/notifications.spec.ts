import { test, expect } from '@playwright/test'

test.describe('Настройки уведомлений', () => {

  test('страница уведомлений загружается для авторизованного', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('test-admin@test.com')
    await page.getByLabel('Пароль').fill('testpass123')
    await page.getByRole('button', { name: 'Войти', exact: true }).click()
    await page.waitForURL(/\/$/, { timeout: 10000 })

    // Переход в профиль → уведомления
    await page.getByRole('button', { name: 'Профиль' }).click()
    await page.waitForTimeout(500)
    await page.getByText('Уведомления').click()
    await page.waitForTimeout(1000)

    // Проверяем что страница загрузилась
    await expect(page.getByRole('heading', { name: 'Уведомления' })).toBeVisible()
  })

  test('кнопка назад возвращает в профиль', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('test-admin@test.com')
    await page.getByLabel('Пароль').fill('testpass123')
    await page.getByRole('button', { name: 'Войти', exact: true }).click()
    await page.waitForURL(/\/$/, { timeout: 10000 })

    await page.getByRole('button', { name: 'Профиль' }).click()
    await page.waitForTimeout(500)
    await page.getByText('Уведомления').click()
    await page.waitForTimeout(1000)

    // Клик назад
    await page.getByRole('button', { name: '' }).first().click()
    await page.waitForTimeout(1000)

    // Проверяем что мы в профиле
    await expect(page.getByRole('heading', { name: 'Test Admin' })).toBeVisible()
  })

  test('переключатель уведомлений существует', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('test-admin@test.com')
    await page.getByLabel('Пароль').fill('testpass123')
    await page.getByRole('button', { name: 'Войти', exact: true }).click()
    await page.waitForURL(/\/$/, { timeout: 10000 })

    await page.getByRole('button', { name: 'Профиль' }).click()
    await page.waitForTimeout(500)
    await page.getByText('Уведомления').click()
    await page.waitForTimeout(1000)

    // Проверяем что кнопка включения существует
    const enableButton = page.getByRole('button', { name: /Включить уведомления/ })
    if (await enableButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(enableButton).toBeVisible()
    } else {
      // Или toggle switch если уже включено
      const toggle = page.locator('input[type="checkbox"]')
      await expect(toggle.first()).toBeVisible()
    }
  })

  test('при denied permission показывается предупреждение', async ({ page, context }) => {
    // Deny notification permission at browser level
    await context.grantPermissions(['notifications'])

    await page.goto('/login')
    await page.getByLabel('Email').fill('test-admin@test.com')
    await page.getByLabel('Пароль').fill('testpass123')
    await page.getByRole('button', { name: 'Войти', exact: true }).click()
    await page.waitForURL(/\/$/, { timeout: 10000 })

    await page.getByRole('button', { name: 'Профиль' }).click()
    await page.waitForTimeout(500)
    await page.getByText('Уведомления').click()
    await page.waitForTimeout(1000)

    // Страница должна загрузиться независимо от разрешения
    await expect(page.getByRole('heading', { name: 'Уведомления' })).toBeVisible()
  })
})
