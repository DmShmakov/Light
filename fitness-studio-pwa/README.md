# Fitness Studio PWA

PWA-приложение для записи на занятия фитнес-студии.

## Технологии

- **React 18** + **TypeScript**
- **Vite** — сборка
- **Material UI** — UI компоненты
- **Firebase** — бэкенд (Auth, Firestore, Hosting)
- **Zustand** — state management
- **React Router** — навигация
- **React Hook Form** + **Zod** — формы и валидация
- **PWA** — установка на устройство, офлайн-режим

## Установка

```bash
# Клонирование репозитория
git clone <repository-url>
cd fitness-studio-pwa

# Установка зависимостей
npm install

# Копирование .env.example в .env и заполнение Firebase конфигурации
cp .env.example .env
```

## Firebase настройка

1. Создайте проект в [Firebase Console](https://console.firebase.google.com/)
2. Включите Authentication (Email + Google)
3. Создайте Firestore Database
4. Скопируйте конфигурацию из Firebase Console в `.env`

## Запуск

```bash
# Development
npm run dev

# Build
npm run build

# Preview production build
npm run preview
```

## Структура проекта

```
fitness-studio-pwa/
├── public/              # Статические файлы (manifest, иконки)
├── src/
│   ├── components/      # React компоненты
│   ├── pages/           # Страницы/экраны
│   │   └── admin/       # Админ-панель
│   ├── hooks/           # Кастомные хуки
│   ├── services/        # Firebase сервисы
│   ├── store/           # Zustand store
│   ├── types/           # TypeScript типы
│   ├── App.tsx          # Главный компонент
│   └── main.tsx         # Точка входа
├── .env.example         # Пример environment переменных
└── vite.config.ts       # Vite конфигурация
```

## Функционал (Фаза 1 - MVP)

- ✅ Авторизация (Email + Google)
- ✅ Просмотр расписания по неделям
- ✅ Запись на занятие
- ✅ Отмена записи
- ✅ Админ-панель (CRUD занятий, просмотр участников)
- ✅ PWA (установка на устройство, офлайн-режим)

## Roadmap

### Фаза 2
- [ ] Push-уведомления
- [ ] Фильтры и поиск по расписанию
- [ ] Экран "Мои записи" (улучшения)
- [ ] Профиль пользователя (улучшения)
- [ ] Офлайн-режим (улучшения)
- [ ] Deep Links
- [ ] Функция "Поделиться занятием"
- [ ] Авторизация через VK ID
- [ ] Авторизация через Яндекс ID

### Фаза 3
- [ ] Лист ожидания
- [ ] Повторяющиеся занятия
- [ ] Статистика и аналитика
- [ ] Рейтинги и отзывы
- [ ] Программа лояльности
- [ ] Онлайн-оплата

## License

MIT
