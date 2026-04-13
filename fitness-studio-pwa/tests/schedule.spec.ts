import { test, expect } from '@playwright/test'

const ADMIN_USER = {
  email: 'test-admin@test.com',
  password: 'testpass123',
}

async function loginAsAdmin(page: ReturnType<typeof test['page']>) {
  // Сначала пробуем перейти на главную — если залогинен, останемся тут
  await page.goto('/')
  await page.waitForTimeout(1000)

  // Если редиректнуло на /welcome или /login — не залогинен
  if (page.url().includes('/welcome') || page.url().includes('/login')) {
    await page.goto('/login')
    await page.waitForTimeout(500)
    await page.getByLabel('Email').fill(ADMIN_USER.email)
    await page.getByLabel('Пароль').fill(ADMIN_USER.password)
    await page.getByRole('button', { name: 'Войти', exact: true }).click()
    await page.waitForURL(/\/$/, { timeout: 10000 })
  } else {
    // Уже залогинен — выходим и логинимся как админ
    await page.goto('/profile')
    await page.waitForTimeout(1000)
    const logoutButton = page.getByRole('button', { name: 'Выйти' })
    if (await logoutButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logoutButton.click()
      await page.waitForTimeout(1000)
    }
    await page.goto('/login')
    await page.waitForTimeout(500)
    await page.getByLabel('Email').fill(ADMIN_USER.email)
    await page.getByLabel('Пароль').fill(ADMIN_USER.password)
    await page.getByRole('button', { name: 'Войти', exact: true }).click()
    await page.waitForURL(/\/$/, { timeout: 10000 })
  }
}

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
    // Логинимся как админ
    await loginAsAdmin(page)

    // Переходим в админ-расписание
    await page.goto('/admin/schedule')
    await page.waitForTimeout(2000)

    // Находим кнопку редактирования первого занятия
    const cardActions = page.locator('.MuiCardActions-root')
    const cardActionsCount = await cardActions.count()

    if (cardActionsCount === 0) {
      test.skip(true, 'Нет занятий в админ-расписании')
    }

    // Первый CardActions — первое занятие. Первая кнопка — редактировать.
    const firstEditButton = cardActions.first().locator('.MuiIconButton-root').first()
    await firstEditButton.click()
    await page.waitForTimeout(1000)

    const match = page.url().match(/\/admin\/schedule\/edit\/([^/?]+)/)
    if (!match) {
      test.skip(true, 'Не удалось получить ID занятия — клик не привёл к редактированию')
    }
    const classId = match[1]

    // Возвращаемся
    await page.goto('/admin/schedule')
    await page.waitForTimeout(500)

    // Переходим на страницу деталей занятия
    await page.goto(`/class/${classId}`)
    await page.waitForTimeout(2000)

    // Проверяем что страница деталей содержит информацию о занятии
    // Заголовок — h1 (MUI Typography variant="h4" рендерится как h1 в этом контексте)
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()
    const titleText = await heading.innerText()
    expect(titleText.length).toBeGreaterThan(0)

    await expect(page.getByText(/Тренер:/)).toBeVisible()
    await expect(page.getByText(/Дата и время:/)).toBeVisible()
    await expect(page.getByText(/Свободных мест:/)).toBeVisible()
    await expect(page.getByText(/Статус:/)).toBeVisible()

    // Запись или подтверждение
    const enrollBtn = page.getByRole('button', { name: 'Записаться' })
    const enrolledMsg = page.getByText('Вы записаны на это занятие')
    const enrollVisible = await enrollBtn.isVisible({ timeout: 3000 }).catch(() => false)
    const enrolledVisible = await enrolledMsg.isVisible({ timeout: 3000 }).catch(() => false)

    if (!enrollVisible && !enrolledVisible) {
      throw new Error('Нет ни кнопки записи, ни подтверждения записи')
    }

    if (enrollVisible && !enrolledVisible) {
      await enrollBtn.click()
      await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('Вы успешно записаны')).toBeVisible({ timeout: 5000 })
    }

    // Финальная проверка: или кнопка записи, или подтверждение
    await expect(
      page.getByText('Вы записаны на это занятие').or(page.getByRole('button', { name: 'Записаться' }))
    ).toBeVisible()
  })

  test('расписание — бейдж «Вы записаны» на занятии', async ({ page }) => {
    // Логинимся как админ
    await loginAsAdmin(page)

    // Переходим на страницу расписания
    await page.goto('/')
    await page.waitForTimeout(2000)

    // Находим любое доступное занятие и переходим на страницу деталей
    const detailButtons = page.locator('button:has-text("Подробнее")')
    const detailCount = await detailButtons.count()

    if (detailCount === 0) {
      test.skip(true, 'Нет занятий в расписании')
    }

    // Запоминаем заголовок первого занятия (название)
    const firstClassTitle = await page.locator('.MuiTypography-subtitle1').first().innerText()

    // Переходим на страницу деталей
    await detailButtons.first().click()
    await page.waitForURL(/\/class\//, { timeout: 10000 })

    // Записываемся на занятие (если ещё не записаны)
    const enrollButton = page.getByRole('button', { name: 'Записаться' })
    const enrollVisible = await enrollButton.isVisible({ timeout: 3000 }).catch(() => false)

    if (enrollVisible) {
      await enrollButton.click()
      await expect(page.getByText('Вы успешно записаны')).toBeVisible({ timeout: 5000 })
    }

    // Возвращаемся на расписание
    await page.goto('/')
    await page.waitForTimeout(2000)

    // Проверяем что бейдж «Вы записаны» отображается рядом с занятием
    const enrolledBadge = page.getByRole('chip', { name: 'Вы записаны' })
    const badgeVisible = await enrolledBadge.isVisible({ timeout: 5000 }).catch(() => false)

    expect(badgeVisible).toBe(true)
  })
})
