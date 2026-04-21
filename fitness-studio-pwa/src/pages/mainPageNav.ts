/** Чистая логика навигации MainPage — без React/JSX, легко тестируется */

export interface NavConfig {
  label: string
  path: string
}

export function buildNavConfig(isAdmin: boolean, isTrainer: boolean): NavConfig[] {
  const items: NavConfig[] = [
    { label: 'Расписание', path: '/' },
    { label: 'Мои записи', path: '/my-enrollments' },
  ]
  if (isTrainer) {
    items.push({ label: 'Мои занятия', path: '/trainer/my-classes' })
  }
  if (isAdmin) {
    items.push({ label: 'Админ', path: '/admin' })
  }
  items.push({ label: 'Профиль', path: '/profile' })
  return items
}

export function getActiveNavIndex(pathname: string, items: NavConfig[]): number {
  if (pathname === '/' || pathname.startsWith('/class/')) return 0
  const idx = items.findIndex((item) => item.path !== '/' && pathname.startsWith(item.path))
  return idx >= 0 ? idx : 0
}
