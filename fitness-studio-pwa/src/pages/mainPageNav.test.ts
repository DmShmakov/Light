import { describe, it, expect } from 'vitest'
import { buildNavConfig, getActiveNavIndex } from './mainPageNav'

// ── buildNavConfig ────────────────────────────────────────────────────────────

describe('buildNavConfig — состав вкладок', () => {
  it('клиент (не тренер, не админ): Расписание, Мои записи, Профиль', () => {
    const items = buildNavConfig(false, false)
    expect(items.map((i) => i.label)).toEqual(['Расписание', 'Мои записи', 'Профиль'])
  })

  it('тренер: добавляет «Мои занятия» между «Мои записи» и «Профиль»', () => {
    const items = buildNavConfig(false, true)
    expect(items.map((i) => i.label)).toEqual([
      'Расписание',
      'Мои записи',
      'Мои занятия',
      'Профиль',
    ])
  })

  it('админ: добавляет «Админ» перед «Профиль»', () => {
    const items = buildNavConfig(true, false)
    expect(items.map((i) => i.label)).toEqual([
      'Расписание',
      'Мои записи',
      'Админ',
      'Профиль',
    ])
  })

  it('тренер-админ: «Мои занятия» перед «Админ», оба присутствуют', () => {
    const items = buildNavConfig(true, true)
    expect(items.map((i) => i.label)).toEqual([
      'Расписание',
      'Мои записи',
      'Мои занятия',
      'Админ',
      'Профиль',
    ])
  })

  it('«Расписание» всегда первый', () => {
    for (const [isAdmin, isTrainer] of [[false, false], [true, false], [false, true], [true, true]]) {
      expect(buildNavConfig(isAdmin as boolean, isTrainer as boolean)[0].label).toBe('Расписание')
    }
  })

  it('«Профиль» всегда последний', () => {
    for (const [isAdmin, isTrainer] of [[false, false], [true, false], [false, true], [true, true]]) {
      const items = buildNavConfig(isAdmin as boolean, isTrainer as boolean)
      expect(items[items.length - 1].label).toBe('Профиль')
    }
  })

  it('пути соответствуют маршрутам', () => {
    const trainerAdminItems = buildNavConfig(true, true)
    const byLabel = Object.fromEntries(trainerAdminItems.map((i) => [i.label, i.path]))

    expect(byLabel['Расписание']).toBe('/')
    expect(byLabel['Мои записи']).toBe('/my-enrollments')
    expect(byLabel['Мои занятия']).toBe('/trainer/my-classes')
    expect(byLabel['Админ']).toBe('/admin')
    expect(byLabel['Профиль']).toBe('/profile')
  })
})

// ── getActiveNavIndex ─────────────────────────────────────────────────────────

describe('getActiveNavIndex — активная вкладка', () => {
  const clientItems = buildNavConfig(false, false)   // [/, /my-enrollments, /profile]
  const trainerItems = buildNavConfig(false, true)   // [/, /my-enrollments, /trainer/my-classes, /profile]
  const adminItems = buildNavConfig(true, false)     // [/, /my-enrollments, /admin, /profile]

  it('/ → индекс 0 (Расписание)', () => {
    expect(getActiveNavIndex('/', clientItems)).toBe(0)
  })

  it('/class/:id → индекс 0 (Расписание)', () => {
    expect(getActiveNavIndex('/class/abc123', clientItems)).toBe(0)
  })

  it('/my-enrollments → индекс 1', () => {
    expect(getActiveNavIndex('/my-enrollments', clientItems)).toBe(1)
  })

  it('/profile → последний индекс у клиента', () => {
    expect(getActiveNavIndex('/profile', clientItems)).toBe(clientItems.length - 1)
  })

  it('/trainer/my-classes → индекс 2 у тренера', () => {
    expect(getActiveNavIndex('/trainer/my-classes', trainerItems)).toBe(2)
  })

  it('/admin → индекс 2 у чистого админа', () => {
    expect(getActiveNavIndex('/admin', adminItems)).toBe(2)
  })

  it('/admin/users → индекс вкладки «Админ» (startsWith)', () => {
    expect(getActiveNavIndex('/admin/users', adminItems)).toBe(2)
  })

  it('/admin/schedule/create → вкладка «Админ»', () => {
    expect(getActiveNavIndex('/admin/schedule/create', adminItems)).toBe(2)
  })

  it('неизвестный путь → 0', () => {
    expect(getActiveNavIndex('/unknown-route', clientItems)).toBe(0)
  })

  it('/profile у тренера-админа — последний индекс', () => {
    const ta = buildNavConfig(true, true)
    expect(getActiveNavIndex('/profile', ta)).toBe(ta.length - 1)
  })
})
