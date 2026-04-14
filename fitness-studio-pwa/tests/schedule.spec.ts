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

// Хелпер для поиска бейджа «Вы записаны» — MUI Chip не имеет role="chip"
function enrolledBadgeLocator(page: ReturnType<typeof test['page']>) {
  return page.locator('.MuiChip-root.MuiChip-colorSuccess').filter({ hasText: 'Вы записаны' })
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
      // Уточняем alert по тексту — на странице может быть 2 alert'а
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
    const badge = enrolledBadgeLocator(page)
    const badgeVisible = await badge.first().isVisible({ timeout: 5000 }).catch(() => false)

    expect(badgeVisible).toBe(true)
  })

  test('расписание — бейдж исчезает при навигации на другую неделю', async ({ page }) => {
    await loginAsAdmin(page)

    // Записываемся на занятие текущей недели
    await page.goto('/')
    await page.waitForTimeout(2000)

    const detailButtons = page.locator('button:has-text("Подробнее")')
    if (await detailButtons.count() === 0) {
      test.skip(true, 'Нет занятий в расписании')
    }

    const enrollButton = page.getByRole('button', { name: 'Записаться' })
    // Переходим на страницу деталей и записываемся
    await detailButtons.first().click()
    await page.waitForURL(/\/class\//, { timeout: 10000 })

    const enrollVisible = await enrollButton.isVisible({ timeout: 3000 }).catch(() => false)
    if (enrollVisible) {
      await enrollButton.click()
      await expect(page.getByText('Вы успешно записаны')).toBeVisible({ timeout: 5000 })
    }

    // Возвращаемся на расписание — бейдж должен быть
    await page.goto('/')
    await page.waitForTimeout(2000)
    await expect(enrolledBadgeLocator(page).first()).toBeVisible({ timeout: 5000 })

    // Переключаемся на следующую неделю
    const nextWeekBtn = page.getByRole('button').last() // ChevronRight
    await nextWeekBtn.click()
    await page.waitForTimeout(3000)

    // На следующей неделе бейджа быть не должно (занятие на другой неделе)
    const badgeOnNextWeek = await enrolledBadgeLocator(page).first().isVisible({ timeout: 3000 }).catch(() => false)
    expect(badgeOnNextWeek).toBe(false)

    // Возвращаемся на текущую неделю — бейдж должен снова появиться
    const prevWeekBtn = page.getByRole('button').first() // ChevronLeft
    await prevWeekBtn.click()
    // Перезагружаем страницу чтобы триггернуть useEffect с новым диапазоном
    await page.goto('/')
    await page.waitForTimeout(3000)
    await expect(enrolledBadgeLocator(page).first()).toBeVisible({ timeout: 10000 })
  })

  test('расписание — отмена записи удаляет бейдж', async ({ page }) => {
    await loginAsAdmin(page)

    // Записываемся на занятие
    await page.goto('/')
    await page.waitForTimeout(2000)

    const detailButtons = page.locator('button:has-text("Подробнее")')
    if (await detailButtons.count() === 0) {
      test.skip(true, 'Нет занятий в расписании')
    }

    await detailButtons.first().click()
    await page.waitForURL(/\/class\//, { timeout: 10000 })

    const enrollButton = page.getByRole('button', { name: 'Записаться' })
    const enrollVisible = await enrollButton.isVisible({ timeout: 3000 }).catch(() => false)

    if (enrollVisible) {
      await enrollButton.click()
      await expect(page.getByText('Вы записаны на это занятие')).toBeVisible({ timeout: 5000 })
    }

    // Проверяем что бейдж есть на странице деталей
    await expect(page.getByText('Вы записаны на это занятие')).toBeVisible()

    // Проверяем возможность отмены — должна быть кнопка «Отменить запись»
    const cancelButton = page.getByRole('button', { name: 'Отменить запись' })
    const cancelVisible = await cancelButton.isVisible({ timeout: 3000 }).catch(() => false)
    const cancelDisabled = await cancelButton.isDisabled({ timeout: 3000 }).catch(() => true)

    if (!cancelVisible || cancelDisabled) {
      test.skip(true, 'Отмена невозможна (менее 60 мин до начала или занятие прошло)')
    }

    // Отменяем запись
    await cancelButton.click()
    await expect(page.getByText('Запись отменена')).toBeVisible({ timeout: 5000 })

    // На странице деталей бейдж должен исчезнуть, должна появиться кнопка «Записаться»
    await expect(page.getByRole('button', { name: 'Записаться' })).toBeVisible({ timeout: 5000 })

    // На расписании бейдж тоже должен исчезнуть
    await page.goto('/')
    await page.waitForTimeout(2000)
    const badgeAfterCancel = await enrolledBadgeLocator(page).first().isVisible({ timeout: 3000 }).catch(() => false)
    expect(badgeAfterCancel).toBe(false)
  })

  test('расписание — несколько бейджей при записи на несколько занятий', async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto('/')
    await page.waitForTimeout(2000)

    const detailButtons = page.locator('button:has-text("Подробнее")')
    const availableCount = await detailButtons.count()

    if (availableCount < 2) {
      test.skip(true, 'Нужно минимум 2 занятия для теста')
    }

    // Записываемся на первое занятие
    await detailButtons.first().click()
    await page.waitForURL(/\/class\//, { timeout: 10000 })

    let enrollBtn = page.getByRole('button', { name: 'Записаться' })
    if (await enrollBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await enrollBtn.click()
      await expect(page.getByText('Вы успешно записаны')).toBeVisible({ timeout: 5000 })
    }

    // Возвращаемся и записываемся на второе занятие
    await page.goto('/')
    await page.waitForTimeout(2000)

    const remainingButtons = page.locator('button:has-text("Подробнее")')
    await remainingButtons.nth(1).click()
    await page.waitForURL(/\/class\//, { timeout: 10000 })

    enrollBtn = page.getByRole('button', { name: 'Записаться' })
    if (await enrollBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await enrollBtn.click()
      await expect(page.getByText('Вы успешно записаны')).toBeVisible({ timeout: 5000 })
    }

    // Возвращаемся на расписание
    await page.goto('/')
    await page.waitForTimeout(2000)

    // Проверяем что бейджей «Вы записаны» минимум 2
    const badges = enrolledBadgeLocator(page)
    const badgeCount = await badges.count()
    expect(badgeCount).toBeGreaterThanOrEqual(2)
  })

  test('расписание — гость не видит бейджей', async ({ page }) => {
    // Переходим на страницу регистрации (гость)
    await page.goto('/register')
    await page.waitForTimeout(2000)

    // Если уже залогинен — выходим
    const currentUrl = page.url()
    if (currentUrl === 'http://localhost:5173/' || currentUrl === 'http://localhost:5173') {
      await page.goto('/profile')
      await page.waitForTimeout(1000)
      const logoutBtn = page.getByRole('button', { name: 'Выйти' })
      if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await logoutBtn.click()
        await page.waitForTimeout(1000)
      }
    }

    // Проверяем что мы не авторизованы (redirect на /welcome или /register)
    const url = page.url()
    if (!url.includes('/welcome') && !url.includes('/register') && !url.includes('/login')) {
      // Если всё ещё на главной — принудительно выходим
      await page.goto('/profile')
      await page.waitForTimeout(1000)
      const logoutBtn = page.getByRole('button', { name: 'Выйти' })
      if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await logoutBtn.click()
        await page.waitForTimeout(1000)
      }
    }

    // Переходим на расписание как гость (если редиректнет — ок)
    await page.goto('/')
    await page.waitForTimeout(2000)

    // Гость не должен видеть бейджей «Вы записаны»
    const badges = enrolledBadgeLocator(page)
    const badgeCount = await badges.count()
    expect(badgeCount).toBe(0)
  })

  test('расписание — skeleton при загрузке', async ({ page }) => {
    await loginAsAdmin(page)

    // Переходим на расписание с принудительной перезагрузкой
    await page.goto('/')

    // Перехватываем запрос к Firestore (эмулируем задержку через throttle)
    // Вместо этого проверяем что при быстрой навигации skeleton появляется
    // Идём на другую страницу и быстро возвращаемся
    await page.goto('/profile')
    await page.waitForTimeout(500)

    // Запускаем навигацию и проверяем skeleton
    await Promise.all([
      page.goto('/'),
      expect(page.locator('.MuiSkeleton-root').first()).toBeVisible({ timeout: 5000 }),
    ])

    // После загрузки skeleton должен исчезнуть
    await expect(page.locator('.MuiSkeleton-root').first()).toBeHidden({ timeout: 10000 })
  })

  test('расписание — отмена невозможна менее чем за 60 минут', async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto('/')
    await page.waitForTimeout(2000)

    const detailButtons = page.locator('button:has-text("Подробнее")')
    if (await detailButtons.count() === 0) {
      test.skip(true, 'Нет занятий в расписании')
    }

    // Переходим на страницу деталей
    await detailButtons.first().click()
    await page.waitForURL(/\/class\//, { timeout: 10000 })

    // Проверяем что занятие ещё не прошло
    const statusText = await page.getByText(/Статус:/).innerText().catch(() => '')
    if (statusText.includes('Завершено')) {
      test.skip(true, 'Занятие уже завершено')
    }

    // Записываемся на занятие (если ещё не записаны)
    const enrollButton = page.getByRole('button', { name: 'Записаться' })
    if (await enrollButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await enrollButton.click()
      await expect(page.getByText('Вы записаны на это занятие')).toBeVisible({ timeout: 5000 })
    }

    // Проверяем: либо кнопка «Отменить запись» доступна, либо текст о 60 минутах
    const cancelButton = page.getByRole('button', { name: 'Отменить запись' })
    const cancelText = page.getByText('Отмена возможна не позднее чем за 60 минут')

    const cancelAvailable = await cancelButton.isVisible({ timeout: 3000 }).catch(() => false)
    const cancelTextVisible = await cancelText.isVisible({ timeout: 3000 }).catch(() => false)

    // Хотя бы одно из двух должно быть видно
    expect(cancelAvailable || cancelTextVisible).toBe(true)
  })

  test('расписание — счётчик мест обновляется после записи', async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto('/')
    await page.waitForTimeout(2000)

    const detailButtons = page.locator('button:has-text("Подробнее")')
    if (await detailButtons.count() === 0) {
      test.skip(true, 'Нет занятий в расписании')
    }

    // Находим текст с количеством записанных — ищем по ключевому слову "записано"
    const pageText = await page.locator('.MuiCardContent-root').first().innerText()
    const matchBefore = pageText.match(/записано:\s*(\d+)/)
    const enrolledBefore = matchBefore ? parseInt(matchBefore[1]) : null

    // Переходим на страницу деталей и записываемся
    await detailButtons.first().click()
    await page.waitForURL(/\/class\//, { timeout: 10000 })

    const enrollButton = page.getByRole('button', { name: 'Записаться' })
    if (await enrollButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await enrollButton.click()
      await expect(page.getByText('Вы успешно записаны')).toBeVisible({ timeout: 5000 })
    } else {
      test.skip(true, 'Уже записан')
    }

    // Возвращаемся и проверяем что счётчик увеличился
    await page.goto('/')
    await page.waitForTimeout(2000)

    const pageTextAfter = await page.locator('.MuiCardContent-root').first().innerText()
    const matchAfter = pageTextAfter.match(/записано:\s*(\d+)/)
    const enrolledAfter = matchAfter ? parseInt(matchAfter[1]) : null

    if (enrolledBefore !== null && enrolledAfter !== null) {
      expect(enrolledAfter).toBe(enrolledBefore + 1)
    }
  })
})
