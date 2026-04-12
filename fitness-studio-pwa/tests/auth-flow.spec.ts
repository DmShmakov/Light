import { test, expect } from '@playwright/test'

test.describe('Форма создания/редактирования занятия', () => {
  
  // Тест 1: Welcome страница отображается
  test('welcome страница отображается для неавторизованного', async ({ page }) => {
    await page.goto('/welcome')
    
    await expect(page.getByRole('heading', { name: 'Фитнес Студия' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Зарегистрироваться' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Войти', exact: true })).toBeVisible()
  })

  // Тест 2: Редирект на welcome если не авторизован
  test('редирект на /welcome с /', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/.*\/welcome/)
  })

  // Тест 3: Страница логина отображается
  test('страница логина отображается', async ({ page }) => {
    await page.goto('/login')
    
    await expect(page.getByRole('heading', { name: 'Вход' })).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Пароль')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Войти', exact: true })).toBeVisible()
  })

  // Тест 4: Форма регистрации отображается
  test('форма регистрации отображается', async ({ page }) => {
    await page.goto('/register')
    
    await expect(page.getByRole('heading', { name: 'Регистрация' })).toBeVisible()
    await expect(page.getByLabel('Имя')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Телефон')).toBeVisible()
    await expect(page.getByLabel('Пароль')).toBeVisible()
    await expect(page.getByLabel('Подтверждение пароля')).toBeVisible()
  })

  // Тест 5: Расписание (требует авторизации — редирект на welcome)
  test('расписание требует авторизации', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/.*\/welcome/)
  })

  // Тест 6: Админ-панель требует авторизации
  test('админ-панель требует авторизации', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/.*\/login/)
  })
})
